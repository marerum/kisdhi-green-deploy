'use client';

import React, { useState } from 'react';

interface ComponentTemplate {
  id: string;
  type: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const componentTemplates: ComponentTemplate[] = [
  {
    id: 'start',
    type: 'start',
    label: '開始',
    icon: '○',
    color: '#10b981',
    description: 'フローの開始点',
  },
  {
    id: 'process',
    type: 'process',
    label: 'プロセス',
    icon: '□',
    color: '#3b82f6',
    description: '処理・作業ステップ',
  },
  {
    id: 'decision',
    type: 'decision',
    label: '判断',
    icon: '◇',
    color: '#f59e0b',
    description: '条件分岐',
  },
  {
    id: 'end',
    type: 'end',
    label: '終了',
    icon: '●',
    color: '#ef4444',
    description: 'フローの終了点',
  },
];

interface ComponentPaletteProps {
  onDragStart?: (nodeType: string, label: string) => void;
}

export default function ComponentPalette({ onDragStart }: ComponentPaletteProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDragStart = (event: React.DragEvent, template: ComponentTemplate) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: template.type,
      label: template.label,
    }));
    event.dataTransfer.effectAllowed = 'move';
    onDragStart?.(template.type, template.label);
  };

  return (
    <div 
      className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-12' : 'w-64'
      } flex flex-col`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-3 hover:bg-gray-100 transition-colors border-b border-gray-200 flex items-center justify-center"
        title={isCollapsed ? 'コンポーネントを開く' : 'コンポーネントを閉じる'}
      >
        <svg 
          className={`w-5 h-5 text-gray-600 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {!isCollapsed && (
          <span className="ml-2 text-sm font-medium text-gray-700">閉じる</span>
        )}
      </button>

      {/* Palette Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              コンポーネント
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              ドラッグしてキャンバスに追加
            </p>
          </div>

          <div className="space-y-2">
            {componentTemplates.map((template) => (
              <div
                key={template.id}
                draggable
                onDragStart={(e) => handleDragStart(e, template)}
                className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 cursor-grab active:cursor-grabbing transition-all group"
                title={template.description}
              >
                <div
                  className="w-10 h-10 rounded flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                  style={{ backgroundColor: template.color }}
                >
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
                    {template.label}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {template.description}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-blue-800">
                <div className="font-medium mb-1">使い方</div>
                <ul className="space-y-1 text-blue-700">
                  <li>• コンポーネントをドラッグ</li>
                  <li>• キャンバスにドロップ</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <div className="text-xs text-green-800">
                <div className="font-medium mb-1">矢印・線の操作</div>
                <ul className="space-y-1 text-green-700">
                  <li>• ノードの●からドラッグで接続</li>
                  <li>• 線を選択してDeleteで削除</li>
                  <li>• 削除してから新しく接続し直す</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed State */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center py-4 space-y-3">
          {componentTemplates.map((template) => (
            <div
              key={template.id}
              draggable
              onDragStart={(e) => handleDragStart(e, template)}
              className="w-10 h-10 rounded flex items-center justify-center text-white text-lg font-bold cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
              style={{ backgroundColor: template.color }}
              title={`${template.label} - ${template.description}`}
            >
              {template.icon}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
