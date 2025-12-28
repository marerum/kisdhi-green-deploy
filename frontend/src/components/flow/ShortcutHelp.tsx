/**
 * ShortcutHelp Component
 * Dialog showing all available keyboard shortcuts
 */

'use client';

import React from 'react';
import { KeyboardShortcut, formatShortcutText, isMacOS } from '@/hooks/useKeyboardShortcuts';

export interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
  categories: string[];
}

export default function ShortcutHelp({
  isOpen,
  onClose,
  shortcuts,
  categories,
}: ShortcutHelpProps) {
  if (!isOpen) return null;

  const getShortcutsByCategory = (category: string) => {
    return shortcuts.filter(shortcut => shortcut.category === category && !shortcut.disabled);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const platformText = isMacOS() ? 'Cmd' : 'Ctrl';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">キーボードショートカット</h2>
            <p className="text-sm text-gray-600 mt-1">
              効率的な操作のためのショートカット一覧
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {categories.map(category => {
              const categoryShortcuts = getShortcutsByCategory(category);
              if (categoryShortcuts.length === 0) return null;

              return (
                <div key={category} className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div key={`${category}-${index}`} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 flex-1">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center space-x-1 ml-4">
                          {formatShortcutText(shortcut).split(' + ').map((part, partIndex) => (
                            <React.Fragment key={partIndex}>
                              {partIndex > 0 && (
                                <span className="text-gray-400 text-xs">+</span>
                              )}
                              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                                {part === 'Ctrl' && isMacOS() ? 'Cmd' : part}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Platform Note */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium">プラットフォーム固有の注意事項:</p>
                <ul className="mt-1 space-y-1 text-blue-700">
                  <li>• {isMacOS() ? 'macOS' : 'Windows/Linux'}では、{platformText}キーを使用します</li>
                  <li>• テキスト編集中はショートカットが無効になります</li>
                  <li>• 一部のショートカットはブラウザの設定により動作しない場合があります</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
          <div className="text-xs text-gray-500">
            <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
              Esc
            </kbd>
            <span className="ml-1">で閉じる</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Shortcut Help Button Component
 * Button to open the shortcut help dialog
 */
export interface ShortcutHelpButtonProps {
  onClick: () => void;
  className?: string;
}

export function ShortcutHelpButton({ onClick, className = '' }: ShortcutHelpButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${className}`}
      title="キーボードショートカットを表示 (?)"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="hidden sm:inline">ショートカット</span>
    </button>
  );
}