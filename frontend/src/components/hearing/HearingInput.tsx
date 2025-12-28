/**
 * HearingInput Component
 * Provides a text area interface for inputting hearing content with manual save functionality
 * Supports both creating new logs and editing existing ones
 */

'use client';

import { useState, useEffect } from 'react';
import { hearingApi } from '@/lib/api';
import { HearingLogResponse } from '@/types/api';

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

  // Load editing log content when editingLog changes
  useEffect(() => {
    if (editingLog) {
      setContent(editingLog.content);
    } else {
      setContent('');
    }
    setError(null);
  }, [editingLog]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    // Clear any previous errors when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setError('ヒアリング内容を入力してください');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      if (editingLog) {
        // Update existing hearing log
        const updatedLog = await hearingApi.updateHearingLog(editingLog.id, { content: content.trim() });
        onHearingLogUpdated?.(updatedLog);
        onCancelEdit?.();
      } else {
        // Create new hearing log
        const newLog = await hearingApi.addHearingLog(projectId, { content: content.trim() });
        onHearingLogAdded?.(newLog);
      }
      
      // Clear content after successful save (only for new logs)
      if (!editingLog) {
        setContent('');
      }
    } catch (err) {
      console.error('Failed to save hearing log:', err);
      setError('ヒアリングログの保存に失敗しました。再度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (editingLog) {
      onCancelEdit?.();
    } else {
      setContent('');
      setError(null);
    }
  };

  const isEditing = !!editingLog;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="hearing-input" className="block text-sm font-medium text-gray-700 mb-2">
          {isEditing ? 'ヒアリング内容を編集' : '新しいヒアリング内容'}
        </label>
        <textarea
          id="hearing-input"
          rows={12}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="インタビューで学んだことを入力してください...

例:
- 承認プロセスには3-5日かかります
- マネージャーレビューは毎週火曜日に行われます
- 書類はPDF形式である必要があります
- 緊急時のバックアップ承認プロセスがあります"
        />
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
        
        <div className="flex space-x-2">
          {isEditing && (
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              キャンセル
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEditing ? '更新中...' : '反映中...'}
              </span>
            ) : (
              isEditing ? '更新' : '反映'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HearingInput;