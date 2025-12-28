/**
 * ExportDialog Component
 * Dialog for configuring and executing canvas export operations
 */

'use client';

import React, { useState } from 'react';
import { ExportOptions, exportCanvas, getSuggestedFilename } from '@/utils/exportUtils';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  projectName?: string;
}

export default function ExportDialog({
  isOpen,
  onClose,
  onExport,
  projectName,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'png' | 'svg' | 'pdf'>('png');
  const [quality, setQuality] = useState(0.9);
  const [scale, setScale] = useState(2);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [includeGrid, setIncludeGrid] = useState(false);
  const [filename, setFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update filename when format changes
  React.useEffect(() => {
    if (!filename || filename === getSuggestedFilename(format === 'png' ? 'svg' : format === 'svg' ? 'pdf' : 'png', projectName)) {
      setFilename(getSuggestedFilename(format, projectName));
    }
  }, [format, projectName, filename]);

  const handleExport = async () => {
    if (!filename.trim()) {
      setError('ファイル名を入力してください');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const options: ExportOptions = {
        format,
        quality: format === 'png' ? quality : undefined,
        scale,
        backgroundColor: backgroundColor === 'transparent' ? 'transparent' : backgroundColor,
        filename: filename.trim(),
        includeGrid,
      };

      await onExport(options);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">フロー図をエクスポート</h2>
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              フォーマット
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['png', 'svg', 'pdf'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  disabled={isExporting}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    format === fmt
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {format === 'png' && 'ビットマップ画像（高品質）'}
              {format === 'svg' && 'ベクター画像（拡大縮小可能）'}
              {format === 'pdf' && 'PDF文書（印刷用）'}
            </div>
          </div>

          {/* Filename */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ファイル名
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              disabled={isExporting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="ファイル名を入力"
            />
          </div>

          {/* Quality (PNG only) */}
          {format === 'png' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                品質: {Math.round(quality * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                disabled={isExporting}
                className="w-full disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>低品質</span>
                <span>高品質</span>
              </div>
            </div>
          )}

          {/* Scale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スケール: {scale}x
            </label>
            <input
              type="range"
              min="1"
              max="4"
              step="0.5"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              disabled={isExporting}
              className="w-full disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1x</span>
              <span>4x</span>
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              背景色
            </label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  type="color"
                  value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={isExporting}
                  className="w-full h-10 border border-gray-300 rounded-md disabled:opacity-50"
                />
              </div>
              <button
                onClick={() => setBackgroundColor('transparent')}
                disabled={isExporting}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  backgroundColor === 'transparent'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                透明
              </button>
            </div>
          </div>

          {/* Include Grid */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeGrid"
              checked={includeGrid}
              onChange={(e) => setIncludeGrid(e.target.checked)}
              disabled={isExporting}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
            <label htmlFor="includeGrid" className="ml-2 block text-sm text-gray-700">
              グリッドを含める
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !filename.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>エクスポート中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>エクスポート</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}