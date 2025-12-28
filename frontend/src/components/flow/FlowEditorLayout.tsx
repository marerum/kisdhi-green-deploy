/**
 * FlowEditorLayout Component
 * Main layout component for Figma-like flow editor with sidebar and canvas areas
 */

'use client';

import React, { useState } from 'react';

interface FlowEditorLayoutProps {
  // Top toolbar content
  toolbar?: React.ReactNode;
  
  // Left sidebar content (component library)
  sidebar?: React.ReactNode;
  
  // Main canvas area
  canvas: React.ReactNode;
  
  // Right properties panel (optional)
  propertiesPanel?: React.ReactNode;
  
  // Bottom status bar (optional)
  statusBar?: React.ReactNode;
  
  // Layout configuration
  sidebarWidth?: number;
  propertiesPanelWidth?: number;
  toolbarHeight?: number;
  statusBarHeight?: number;
  
  // Collapsible states
  sidebarCollapsed?: boolean;
  propertiesPanelCollapsed?: boolean;
  
  // Callbacks
  onSidebarToggle?: (collapsed: boolean) => void;
  onPropertiesPanelToggle?: (collapsed: boolean) => void;
}

export default function FlowEditorLayout({
  toolbar,
  sidebar,
  canvas,
  propertiesPanel,
  statusBar,
  sidebarWidth = 280,
  propertiesPanelWidth = 320,
  toolbarHeight = 60,
  statusBarHeight = 32,
  sidebarCollapsed = false,
  propertiesPanelCollapsed = true,
  onSidebarToggle,
  onPropertiesPanelToggle,
}: FlowEditorLayoutProps) {
  const [internalSidebarCollapsed, setInternalSidebarCollapsed] = useState(sidebarCollapsed);
  const [internalPropertiesPanelCollapsed, setInternalPropertiesPanelCollapsed] = useState(propertiesPanelCollapsed);

  const handleSidebarToggle = () => {
    const newCollapsed = !internalSidebarCollapsed;
    setInternalSidebarCollapsed(newCollapsed);
    onSidebarToggle?.(newCollapsed);
  };

  const handlePropertiesPanelToggle = () => {
    const newCollapsed = !internalPropertiesPanelCollapsed;
    setInternalPropertiesPanelCollapsed(newCollapsed);
    onPropertiesPanelToggle?.(newCollapsed);
  };

  const actualSidebarWidth = internalSidebarCollapsed ? 60 : sidebarWidth;
  const actualPropertiesPanelWidth = internalPropertiesPanelCollapsed ? 0 : propertiesPanelWidth;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top Toolbar */}
      {toolbar && (
        <div 
          className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-20"
          style={{ height: toolbarHeight }}
        >
          <div className="h-full flex items-center px-4 overflow-hidden">
            {toolbar}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {sidebar && (
          <div 
            className={`flex-shrink-0 bg-white text-gray-900 transition-all duration-300 ease-in-out border-r border-gray-200 ${
              internalSidebarCollapsed ? 'shadow-sm' : 'shadow'
            } ${
              // Hide sidebar on mobile when collapsed
              internalSidebarCollapsed ? 'hidden sm:block' : ''
            }`}
            style={{ width: actualSidebarWidth }}
          >
            {/* Sidebar Header */}
            <div className="h-12 flex items-center justify-between px-3 border-b border-gray-100">
              {!internalSidebarCollapsed && (
                <h3 className="text-sm font-medium text-gray-800 truncate">コンポーネント</h3>
              )}
              <button
                onClick={handleSidebarToggle}
                className="p-1.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                title={internalSidebarCollapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
              >
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${
                    internalSidebarCollapsed ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              {sidebar}
            </div>
          </div>
        )}

        {/* Mobile Sidebar Toggle (when sidebar is collapsed) */}
        {sidebar && internalSidebarCollapsed && (
          <div className="sm:hidden fixed top-20 left-4 z-30">
            <button
              onClick={handleSidebarToggle}
              className="p-2 bg-white text-gray-800 rounded-lg shadow hover:bg-gray-50 transition-colors border border-gray-200"
              title="サイドバーを開く"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {canvas}
        </div>

        {/* Right Properties Panel */}
        {propertiesPanel && !internalPropertiesPanelCollapsed && (
          <div 
            className={`flex-shrink-0 bg-white border-l border-gray-200 shadow-lg ${
              // Hide properties panel on mobile
              'hidden lg:block'
            }`}
            style={{ width: actualPropertiesPanelWidth }}
          >
            {/* Properties Panel Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 truncate">プロパティ</h3>
              <button
                onClick={handlePropertiesPanelToggle}
                className="p-1.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                title="プロパティパネルを閉じる"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Properties Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {propertiesPanel}
            </div>
          </div>
        )}

        {/* Properties Panel Toggle Button (when collapsed) */}
        {propertiesPanel && internalPropertiesPanelCollapsed && (
          <div className="hidden lg:flex flex-shrink-0 w-8 bg-gray-100 border-l border-gray-200 items-center justify-center">
            <button
              onClick={handlePropertiesPanelToggle}
              className="p-2 rounded hover:bg-gray-200 transition-colors"
              title="プロパティパネルを開く"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      {statusBar && (
        <div 
          className="flex-shrink-0 bg-gray-100 border-t border-gray-200 px-4 flex items-center overflow-hidden"
          style={{ height: statusBarHeight }}
        >
          {statusBar}
        </div>
      )}
    </div>
  );
}