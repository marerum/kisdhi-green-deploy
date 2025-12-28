/**
 * HearingHistory Component
 * Displays chronological list of hearing log entries with delete functionality
 */

'use client';

import { useState } from 'react';
import { HearingLogResponse } from '@/types/api';
import { hearingApi } from '@/lib/api';

interface HearingHistoryProps {
  hearingLogs: HearingLogResponse[];
  isLoading?: boolean;
  onHearingLogDeleted?: (deletedLogId: number) => void;
  onHearingLogEdit?: (log: HearingLogResponse) => void;
}

export function HearingHistory({ hearingLogs, isLoading, onHearingLogDeleted, onHearingLogEdit }: HearingHistoryProps) {
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'たった今';
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}時間前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}日前`;
    
    // For older entries, show the actual date
    return date.toLocaleDateString('ja-JP');
  };

  const handleDelete = async (logId: number) => {
    if (!confirm('このヒアリングログを削除しますか？')) {
      return;
    }

    try {
      setDeletingIds(prev => new Set(prev).add(logId));
      await hearingApi.deleteHearingLog(logId);
      onHearingLogDeleted?.(logId);
    } catch (error) {
      console.error('Failed to delete hearing log:', error);
      alert('ヒアリングログの削除に失敗しました。再度お試しください。');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(logId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          過去のヒアリングログ
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200 animate-pulse">
              <div className="flex justify-between items-start mb-2">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Sort hearing logs by creation date (oldest first for chronological order)
  const sortedLogs = [...hearingLogs].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        過去のヒアリングログ
        {hearingLogs.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({hearingLogs.length}件のエントリ)
          </span>
        )}
      </h2>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {sortedLogs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              ヒアリングログがまだありません。上記で最初のエントリを追加してください。
            </p>
          </div>
        ) : (
          sortedLogs.map((log, index) => (
            <div key={log.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors group cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-500">
                  {formatRelativeTime(log.created_at)}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    #{index + 1}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(log.id);
                    }}
                    disabled={deletingIds.has(log.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded transition-all duration-200 disabled:opacity-50"
                    title="ヒアリングログを削除"
                  >
                    {deletingIds.has(log.id) ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div 
                className="text-gray-700 text-sm whitespace-pre-wrap"
                onClick={() => onHearingLogEdit?.(log)}
              >
                {log.content}
              </div>
              <div className="mt-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                クリックして編集
              </div>
            </div>
          ))
        )}
      </div>
      
      {sortedLogs.length > 0 && (
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            すべてのヒアリングログを時系列順に表示（古い順）
          </p>
        </div>
      )}
    </div>
  );
}

export default HearingHistory;