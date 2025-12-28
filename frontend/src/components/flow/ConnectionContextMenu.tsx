/**
 * ConnectionContextMenu Component
 * Context menu for connection management operations
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Point } from '@/types/canvas';

export interface ConnectionContextMenuProps {
  position: Point;
  connectionId: string;
  hasLabel: boolean;
  onEditLabel: (connectionId: string) => void;
  onDeleteConnection: (connectionId: string) => void;
  onDuplicateConnection: (connectionId: string) => void;
  onChangeStyle: (connectionId: string, style: 'straight' | 'curved' | 'orthogonal') => void;
  onClose: () => void;
  className?: string;
}

export default function ConnectionContextMenu({
  position,
  connectionId,
  hasLabel,
  onEditLabel,
  onDeleteConnection,
  onDuplicateConnection,
  onChangeStyle,
  onClose,
  className = '',
}: ConnectionContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleEditLabel = useCallback(() => {
    onEditLabel(connectionId);
    onClose();
  }, [connectionId, onEditLabel, onClose]);

  const handleDelete = useCallback(() => {
    onDeleteConnection(connectionId);
    onClose();
  }, [connectionId, onDeleteConnection, onClose]);

  const handleDuplicate = useCallback(() => {
    onDuplicateConnection(connectionId);
    onClose();
  }, [connectionId, onDuplicateConnection, onClose]);

  const handleStyleChange = useCallback((style: 'straight' | 'curved' | 'orthogonal') => {
    onChangeStyle(connectionId, style);
    onClose();
  }, [connectionId, onChangeStyle, onClose]);

  return (
    <div
      ref={menuRef}
      className={`
        absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48
        ${className}
      `}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Edit Label */}
      <button
        onClick={handleEditLabel}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>{hasLabel ? 'ラベルを編集' : 'ラベルを追加'}</span>
      </button>

      {/* Separator */}
      <div className="border-t border-gray-100 my-1" />

      {/* Style Options */}
      <div className="px-3 py-1">
        <div className="text-xs text-gray-500 mb-1">接続線スタイル</div>
        <div className="space-y-1">
          <button
            onClick={() => handleStyleChange('curved')}
            className="w-full px-2 py-1 text-left text-xs text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
          >
            <div className="w-4 h-1 bg-gray-400 rounded-full"></div>
            <span>曲線</span>
          </button>
          <button
            onClick={() => handleStyleChange('straight')}
            className="w-full px-2 py-1 text-left text-xs text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
          >
            <div className="w-4 h-0.5 bg-gray-400"></div>
            <span>直線</span>
          </button>
          <button
            onClick={() => handleStyleChange('orthogonal')}
            className="w-full px-2 py-1 text-left text-xs text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
          >
            <div className="flex items-center">
              <div className="w-2 h-0.5 bg-gray-400"></div>
              <div className="w-0.5 h-2 bg-gray-400"></div>
              <div className="w-2 h-0.5 bg-gray-400"></div>
            </div>
            <span>直角</span>
          </button>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-gray-100 my-1" />

      {/* Duplicate */}
      <button
        onClick={handleDuplicate}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>複製</span>
      </button>

      {/* Separator */}
      <div className="border-t border-gray-100 my-1" />

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>削除</span>
      </button>
    </div>
  );
}