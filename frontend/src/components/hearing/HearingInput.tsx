/**
 * HearingInput Component
 * Provides a text area interface for inputting hearing content with manual save functionality
 * Supports both creating new logs and editing existing ones
 * Includes voice input functionality using OpenAI Whisper API and real-time Web Speech API
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { hearingApi } from '@/lib/api';
import { HearingLogResponse } from '@/types/api';

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

interface HearingInputProps {
  projectId: number;
  onHearingLogAdded?: (hearingLog: HearingLogResponse) => void;
  onHearingLogUpdated?: (hearingLog: HearingLogResponse) => void;
  editingLog?: HearingLogResponse | null;
  onCancelEdit?: () => void;
}

export function HearingInput({ 
  projectId, 
  onHearingLogAdded, 
  onHearingLogUpdated,
  editingLog,
  onCancelEdit
}: HearingInputProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Voice input states (only real-time recognition)
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Real-time speech recognition states
  const [isRealtimeListening, setIsRealtimeListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseContentRef = useRef<string>(''); // Content before starting real-time recognition

  
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
      console.log('=== Component cleanup triggered ===');
      // Stop real-time recognition
      if (recognitionRef.current) {
        console.log('Stopping real-time recognition');
        recognitionRef.current.stop();
      }
      console.log('=== Component cleanup completed ===');
    };
  }, []); // Empty dependency array - cleanup only on unmount

  const isEditing = !!editingLog;

  const startRealtimeListening = async () => {
    try {
      setError(null);
      console.log('=== 音声入力開始 ===');
      
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
      
      // Store the current content as base content
      baseContentRef.current = content;
      
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        console.log('Speech recognition result received');
        
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
        if (finalTranscript) {
          baseContentRef.current = baseContentRef.current + finalTranscript;
          console.log('Added final transcript to base:', finalTranscript);
        }
        
        console.log('Content updated:', newContent.length, 'characters');
        console.log('Final transcript:', finalTranscript);
        console.log('Interim transcript:', interimTranscript);
      };
      
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('マイクへのアクセスが拒否されました。ブラウザの設定でマイクの使用を許可してください。');
          setIsRealtimeListening(false);
        } else if (event.error === 'no-speech') {
          console.log('No speech detected, continuing...');
        } else if (event.error === 'network') {
          console.log('Network error, continuing...');
        } else {
          console.log(`Non-critical error: ${event.error}, continuing...`);
        }
      };
      
      recognitionInstance.onstart = () => {
        console.log('Real-time speech recognition started');
        setIsRealtimeListening(true);
      };
      
      recognitionInstance.onend = () => {
        console.log('Speech recognition ended');
        // Only restart if we're still supposed to be listening and recognition was not manually stopped
        if (isRealtimeListening && recognitionRef.current) {
          console.log('Restarting speech recognition...');
          setTimeout(() => {
            if (isRealtimeListening && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                console.log('Recognition restarted successfully');
              } catch (error) {
                console.error('Failed to restart recognition:', error);
                // If restart fails, stop the real-time listening
                setIsRealtimeListening(false);
              }
            }
          }, 100);
        }
      };
      
      console.log('Starting real-time speech recognition...');
      recognitionInstance.start();
      setRecognition(recognitionInstance);
      recognitionRef.current = recognitionInstance;
      
      console.log('音声入力開始完了');
      
    } catch (err) {
      console.error('Failed to start real-time listening:', err);
      setError('音声入力の開始に失敗しました。');
    }
  };

  const stopRealtimeListening = () => {
    console.log('=== 音声入力停止 ===');
    
    // First set the flag to false to prevent restart
    setIsRealtimeListening(false);
    
    // Stop the recognition instance
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      setRecognition(null);
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition ref:', error);
      }
      recognitionRef.current = null;
    }
    
    // Keep the final content as is - baseContentRef.current already contains the final content
    console.log('音声入力停止完了');
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
        const created = await hearingApi.addHearingLog(projectId, { content: content.trim() });
        onHearingLogAdded?.(created);
        setContent('');
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
      <div>
        <label htmlFor="hearing-input" className="block text-sm font-medium text-gray-700 mb-2">
          {isEditing ? 'ヒアリング内容を編集' : '新しいヒアリング内容'}
        </label>
        
        {/* Voice Input Controls */}
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">音声入力</h3>
          </div>
          
          <div className="flex items-center space-x-3">
            {!isRealtimeListening ? (
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
            
            {isRealtimeListening && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="ml-2 text-sm text-blue-600">音声認識中...</span>
                </div>
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