/**
 * ComponentProperties Component
 * Property editor for selected flow components
 */

'use client';

import React, { useState, useCallback } from 'react';
import { FlowComponentData, FlowComponentStyle } from '@/types/flowComponents';

export interface ComponentPropertiesProps {
  selectedComponent: FlowComponentData | null;
  isMultipleSelection: boolean;
  selectedCount: number;
  onComponentUpdate: (componentId: string, updates: Partial<FlowComponentData>) => void;
}

export default function ComponentProperties({
  selectedComponent,
  isMultipleSelection,
  selectedCount,
  onComponentUpdate,
}: ComponentPropertiesProps) {
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [editingText, setEditingText] = useState('');

  const handleTextEdit = useCallback(() => {
    if (!selectedComponent) return;
    setEditingText(selectedComponent.text);
    setIsTextEditing(true);
  }, [selectedComponent]);

  const handleTextSave = useCallback(() => {
    if (!selectedComponent) return;
    onComponentUpdate(selectedComponent.id, { text: editingText });
    setIsTextEditing(false);
  }, [selectedComponent, editingText, onComponentUpdate]);

  const handleTextCancel = useCallback(() => {
    setIsTextEditing(false);
    setEditingText('');
  }, []);

  const handleStyleUpdate = useCallback((styleUpdates: Partial<FlowComponentStyle>) => {
    if (!selectedComponent) return;
    onComponentUpdate(selectedComponent.id, {
      style: { ...selectedComponent.style, ...styleUpdates }
    });
  }, [selectedComponent, onComponentUpdate]);

  const handleSizeUpdate = useCallback((sizeUpdates: Partial<{ width: number; height: number }>) => {
    if (!selectedComponent) return;
    onComponentUpdate(selectedComponent.id, {
      size: { ...selectedComponent.size, ...sizeUpdates }
    });
  }, [selectedComponent, onComponentUpdate]);

  const handlePositionUpdate = useCallback((positionUpdates: Partial<{ x: number; y: number }>) => {
    if (!selectedComponent) return;
    onComponentUpdate(selectedComponent.id, {
      position: { ...selectedComponent.position, ...positionUpdates }
    });
  }, [selectedComponent, onComponentUpdate]);

  if (isMultipleSelection) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-800 mb-2">複数選択</h3>
          <p className="text-sm text-gray-600 mb-4">
            {selectedCount}個のコンポーネントが選択されています
          </p>
          <p className="text-xs text-gray-500">
            複数選択時の一括編集機能は今後実装予定です
          </p>
        </div>
      </div>
    );
  }

  if (!selectedComponent) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <h3 className="text-lg font-medium text-gray-800 mb-2">コンポーネント未選択</h3>
          <p className="text-sm text-gray-600">
            編集するコンポーネントを選択してください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Component Info */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">基本情報</h3>
        
        {/* Component Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">タイプ</label>
          <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-800 capitalize">
            {selectedComponent.type}
          </div>
        </div>

        {/* Component Text */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">テキスト</label>
          {isTextEditing ? (
            <div className="space-y-2">
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="コンポーネントのテキストを入力..."
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleTextSave}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={handleTextCancel}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={handleTextEdit}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50 transition-colors min-h-[2.5rem] flex items-center"
            >
              {selectedComponent.text || 'クリックして編集...'}
            </div>
          )}
        </div>
      </div>

      {/* Position & Size */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">位置とサイズ</h3>
        
        {/* Position */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">X座標</label>
            <input
              type="number"
              value={Math.round(selectedComponent.position.x)}
              onChange={(e) => handlePositionUpdate({ x: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Y座標</label>
            <input
              type="number"
              value={Math.round(selectedComponent.position.y)}
              onChange={(e) => handlePositionUpdate({ y: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">幅</label>
            <input
              type="number"
              value={selectedComponent.size.width}
              onChange={(e) => handleSizeUpdate({ width: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">高さ</label>
            <input
              type="number"
              value={selectedComponent.size.height}
              onChange={(e) => handleSizeUpdate({ height: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="20"
            />
          </div>
        </div>
      </div>

      {/* Styling */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">スタイル</h3>
        
        {/* Background Color */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">背景色</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={selectedComponent.style.backgroundColor}
              onChange={(e) => handleStyleUpdate({ backgroundColor: e.target.value })}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={selectedComponent.style.backgroundColor}
              onChange={(e) => handleStyleUpdate({ backgroundColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="#ffffff"
            />
          </div>
        </div>

        {/* Border Color */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">枠線色</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={selectedComponent.style.borderColor}
              onChange={(e) => handleStyleUpdate({ borderColor: e.target.value })}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={selectedComponent.style.borderColor}
              onChange={(e) => handleStyleUpdate({ borderColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Text Color */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">文字色</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={selectedComponent.style.textColor}
              onChange={(e) => handleStyleUpdate({ textColor: e.target.value })}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={selectedComponent.style.textColor}
              onChange={(e) => handleStyleUpdate({ textColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Border Width */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">枠線の太さ</label>
          <input
            type="range"
            min="0"
            max="10"
            value={selectedComponent.style.borderWidth || 2}
            onChange={(e) => handleStyleUpdate({ borderWidth: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="text-xs text-gray-500 text-center mt-1">
            {selectedComponent.style.borderWidth || 2}px
          </div>
        </div>

        {/* Border Radius */}
        {selectedComponent.type !== 'decision' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">角の丸み</label>
            <input
              type="range"
              min="0"
              max="50"
              value={selectedComponent.style.borderRadius || 0}
              onChange={(e) => handleStyleUpdate({ borderRadius: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center mt-1">
              {selectedComponent.style.borderRadius || 0}px
            </div>
          </div>
        )}

        {/* Opacity */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">透明度</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={selectedComponent.style.opacity || 1}
            onChange={(e) => handleStyleUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="text-xs text-gray-500 text-center mt-1">
            {Math.round((selectedComponent.style.opacity || 1) * 100)}%
          </div>
        </div>
      </div>

      {/* Component ID (for debugging) */}
      <div className="pt-4 border-t border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ID</label>
          <div className="px-3 py-2 bg-gray-100 rounded-md text-xs text-gray-600 font-mono">
            {selectedComponent.id}
          </div>
        </div>
      </div>
    </div>
  );
}