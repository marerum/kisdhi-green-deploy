/**
 * CanvasProperties Component
 * Property editor for canvas settings
 */

'use client';

import React, { useCallback } from 'react';

export interface CanvasPropertiesProps {
  settings: {
    gridSize: number;
    gridVisible: boolean;
    snapToGrid: boolean;
    backgroundColor: string;
  };
  onSettingsUpdate: (settings: Partial<CanvasPropertiesProps['settings']>) => void;
}

export default function CanvasProperties({
  settings,
  onSettingsUpdate,
}: CanvasPropertiesProps) {
  const handleGridSizeChange = useCallback((size: number) => {
    onSettingsUpdate({ gridSize: size });
  }, [onSettingsUpdate]);

  const handleGridVisibilityToggle = useCallback(() => {
    onSettingsUpdate({ gridVisible: !settings.gridVisible });
  }, [settings.gridVisible, onSettingsUpdate]);

  const handleSnapToGridToggle = useCallback(() => {
    onSettingsUpdate({ snapToGrid: !settings.snapToGrid });
  }, [settings.snapToGrid, onSettingsUpdate]);

  const handleBackgroundColorChange = useCallback((color: string) => {
    onSettingsUpdate({ backgroundColor: color });
  }, [onSettingsUpdate]);

  const presetGridSizes = [10, 15, 20, 25, 30, 40, 50];
  const presetBackgroundColors = [
    '#ffffff', // White
    '#f8fafc', // Gray 50
    '#f1f5f9', // Gray 100
    '#e2e8f0', // Gray 200
    '#1e293b', // Dark
    '#0f172a', // Darker
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Grid Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">グリッド設定</h3>
        
        {/* Grid Visibility */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">グリッド表示</label>
          <button
            onClick={handleGridVisibilityToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.gridVisible ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.gridVisible ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Snap to Grid */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">グリッドスナップ</label>
          <button
            onClick={handleSnapToGridToggle}
            disabled={!settings.gridVisible}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              settings.snapToGrid && settings.gridVisible ? 'bg-green-600' : 'bg-gray-200'
            } ${!settings.gridVisible ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.snapToGrid && settings.gridVisible ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Grid Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">グリッドサイズ</label>
          <div className="space-y-3">
            {/* Slider */}
            <div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={settings.gridSize}
                onChange={(e) => handleGridSizeChange(parseInt(e.target.value))}
                className="w-full"
                disabled={!settings.gridVisible}
              />
              <div className="text-xs text-gray-500 text-center mt-1">
                {settings.gridSize}px
              </div>
            </div>

            {/* Preset Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {presetGridSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => handleGridSizeChange(size)}
                  disabled={!settings.gridVisible}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    settings.gridSize === size
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } ${!settings.gridVisible ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Appearance */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">キャンバス外観</h3>
        
        {/* Background Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">背景色</label>
          <div className="space-y-3">
            {/* Color Input */}
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => handleBackgroundColorChange(e.target.value)}
                className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={settings.backgroundColor}
                onChange={(e) => handleBackgroundColorChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#ffffff"
              />
            </div>

            {/* Preset Colors */}
            <div className="grid grid-cols-6 gap-2">
              {presetBackgroundColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleBackgroundColorChange(color)}
                  className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                    settings.backgroundColor === color
                      ? 'border-blue-600 ring-2 ring-blue-200'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">キャンバス情報</h3>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>グリッドサイズ:</span>
            <span className="font-mono">{settings.gridSize}px</span>
          </div>
          <div className="flex justify-between">
            <span>グリッド表示:</span>
            <span className={settings.gridVisible ? 'text-green-600' : 'text-gray-400'}>
              {settings.gridVisible ? 'オン' : 'オフ'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>スナップ:</span>
            <span className={settings.snapToGrid && settings.gridVisible ? 'text-green-600' : 'text-gray-400'}>
              {settings.snapToGrid && settings.gridVisible ? 'オン' : 'オフ'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>背景色:</span>
            <span className="font-mono">{settings.backgroundColor}</span>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">ヒント</h4>
        <div className="space-y-2 text-xs text-gray-500">
          <p>• グリッドスナップを有効にすると、コンポーネントが自動的にグリッドに整列します</p>
          <p>• 小さなグリッドサイズ（10-20px）は精密な配置に適しています</p>
          <p>• 大きなグリッドサイズ（30-50px）は大まかなレイアウトに適しています</p>
        </div>
      </div>
    </div>
  );
}