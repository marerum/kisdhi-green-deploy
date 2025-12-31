/**
 * CanvasTest Component
 * Test component for the new FlowCanvas with component system integration
 */

'use client';

import React, { useState, useCallback } from 'react';
import FlowCanvas from './FlowCanvas';
import { useAutoSave } from '@/hooks/useAutoSave';
import { FlowComponentData, Connection, DraggedComponent } from '@/types/flowComponents';
import { ComponentFactory } from '@/utils/componentRegistry';

export interface CanvasTestProps {
  showPropertiesPanel?: boolean;
  onPropertiesPanelToggle?: () => void;
  projectName?: string;
  projectId?: number | null;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onFlowGenerated?: (components: FlowComponentData[], connections: Connection[]) => void;
  generatedFlowData?: { components: FlowComponentData[]; connections: Connection[] } | null;
  onFitToContent?: (fn: (components?: FlowComponentData[] | null) => void) => void;
  draggedComponent?: DraggedComponent | null;
  onComponentDragEnd?: () => void;
}

export default function CanvasTest({ 
  showPropertiesPanel = false,
  onPropertiesPanelToggle,
  projectName,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onFlowGenerated,
  generatedFlowData,
  projectId = null,
  onFitToContent,
  draggedComponent,
  onComponentDragEnd,
}: CanvasTestProps) {
  const [components, setComponents] = useState<FlowComponentData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [fitToContentFn, setFitToContentFn] = useState<((components: FlowComponentData[]) => void) | null>(null);

  // Handle generated flow data
  React.useEffect(() => {
    // If there is an autosave for this project, prefer it over generatedFlowData
    try {
      if (projectId) {
        const key = `flow-autosave-${projectId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          console.log('Loading autosaved flow from localStorage for project', projectId);
          const parsed = JSON.parse(saved);
          if (parsed?.components) {
            setComponents(parsed.components);
            setConnections(parsed.connections || []);
            setSelectedComponentIds([]);
            setSelectedConnectionIds([]);
            // Notify parent that flow has been generated/loaded
            if (onFlowGenerated) onFlowGenerated(parsed.components, parsed.connections || []);
            return; // skip applying generatedFlowData
          }
        }
      }

    } catch (err) {
      console.error('Failed to load autosave:', err);
    }

    if (generatedFlowData) {
      console.log('=== GENERATED FLOW DATA RECEIVED ===');
      console.log('Components:', generatedFlowData.components);
      console.log('Connections:', generatedFlowData.connections);
      
      setComponents(generatedFlowData.components);
      setConnections(generatedFlowData.connections);
      setSelectedComponentIds([]);
      setSelectedConnectionIds([]);
      
      // Force immediate fit-to-content with aggressive retry using setTimeout to avoid setState during render
      const forceResize = () => {
        console.log('=== FORCING RESIZE ===');
        
        if (fitToContentFn && generatedFlowData.components && generatedFlowData.components.length > 0) {
          console.log('Calling fitToContent with components:', generatedFlowData.components);
          
          // Try the fit-to-content function
          fitToContentFn(generatedFlowData.components);
          
          // Also try the direct scale setting as a fallback
          if ((fitToContentFn as any).setScale) {
            console.log('Also trying direct scale setting');
            
            // Calculate center of components
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            generatedFlowData.components.forEach((component: any) => {
              const x = component.position.x;
              const y = component.position.y;
              const width = component.size?.width || 120;
              const height = component.size?.height || 60;
              
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x + width);
              maxY = Math.max(maxY, y + height);
            });
            
            if (minX !== Infinity) {
              const contentCenterX = (minX + maxX) / 2;
              const contentCenterY = (minY + maxY) / 2;
              
              console.log('Setting scale to 1.0 with center:', { x: contentCenterX, y: contentCenterY });
              (fitToContentFn as any).setScale(1.0, contentCenterX, contentCenterY);
            }
          }
        } else {
          console.log('fitToContentFn not available, retrying...');
        }
      };
      
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        // Try immediately
        forceResize();
        
        // Try again after delays
        setTimeout(forceResize, 100);
        setTimeout(forceResize, 500);
        setTimeout(forceResize, 1000);
        setTimeout(forceResize, 2000);
      }, 0);
      
      // Notify parent that flow has been generated
      if (onFlowGenerated) {
        onFlowGenerated(generatedFlowData.components, generatedFlowData.connections);
      }
    }
  }, [generatedFlowData, onFlowGenerated, fitToContentFn]);

  const handleCanvasReady = (canvasRef: SVGSVGElement) => {
    console.log('Canvas ready:', canvasRef);
  };

  const handleComponentsChange = useCallback((newComponents: FlowComponentData[]) => {
    console.log('=== CANVAS TEST COMPONENTS CHANGE ===');
    console.log('New components count:', newComponents.length);
    console.log('Components:', newComponents);
    setComponents(newComponents);
  }, []);

  // Auto-save components + connections to localStorage (debounced) using useAutoSave
  // We store per-project autosave if projectId is provided.
  const saveKey = projectId ? `flow-autosave-${projectId}` : null;
  const saveFunction = async (data: { components: FlowComponentData[]; connections: Connection[] }) => {
    if (!saveKey) return;
    try {
      localStorage.setItem(saveKey, JSON.stringify(data));
      console.log('Autosaved flow to localStorage:', saveKey);
    } catch (err) {
      console.error('Failed to autosave to localStorage:', err);
      throw err as Error;
    }
  };

  const { save: autoSave, isLoading: isAutoSaving } = useAutoSave<{ components: FlowComponentData[]; connections: Connection[] }>({
    saveFunction,
    delay: 1000,
    onError: (e) => console.error('Autosave error', e),
  });

  // Trigger autosave when components or connections change
  React.useEffect(() => {
    if (!saveKey) return;
    autoSave({ components, connections });
  }, [components, connections, autoSave, saveKey]);

  const handleConnectionsChange = useCallback((newConnections: Connection[]) => {
    setConnections(newConnections);
  }, []);

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedComponentIds(selectedIds);
  }, []);

  const handleConnectionSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedConnectionIds(selectedIds);
  }, []);

  // Add some test components
  const addTestComponents = useCallback(() => {
    const testComponents: FlowComponentData[] = [
      ComponentFactory.createByType('start', { x: 100, y: 100 }, { text: '開始' })!,
      ComponentFactory.createByType('process', { x: 250, y: 100 }, { text: 'プロセス1' })!,
      ComponentFactory.createByType('decision', { x: 450, y: 100 }, { text: '判断' })!,
      ComponentFactory.createByType('process', { x: 250, y: 250 }, { text: 'プロセス2' })!,
      ComponentFactory.createByType('end', { x: 450, y: 250 }, { text: '終了' })!,
    ];

    setComponents(testComponents);
  }, []);

  const clearComponents = useCallback(() => {
    setComponents([]);
    setConnections([]);
    setSelectedComponentIds([]);
    setSelectedConnectionIds([]);
  }, []);

  const deleteSelected = useCallback(() => {
    const remainingComponents = components.filter(
      component => !selectedComponentIds.includes(component.id)
    );
    
    // Also remove connections that involve deleted components
    const remainingConnections = connections.filter(
      connection => 
        !selectedComponentIds.includes(connection.from.componentId) &&
        !selectedComponentIds.includes(connection.to.componentId) &&
        !selectedConnectionIds.includes(connection.id)
    );
    
    setComponents(remainingComponents);
    setConnections(remainingConnections);
    setSelectedComponentIds([]);
    setSelectedConnectionIds([]);
  }, [components, connections, selectedComponentIds, selectedConnectionIds]);

  const duplicateSelected = useCallback(() => {
    const selectedComponents = components.filter(
      component => selectedComponentIds.includes(component.id)
    );
    
    const duplicatedComponents = selectedComponents.map(component => ({
      ...component,
      id: `${component.type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      position: {
        x: component.position.x + 20,
        y: component.position.y + 20,
      },
      connectionPoints: component.connectionPoints.map((cp, index) => ({
        ...cp,
        id: `${component.type}-${Date.now()}-${index}`,
      })),
    }));
    
    const newComponents = [...components, ...duplicatedComponents];
    setComponents(newComponents);
    setSelectedComponentIds(duplicatedComponents.map(c => c.id));
  }, [components, selectedComponentIds]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Canvas Test - Figma風フローエディター (Component System)
        </h2>
        <p className="text-gray-600">
          新しいコンポーネントシステムのテスト。左サイドバーからドラッグ&ドロップ、選択、編集が可能です。
        </p>
      </div>

      {/* Test Controls */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={addTestComponents}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          テストコンポーネント追加
        </button>
        <button
          onClick={clearComponents}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          全削除
        </button>
        <button
          onClick={deleteSelected}
          disabled={selectedComponentIds.length === 0 && selectedConnectionIds.length === 0}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          選択削除 ({selectedComponentIds.length + selectedConnectionIds.length})
        </button>
        <button
          onClick={duplicateSelected}
          disabled={selectedComponentIds.length === 0}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          複製 ({selectedComponentIds.length})
        </button>
        <button
          onClick={() => {
            if (fitToContentFn && components.length > 0) {
              console.log('Manual fit-to-content triggered');
              fitToContentFn(components);
            }
          }}
          disabled={!fitToContentFn || components.length === 0}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          フィット ({components.length}個)
        </button>
        <button
          onClick={() => {
            if (fitToContentFn && components.length > 0) {
              console.log('Force 100% scale with proper centering');
              
              // Calculate the center of all components
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              
              components.forEach(component => {
                const x = component.position.x;
                const y = component.position.y;
                const width = component.size?.width || 120;
                const height = component.size?.height || 60;
                
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + width);
                maxY = Math.max(maxY, y + height);
              });
              
              if (minX !== Infinity) {
                const contentCenterX = (minX + maxX) / 2;
                const contentCenterY = (minY + maxY) / 2;
                
                console.log('Content center:', { x: contentCenterX, y: contentCenterY });
                
                // Use the setScale function if available
                if ((fitToContentFn as any).setScale) {
                  (fitToContentFn as any).setScale(1.0, contentCenterX, contentCenterY);
                } else {
                  // Fallback: call fitToContent and hope it works better
                  fitToContentFn(components);
                }
              }
            }
          }}
          disabled={!fitToContentFn || components.length === 0}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          100%表示
        </button>
        <button
          onClick={() => {
            console.log('=== MANUAL COMPONENT ADD TEST ===');
            const testComponent = ComponentFactory.createByType('process', { x: 200, y: 200 }, { text: 'テスト' });
            if (testComponent) {
              console.log('Created test component:', testComponent);
              const updatedComponents = [...components, testComponent];
              handleComponentsChange(updatedComponents);
              console.log('Added test component, total components:', updatedComponents.length);
            } else {
              console.error('Failed to create test component');
            }
          }}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          テストコンポーネント追加
        </button>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <FlowCanvas
          width={1200}
          height={800}
          components={components}
          connections={connections}
          selectedComponentIds={selectedComponentIds}
          selectedConnectionIds={selectedConnectionIds}
          showPropertiesPanel={showPropertiesPanel}
          projectName={projectName}
          onCanvasReady={handleCanvasReady}
          onComponentsChange={handleComponentsChange}
          onConnectionsChange={handleConnectionsChange}
          onSelectionChange={handleSelectionChange}
          onConnectionSelectionChange={handleConnectionSelectionChange}
          onPropertiesPanelToggle={onPropertiesPanelToggle}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onFitToContent={setFitToContentFn}
          className="rounded-lg border border-gray-200"
        />
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <h3 className="font-medium mb-2">操作方法:</h3>
        <ul className="space-y-1">
          <li>• 左サイドバーからコンポーネントをドラッグ&ドロップ</li>
          <li>• クリック: コンポーネント選択</li>
          <li>• Ctrl/Cmd + クリック: 複数選択</li>
          <li>• ドラッグ選択: 範囲選択</li>
          <li>• ダブルクリック: テキスト編集</li>
          <li>• F2キー: 選択中コンポーネントのテキスト編集</li>
          <li>• Enter: 編集内容を保存</li>
          <li>• Escape: 編集をキャンセル / 選択解除 / 接続キャンセル</li>
          <li>• コンポーネントドラッグ: 単一・複数コンポーネント移動</li>
          <li>• 矢印キー: 選択コンポーネントを移動</li>
          <li>• Shift + 矢印キー: 選択コンポーネントを大きく移動</li>
          <li>• 空白エリアドラッグ: キャンバスをパン</li>
          <li>• Ctrl/Cmd + マウスホイール: ズーム</li>
          <li>• Ctrl/Cmd + A: 全選択</li>
          <li>• Ctrl/Cmd + C: コピー</li>
          <li>• Ctrl/Cmd + V: ペースト</li>
          <li>• Ctrl/Cmd + D: 複製</li>
          <li>• Ctrl/Cmd + Z: 元に戻す</li>
          <li>• Ctrl/Cmd + Y / Ctrl/Cmd + Shift + Z: やり直し</li>
          <li>• Delete/Backspace: 削除</li>
          <li>• Ctrl/Cmd + 0: キャンバスリセット</li>
          <li>• Ctrl/Cmd + +: ズームイン</li>
          <li>• Ctrl/Cmd + -: ズームアウト</li>
          <li>• G: グリッド表示切り替え</li>
          <li>• Shift + G: グリッドスナップ切り替え</li>
          <li>• Ctrl/Cmd + E: エクスポートダイアログ</li>
          <li>• ? または /: キーボードショートカットヘルプ</li>
          <li>• コンポーネントホバー: 接続ポイント表示</li>
          <li>• 接続ポイントドラッグ: コンポーネント間の接続線作成</li>
          <li>• 接続線クリック: 接続線選択</li>
          <li>• 接続線ダブルクリック: ラベル編集</li>
          <li>• 接続線右クリック: コンテキストメニュー</li>
          <li>• Ctrl/Cmd + 接続線クリック: 複数接続線選択</li>
          <li>• 右上のグリッドボタン: グリッド表示/非表示</li>
          <li>• 右上のスナップボタン: スナップ機能オン/オフ</li>
          <li>• 右上のエクスポートボタン: PNG/SVG/PDF形式でエクスポート</li>
          <li>• 右上のヘルプボタン: キーボードショートカット一覧</li>
        </ul>
        
        <h3 className="font-medium mt-4 mb-2">実装済み機能:</h3>
        <ul className="space-y-1">
          <li>• ✅ コンポーネントベースシステム</li>
          <li>• ✅ ドラッグ&ドロップでコンポーネント配置</li>
          <li>• ✅ 単一・複数選択システム</li>
          <li>• ✅ 範囲選択（ドラッグ選択）</li>
          <li>• ✅ 選択境界表示</li>
          <li>• ✅ キーボードショートカット（包括的システム）</li>
          <li>• ✅ ショートカットヘルプダイアログ（?キー）</li>
          <li>• ✅ コンポーネント削除・複製</li>
          <li>• ✅ テキスト編集（ダブルクリック・F2キー）</li>
          <li>• ✅ インライン編集（Enter保存・Escape取消）</li>
          <li>• ✅ コンポーネント移動（単一・複数同時）</li>
          <li>• ✅ 矢印キーでの移動（Shift+矢印で大きく移動）</li>
          <li>• ✅ コピー&ペースト（Ctrl/Cmd+C, Ctrl/Cmd+V）</li>
          <li>• ✅ スムーズなドラッグ操作</li>
          <li>• ✅ 自動グリッドスナップ</li>
          <li>• ✅ 接続ポイント表示</li>
          <li>• ✅ 接続ポイントホバー効果</li>
          <li>• ✅ コンポーネント間の接続線作成</li>
          <li>• ✅ 接続線の選択・削除</li>
          <li>• ✅ 接続線のラベル編集</li>
          <li>• ✅ 接続線のコンテキストメニュー</li>
          <li>• ✅ 接続線のスタイル変更</li>
          <li>• ✅ 接続線の複製</li>
          <li>• ✅ 接続線のビジュアル表示</li>
          <li>• ✅ 一時的な接続線表示</li>
          <li>• ✅ 接続バリデーション</li>
          <li>• ✅ コンポーネントレジストリ</li>
          <li>• ✅ プロパティパネル</li>
          <li>• ✅ エクスポート機能（PNG/SVG/PDF）</li>
          <li>• 💡 コンポーネント数: {components.length}個</li>
          <li>• 💡 接続線数: {connections.length}個</li>
          <li>• 💡 選択中コンポーネント: {selectedComponentIds.length}個</li>
          <li>• 💡 選択中接続線: {selectedConnectionIds.length}個</li>
        </ul>
        
        <h3 className="font-medium mt-4 mb-2">次の実装予定:</h3>
        <ul className="space-y-1">
          <li>• 🔄 データ移行システム</li>
          <li>• 🔄 バックエンド統合</li>
        </ul>
      </div>
    </div>
  );
}