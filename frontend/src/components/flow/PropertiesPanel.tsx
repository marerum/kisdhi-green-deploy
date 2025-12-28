/**
 * PropertiesPanel Component
 * Right sidebar for editing component and canvas properties
 */

'use client';

import React, { useState } from 'react';
import { FlowComponentData } from '@/types/flowComponents';
import ComponentProperties from '@/components/flow/ComponentProperties';
import CanvasProperties from '@/components/flow/CanvasProperties';

export interface PropertiesPanelProps {
  selectedComponents: FlowComponentData[];
  canvasSettings: {
    gridSize: number;
    gridVisible: boolean;
    snapToGrid: boolean;
    backgroundColor: string;
  };
  isVisible: boolean;
  onComponentUpdate: (componentId: string, updates: Partial<FlowComponentData>) => void;
  onCanvasSettingsUpdate: (settings: Partial<PropertiesPanelProps['canvasSettings']>) => void;
  onToggle: () => void;
  className?: string;
}

type PanelTab = 'component' | 'canvas';

export default function PropertiesPanel({
  selectedComponents,
  canvasSettings,
  isVisible,
  onComponentUpdate,
  onCanvasSettingsUpdate,
  onToggle,
  className = '',
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('component');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const hasSelectedComponents = selectedComponents.length > 0;
  const selectedComponent = hasSelectedComponents ? selectedComponents[0] : null;
  const isMultipleSelection = selectedComponents.length > 1;

  if (!isVisible) {
    return (
      <div className="fixed top-1/2 right-4 transform -translate-y-1/2 z-50">
        <button
          onClick={onToggle}
          className="bg-white border border-gray-200 rounded-l-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
          title="プロパティパネルを開く"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-lg z-40 transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    } ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        {!isCollapsed && (
          <>
            <h2 className="text-lg font-semibold text-gray-800">プロパティ</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="パネルを折りたたむ"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="パネルを閉じる"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </>
        )}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1 hover:bg-gray-200 rounded transition-colors mx-auto"
            title="パネルを展開する"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('component')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'component'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
                <span>コンポーネント</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'canvas'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <span>キャンバス</span>
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'component' && (
              <ComponentProperties
                selectedComponent={selectedComponent}
                isMultipleSelection={isMultipleSelection}
                selectedCount={selectedComponents.length}
                onComponentUpdate={onComponentUpdate}
              />
            )}
            {activeTab === 'canvas' && (
              <CanvasProperties
                settings={canvasSettings}
                onSettingsUpdate={onCanvasSettingsUpdate}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}