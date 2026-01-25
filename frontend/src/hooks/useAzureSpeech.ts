/**
 * Azure Speech Service カスタムフック
 * リアルタイム音声認識機能を提供
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

interface UseAzureSpeechOptions {
  language?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface UseAzureSpeechReturn {
  transcript: string;
  isListening: boolean;
  isAvailable: boolean;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

/**
 * Azure Speech Service を使った音声認識フック
 * 環境変数からキーとリージョンを取得して動作
 */
export function useAzureSpeech({
  language = 'ja-JP',
  onTranscript,
  onError,
}: UseAzureSpeechOptions = {}): UseAzureSpeechReturn {
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const recognizerRef = useRef<speechsdk.SpeechRecognizer | null>(null);

  // Azure Speech Service の利用可能性をチェック
  useEffect(() => {
    const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
    const serviceRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

    if (subscriptionKey && serviceRegion) {
      setIsAvailable(true);
    } else {
      setIsAvailable(false);
      console.warn('Azure Speech Service: 環境変数が設定されていません');
    }
  }, []);

  /**
   * 音声認識を開始
   */
  const startListening = useCallback(() => {
    if (!isAvailable) {
      const errorMsg = 'Azure Speech Service が利用できません';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (isListening) {
      console.warn('既に音声認識が開始されています');
      return;
    }

    try {
      const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY!;
      const serviceRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION!;

      // Speech Config の作成
      const speechConfig = speechsdk.SpeechConfig.fromSubscription(
        subscriptionKey,
        serviceRegion
      );
      speechConfig.speechRecognitionLanguage = language;

      // Audio Config の作成（デフォルトマイク使用）
      const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();

      // Speech Recognizer の作成
      const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      // 中間結果イベント（Recognizing）
      recognizer.recognizing = (s, e) => {
        if (e.result.reason === speechsdk.ResultReason.RecognizingSpeech) {
          const text = e.result.text;
          setTranscript(text);
          onTranscript?.(text, false);
        }
      };

      // 確定結果イベント（Recognized）
      recognizer.recognized = (s, e) => {
        if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
          const text = e.result.text;
          setTranscript(text);
          onTranscript?.(text, true);
        } else if (e.result.reason === speechsdk.ResultReason.NoMatch) {
          console.warn('音声を認識できませんでした');
        }
      };

      // エラーイベント
      recognizer.canceled = (s, e) => {
        const errorMsg = `認識エラー: ${e.errorDetails}`;
        console.error(errorMsg);
        setError(errorMsg);
        onError?.(errorMsg);
        setIsListening(false);
      };

      // セッション停止イベント
      recognizer.sessionStopped = (s, e) => {
        console.log('音声認識セッションが停止しました');
        setIsListening(false);
      };

      // 継続的な認識を開始
      recognizer.startContinuousRecognitionAsync(
        () => {
          console.log('Azure Speech Service: 音声認識開始');
          setIsListening(true);
          setError(null);
        },
        (err) => {
          const errorMsg = `認識開始エラー: ${err}`;
          console.error(errorMsg);
          setError(errorMsg);
          onError?.(errorMsg);
          setIsListening(false);
        }
      );
    } catch (err) {
      const errorMsg = `Azure Speech Service エラー: ${err}`;
      console.error(errorMsg);
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [isAvailable, isListening, language, onTranscript, onError]);

  /**
   * 音声認識を停止
   */
  const stopListening = useCallback(() => {
    if (!recognizerRef.current) {
      return;
    }

    recognizerRef.current.stopContinuousRecognitionAsync(
      () => {
        console.log('Azure Speech Service: 音声認識停止');
        setIsListening(false);
        recognizerRef.current?.close();
        recognizerRef.current = null;
      },
      (err) => {
        const errorMsg = `認識停止エラー: ${err}`;
        console.error(errorMsg);
        setError(errorMsg);
        onError?.(errorMsg);
      }
    );
  }, [onError]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.stopContinuousRecognitionAsync();
        recognizerRef.current.close();
        recognizerRef.current = null;
      }
    };
  }, []);

  return {
    transcript,
    isListening,
    isAvailable,
    startListening,
    stopListening,
    error,
  };
}
