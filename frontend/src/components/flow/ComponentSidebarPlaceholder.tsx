/**
 * ComponentSidebarPlaceholder Component
 * Temporary placeholder for the component sidebar (will be implemented in Task 2.1)
 */

'use client';

import React from 'react';

interface ComponentSidebarPlaceholderProps {
  collapsed?: boolean;
}

export default function ComponentSidebarPlaceholder({ collapsed = false }: ComponentSidebarPlaceholderProps) {
  if (collapsed) {
    return (
      <div className="p-2 space-y-2">
        {/* Collapsed icons */}
        <div className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          </svg>
        </div>
        <div className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </div>
        <div className="w-8 h-8 bg-white border border-gray-200 rounded flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <polygon points="12,2 22,20 2,20"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-gray-600 uppercase tracking-wide font-medium">
        基本コンポーネント
      </div>
      
      {/* Process Step */}
      <div className="flex items-center space-x-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 cursor-pointer transition-colors">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium">プロセス</div>
          <div className="text-xs text-gray-400">処理ステップ</div>
        </div>
      </div>

      {/* Decision Diamond */}
      <div className="flex items-center space-x-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 cursor-pointer transition-colors">
        <div className="w-8 h-8 bg-yellow-600 rounded flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <polygon points="12,2 22,12 12,22 2,12"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium">判断</div>
          <div className="text-xs text-gray-400">分岐処理</div>
        </div>
      </div>

      {/* Start/End */}
      <div className="flex items-center space-x-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 cursor-pointer transition-colors">
        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium">開始/終了</div>
          <div className="text-xs text-gray-400">フロー端点</div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-600 uppercase tracking-wide font-medium mb-3">
          接続
        </div>
        
        {/* Connector */}
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 cursor-pointer transition-colors">
          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium">矢印</div>
            <div className="text-xs text-gray-400">接続線</div>
          </div>
        </div>
      </div>

      <div className="pt-4 text-xs text-gray-600">
        <p>コンポーネントをキャンバスにドラッグして配置</p>
        <p className="mt-1">（Task 2.1で実装予定）</p>
      </div>
    </div>
  );
}