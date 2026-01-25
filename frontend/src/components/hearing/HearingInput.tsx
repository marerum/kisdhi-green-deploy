/**
 * HearingInput Component
 * Provides a text area interface for inputting hearing content with manual save functionality
 * Supports both creating new logs and editing existing ones
 * Includes voice input functionality using Azure Speech Service (primary) and Web Speech API (fallback)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { hearingApi } from '@/lib/api';
import { HearingLogResponse } from '@/types/api';
import { useAzureSpeech } from '@/hooks/useAzureSpeech';

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

// ============================================
// リアルタイム生成用: 型定義
// ============================================
type TriggerMode = 'auto' | 'manual';
type AutoTriggerTimeout = 2000 | 3000 | 4000 | 5000 | 6000 | 7000 | 8000 | 9000 | 10000;
type AutoStopTimeout = null | 60000; // null = 停止無し, 60000 = 1分で停止

interface TriggerSettings {
  mode: TriggerMode;
  timeout: AutoTriggerTimeout | null;
}

const DEFAULT_TRIGGER_SETTINGS: TriggerSettings = {
  mode: 'auto',
  timeout: 3000
};

const MIN_TEXT_LENGTH = 20;
// ============================================
  
interface HearingInputProps {
  projectId: number;
  onHearingLogAdded?: (hearingLog: HearingLogResponse) => void;
  onHearingLogUpdated?: (hearingLog: HearingLogResponse) => void;
  // リアルタイムフロー生成: 親コンポーネントにフロー更新を通知するためのコールバック
  onFlowUpdated?: (flow: any) => void;
  editingLog?: HearingLogResponse | null;
  onCancelEdit?: () => void;
}

export function HearingInput({ 
  projectId, 
  onHearingLogAdded, 
  onHearingLogUpdated,
  onFlowUpdated,  // リアルタイムフロー生成: フロー更新用コールバック
  editingLog,
  onCancelEdit
}: HearingInputProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Voice input states (only real-time recognition)
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Speech recognition provider state ('azure' or 'web')
  const [speechProvider, setSpeechProvider] = useState<'azure' | 'web'>('azure');

  // Azure Speech Service integration
  const azureSpeech = useAzureSpeech({
    language: 'ja-JP',
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        // 確定結果: baseContentに追加
        baseContentRef.current = baseContentRef.current + text;
        setContent(baseContentRef.current);
        lastSpeechTimeRef.current = Date.now();
      } else {
        // 中間結果: baseContent + 中間結果を表示
        setContent(baseContentRef.current + text);
      }
    },
    onError: (error) => {
      console.error('Azure Speech error:', error);
      setError(`音声認識エラー: ${error}`);
    },
  });

  // Real-time speech recognition states (Web Speech API fallback)
  const [isRealtimeListening, setIsRealtimeListening] = useState(false);
  const isRealtimeListeningRef = useRef<boolean>(false); // refでも管理（クロージャ問題対策）
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseContentRef = useRef<string>(''); // Content before starting real-time recognition

  // ============================================
  // リアルタイム生成用: 状態管理
  // ============================================
  const [triggerSettings, setTriggerSettings] = useState<TriggerSettings>(DEFAULT_TRIGGER_SETTINGS);
  const [pendingText, setPendingText] = useState('');
  const [currentFlow, setCurrentFlow] = useState<any>(null);
  const [isGeneratingFlow, setIsGeneratingFlow] = useState(false);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const triggerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 最後にフロー生成した時点のcontentの長さ（これ以降がpendingText）
  const lastFlowGenerationPositionRef = useRef<number>(0);
  // 音声入力自動停止設定
  const [autoStopTimeout, setAutoStopTimeout] = useState<AutoStopTimeout>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  // 音声入力中のヒアリングログ自動保存用
  const currentHearingLogIdRef = useRef<number | null>(null);
  // ============================================
  
  useEffect(() => {
    if (editingLog) setContent(editingLog.content);
    else setContent('');
  }, [editingLog]);

  // Update contentRef when content changes
  useEffect(() => {
    // No longer needed since we removed realtime functionality
  }, [content]);

    // Cleanup on unmount only (no dependencies to prevent premature cleanup)
  useEffect(() => {
    return () => {
      // Stop real-time recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // リアルタイム生成用: タイマーのクリーンアップ
      if (triggerTimeoutRef.current) {
        clearTimeout(triggerTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - cleanup only on unmount

  // ============================================
  // リアルタイム生成用: 音声認識結果の監視
  // ============================================
  useEffect(() => {
    if (!isRealtimeListening) return;

    // 最後のフロー生成位置以降がpendingText
    const newContent = content.substring(lastFlowGenerationPositionRef.current);
    if (newContent) {
      setPendingText(newContent);
      lastUpdateTimeRef.current = Date.now();

      console.log('=== Flow Generation Trigger Check ===');
      console.log('Trigger mode:', triggerSettings.mode);
      console.log('Trigger timeout:', triggerSettings.timeout);
      console.log('New content:', newContent);
      console.log('Pending text length:', newContent.length);
      console.log('Min required length:', MIN_TEXT_LENGTH);

      // タイマーをクリア
      if (triggerTimeoutRef.current) {
        clearTimeout(triggerTimeoutRef.current);
      }

      // 自動モードの場合、タイムアウト後にフロー生成
      if (triggerSettings.mode === 'auto' && triggerSettings.timeout) {
        const timeoutMs = triggerSettings.timeout;
        
        console.log(`Setting flow generation timer for ${timeoutMs}ms`);
        
        triggerTimeoutRef.current = setTimeout(() => {
          const timeSinceUpdate = Date.now() - lastUpdateTimeRef.current;
          const currentPendingText = content.substring(lastFlowGenerationPositionRef.current);
          
          console.log('=== Flow Generation Timer Fired ===');
          console.log('Time since update:', timeSinceUpdate);
          console.log('Current pending text:', currentPendingText);
          console.log('Current pending text length:', currentPendingText.length);
          console.log('Condition met:', timeSinceUpdate >= timeoutMs && currentPendingText.length >= MIN_TEXT_LENGTH);
          
          if (timeSinceUpdate >= timeoutMs && currentPendingText.length >= MIN_TEXT_LENGTH) {
            console.log('Calling handleIncrementalFlowGeneration');
            handleIncrementalFlowGeneration();
          } else {
            console.log('Flow generation conditions not met');
          }
        }, timeoutMs);
      }
    }
  }, [content, isRealtimeListening, triggerSettings.mode, triggerSettings.timeout]); // pendingTextを削除
  // ============================================

  const isEditing = !!editingLog;

  // ============================================
  // ヒアリングログ自動保存処理
  // ============================================
  const autoSaveHearingLog = async (textToSave: string, finalize: boolean = false) => {
    const contentToSave = textToSave.trim();
    
    if (!contentToSave) return;
    
    try {
      const logId = currentHearingLogIdRef.current;
      if (logId) {
        // 既存のログを更新
        const updated = await hearingApi.updateHearingLog(logId, { content: contentToSave });
        
        if (finalize) {
          // フロー生成後の確定保存の場合、親コンポーネントに通知
          onHearingLogUpdated?.(updated);
          // 次の発言用にリセット
          currentHearingLogIdRef.current = null;
        }
      } else {
        // 新規作成（初めての音声認識またはフロー生成後の次の発言時）
        const created = await hearingApi.addHearingLog(projectId, { content: contentToSave });
        currentHearingLogIdRef.current = created.id;
        
        if (finalize) {
          // 確定保存の場合のみ親コンポーネントに通知
          onHearingLogAdded?.(created);
          // 次の発言用にリセット
          currentHearingLogIdRef.current = null;
        }
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      // エラーは控えめに（ユーザーには見せない）
    }
  };
  // ============================================

    // ============================================
  // リアルタイム生成用: 増分フロー生成処理
  // ============================================
  const handleIncrementalFlowGeneration = async () => {
    if (!pendingText.trim() || isGeneratingFlow) return;

    setIsGeneratingFlow(true);
    try {
      // リアルタイム生成用: API呼び出しを実装
      const response = await hearingApi.generateIncrementalFlow(
        projectId,
        currentFlow,
        pendingText,
        content
      );
      
      // フローを更新
      setCurrentFlow(response.flow);
      // リアルタイムフロー生成: 親コンポーネント（page.tsx）にフロー更新を通知
      // これによりFlowPreviewコンポーネントがリアルタイムで更新される
      onFlowUpdated?.(response.flow);
      
      // フロー生成成功後、現在のpendingTextをヒアリングログとして確定保存
      // finalize=trueで呼び出し、pendingTextのみを保存してログを確定
      await autoSaveHearingLog(pendingText, true);
      
      // 成功したら pendingText をクリアし、次の発言を新規ログとして記録するための準備
      setPendingText('');
      setContent('');
      baseContentRef.current = '';
      lastFlowGenerationPositionRef.current = 0;
      
      // 音声認識が停止している場合は再起動
      if (isRealtimeListeningRef.current && !recognitionRef.current) {
        // 少し待ってから再起動
        setTimeout(() => {
          if (isRealtimeListeningRef.current) {
            startRealtimeListening();
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('Flow generation failed:', error);
      setError('フロー生成に失敗しました');
    } finally {
      setIsGeneratingFlow(false);
    }
  };

  // リアルタイム生成用: 手動フロー生成ボタンのハンドラ
  const handleManualFlowGeneration = () => {
    if (triggerSettings.mode === 'manual' && pendingText.trim()) {
      handleIncrementalFlowGeneration();
    }
  };
  // ============================================

  const startRealtimeListening = async () => {
    try {
      setError(null);
      
      // 既に音声認識が実行中の場合は何もしない
      if ((speechProvider === 'azure' && azureSpeech.isListening) || 
          (speechProvider === 'web' && (recognitionRef.current || isRealtimeListeningRef.current))) {
        console.log('Speech recognition already running, skipping start');
        return;
      }
      
      // 編集モードの場合は既存のIDを使用
      if (editingLog) {
        currentHearingLogIdRef.current = editingLog.id;
      }
      
      // Store the current content as base content
      baseContentRef.current = content;
      // リアルタイムフロー生成: 開始時のフロー生成位置を設定
      lastFlowGenerationPositionRef.current = content.length;
      // 音声入力自動停止: 最後の音声時間を初期化
      lastSpeechTimeRef.current = Date.now();
      
      // Azure Speech Service が利用可能な場合はそちらを優先
      if (azureSpeech.isAvailable && speechProvider === 'azure') {
        console.log('Starting Azure Speech Service recognition...');
        azureSpeech.startListening();
        setIsRealtimeListening(true);
        isRealtimeListeningRef.current = true;
        return;
      }
      
      // Fallback to Web Speech API
      console.log('Falling back to Web Speech API...');
      setSpeechProvider('web');
      
      // Check if Web Speech API is supported
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('このブラウザは音声入力をサポートしていません。Chrome、Edge、Safari等の最新ブラウザをご利用ください。');
        return;
      }
      
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'ja-JP';
      
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Process only new results starting from resultIndex
        // This prevents processing the same results multiple times
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Combine base content with recognition results
        const newContent = baseContentRef.current + finalTranscript + interimTranscript;
        setContent(newContent);
        
        // Update base content when we get final results
        // This ensures the next finalTranscript will be appended, not overwrite
        if (finalTranscript) {
          baseContentRef.current = baseContentRef.current + finalTranscript;
          // 音声入力自動停止: 音声を検出したので時間を更新
          lastSpeechTimeRef.current = Date.now();
        }
      };
      
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('マイクへのアクセスが拒否されました。ブラウザの設定でマイクの使用を許可してください。');
          stopRealtimeListening();
        } else if (event.error === 'no-speech') {
          // 自動停止設定をチェック
          if (autoStopTimeout !== null) {
            const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
            if (timeSinceLastSpeech >= autoStopTimeout) {
              console.log(`No speech for ${autoStopTimeout / 1000} seconds, stopping automatically...`);
              stopRealtimeListening();
              return;
            }
          }
          console.log('No speech detected, continuing...');
        } else if (event.error === 'network') {
          console.log('Network error, continuing...');
        } else if (event.error === 'aborted') {
          // abortedは通常HMRや一時的な中断で発生するので、継続を試みる
          console.log('Speech recognition aborted (possibly due to hot reload), will retry...');
        } else {
          console.log(`Non-critical error: ${event.error}, continuing...`);
        }
      };
      
      recognitionInstance.onstart = () => {
        setIsRealtimeListening(true);
        isRealtimeListeningRef.current = true;
      };
      
      recognitionInstance.onend = () => {
        console.log('Speech recognition ended, isRealtimeListeningRef:', isRealtimeListeningRef.current);
        // Only restart if we're still supposed to be listening
        if (isRealtimeListeningRef.current) {
          setTimeout(() => {
            if (isRealtimeListeningRef.current && recognitionRef.current) {
              try {
                console.log('Attempting to restart speech recognition...');
                recognitionRef.current.start();
              } catch (error) {
                console.error('Failed to restart recognition:', error);
                // If restart fails, stop the real-time listening
                setIsRealtimeListening(false);
                isRealtimeListeningRef.current = false;
                recognitionRef.current = null;
              }
            }
          }, 100);
        } else {
          console.log('Not restarting speech recognition (flag is false)');
        }
      };
      
      // 参照を先に設定してから start を呼ぶ
      setRecognition(recognitionInstance);
      recognitionRef.current = recognitionInstance;
      
      // フラグを先に設定（start()が呼ばれる前に）
      isRealtimeListeningRef.current = true;
      
      // start() を呼ぶ
      try {
        recognitionInstance.start();
        console.log('Speech recognition started successfully');
      } catch (startError) {
        console.error('Failed to start recognition:', startError);
        // 失敗した場合は参照とフラグをクリア
        setRecognition(null);
        recognitionRef.current = null;
        isRealtimeListeningRef.current = false;
        throw startError;
      }
      
    } catch (err) {
      console.error('Failed to start real-time listening:', err);
      setError('音声入力の開始に失敗しました。');
      setIsRealtimeListening(false);
      isRealtimeListeningRef.current = false;
    }
  };

  const stopRealtimeListening = async () => {
    console.log('Stopping real-time listening...');
    
    // First set the flag to false to prevent restart
    isRealtimeListeningRef.current = false;
    setIsRealtimeListening(false);
    
    // 音声入力停止時に最終保存（pendingテキストがあれば）
    if (content.trim() && currentHearingLogIdRef.current) {
      await autoSaveHearingLog(content, false);
    }
    
    // Stop Azure Speech Service if active
    if (speechProvider === 'azure' && azureSpeech.isListening) {
      azureSpeech.stopListening();
      console.log('Azure Speech Service stopped');
      return;
    }
    
    // Stop Web Speech API if active
    const currentRecognition = recognitionRef.current || recognition;
    if (currentRecognition) {
      try {
        currentRecognition.stop();
        console.log('Web Speech API stopped');
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    
    // Clear all references
    setRecognition(null);
    recognitionRef.current = null;
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setError('ヒアリング内容を入力してください');
      return;
    }
    setIsSaving(true);
    try {
      if (editingLog) {
        const updated = await hearingApi.updateHearingLog(editingLog.id, { content: content.trim() });
        onHearingLogUpdated?.(updated);
        onCancelEdit?.();
      } else {
        // 新規作成の場合
        if (currentHearingLogIdRef.current) {
          // 既に自動保存で作成済みの場合は更新
          const updated = await hearingApi.updateHearingLog(currentHearingLogIdRef.current, { content: content.trim() });
          onHearingLogAdded?.(updated);
        } else {
          // 自動保存なしで手動保存の場合は新規作成
          const created = await hearingApi.addHearingLog(projectId, { content: content.trim() });
          onHearingLogAdded?.(created);
        }
        setContent('');
        currentHearingLogIdRef.current = null; // リセット
      }
    } catch (e) {
      console.error(e);
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (editingLog) onCancelEdit?.();
    else setContent('');
  };

  return (
    <div className="space-y-4">
      {/* ============================================ */}
      {/* リアルタイム生成用: トリガー設定UI */}
      {/* ============================================ */}
      <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <span className="mr-2">⚡</span>
          リアルタイムフロー生成設定
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-600 font-medium">生成タイミング:</label>
            <select 
              value={triggerSettings.mode}
              onChange={(e) => setTriggerSettings({
                ...triggerSettings,
                mode: e.target.value as TriggerMode
              })}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
            >
              <option value="auto">自動生成</option>
              <option value="manual">手動生成（ボタン押下）</option>
            </select>
          </div>

          {triggerSettings.mode === 'auto' && (
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-600 font-medium">タイムアウト:</label>
              <select
                value={triggerSettings.timeout || ''}
                onChange={(e) => setTriggerSettings({
                  ...triggerSettings,
                  timeout: parseInt(e.target.value) as AutoTriggerTimeout
                })}
                className="px-3 py-1.5 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
              >
                <option value="2000">2秒</option>
                <option value="3000">3秒（推奨）</option>
                <option value="4000">4秒</option>
                <option value="5000">5秒</option>
                <option value="6000">6秒</option>
                <option value="7000">7秒</option>
                <option value="8000">8秒</option>
                <option value="9000">9秒</option>
                <option value="10000">10秒</option>
              </select>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-600 font-medium">音声入力自動停止:</label>
            <select
              value={autoStopTimeout === null ? 'none' : String(autoStopTimeout)}
              onChange={(e) => setAutoStopTimeout(
                e.target.value === 'none' ? null : parseInt(e.target.value) as AutoStopTimeout
              )}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 text-sm"
            >
              <option value="none">停止無し</option>
              <option value="60000">1分で停止</option>
            </select>
          </div>

          {/* リアルタイム生成用: 手動モード時のボタン */}
          {triggerSettings.mode === 'manual' && (
            <button
              onClick={handleManualFlowGeneration}
              disabled={!pendingText.trim() || isGeneratingFlow}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingFlow ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  フロー生成中...
                </>
              ) : (
                <>
                  <span className="mr-2">📊</span>
                  フローを生成
                </>
              )}
            </button>
          )}

          {/* リアルタイム生成用: 生成中インジケーター */}
          {isGeneratingFlow && (
            <div className="flex items-center space-x-2 text-green-700 bg-green-100 px-3 py-2 rounded-md">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">フローを生成中...</span>
            </div>
          )}
        </div>
      </div>
      {/* ============================================ */}

      <div>
        <label htmlFor="hearing-input" className="block text-sm font-medium text-gray-700 mb-2">
          {isEditing ? 'ヒアリング内容を編集' : '新しいヒアリング内容'}
        </label>
        
        {/* Voice Input Controls */}
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">音声入力</h3>
            <div className="flex items-center space-x-2">
              {/* Speech Provider Display */}
              <span className="text-xs text-gray-500">
                {speechProvider === 'azure' ? (
                  azureSpeech.isAvailable ? (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Azure Speech
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Azure 未設定
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    Web Speech API
                  </span>
                )}
              </span>
              {/* Provider Switch Button */}
              {!isRealtimeListening && (
                <button
                  onClick={() => setSpeechProvider(speechProvider === 'azure' ? 'web' : 'azure')}
                  className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                  title={`${speechProvider === 'azure' ? 'Web Speech API' : 'Azure Speech'}に切り替え`}
                >
                  切替
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {!(isRealtimeListening || azureSpeech.isListening) ? (
                <button
                  onClick={startRealtimeListening}
                  disabled={isSaving || isTranscribing}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="音声入力を開始"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  音声入力
                </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={stopRealtimeListening}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  音声入力停止
                </button>
              </div>
            )}
            
            {(isRealtimeListening || azureSpeech.isListening) && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="ml-2 text-sm text-blue-600">
                    {speechProvider === 'azure' ? 'Azure Speech 認識中...' : 'Web Speech 認識中...'}
                  </span>
                </div>
              </div>
            )}
            
            {azureSpeech.error && (
              <div className="text-sm text-red-600">
                {azureSpeech.error}
              </div>
            )}
            
            {isTranscribing && (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin w-4 h-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-blue-600">文字起こし中...</span>
              </div>
            )}
          </div>
          
          {/* Instructions */}
          {!isTranscribing && !isRealtimeListening && (
            <div className="mt-2 text-xs text-gray-500">
              💡 ヒント: 音声入力で話した内容が即座にテキストに反映されます。静かな環境で行うと精度が向上します。
            </div>
          )}
          
          {isRealtimeListening && (
            <div className="mt-2 text-xs text-blue-600">
              🎤 音声入力中: 話した内容がリアルタイムでテキストに反映されます。
            </div>
          )}
        </div>
        
        <textarea
          id="hearing-input"
          rows={10}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="ヒアリング内容を入力してください（音声入力ボタンで音声からの文字起こしも可能です）"
          disabled={isTranscribing || isRealtimeListening}
        />
        
        {/* ============================================ */}
        {/* リアルタイム生成用: 未処理テキストの表示 */}
        {/* ============================================ */}
        {pendingText && (
          <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
            <div className="flex items-start">
              <span className="text-yellow-600 mr-2">📝</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-yellow-800 mb-1">
                  フロー生成待ちのテキスト:
                </p>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">
                  {pendingText}
                </p>
              </div>
            </div>
          </div>
        )}
        {/* ============================================ */}

      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        {isEditing && (
          <button 
            onClick={handleCancel} 
            disabled={isSaving || isTranscribing || isRealtimeListening} 
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            キャンセル
          </button>
        )}
        <button 
          onClick={handleSave} 
          disabled={isSaving || !content.trim() || isTranscribing || isRealtimeListening} 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? '保存中...' : isEditing ? '更新' : '保存'}
        </button>
      </div>
    </div>
  );
}

export default HearingInput;