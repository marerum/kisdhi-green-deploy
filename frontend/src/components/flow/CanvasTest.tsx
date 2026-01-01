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
  generatedFlowData?: { 
    components: FlowComponentData[]; 
    connections: Connection[];
    timestamp?: number;
  } | null;
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

  // Debug components state changes
  React.useEffect(() => {
    // Silent monitoring - no logs
  }, [components]);

  // Handle generated flow data - SIMPLIFIED VERSION
  React.useEffect(() => {
    // If new generatedFlowData is provided, use it immediately (prioritize over autosave)
    if (generatedFlowData) {
      if (!generatedFlowData.components || generatedFlowData.components.length === 0) {
        return;
      }
      
      setComponents(generatedFlowData.components);
      setConnections(generatedFlowData.connections);
      setSelectedComponentIds([]);
      setSelectedConnectionIds([]);
      
      // Notify parent that flow has been generated
      if (onFlowGenerated) {
        onFlowGenerated(generatedFlowData.components, generatedFlowData.connections);
      }
      
      return; // Skip autosave check when we have new generated data
    }
  }, [generatedFlowData, onFlowGenerated]);

  // Separate effect for autosave loading - only runs once when projectId changes
  React.useEffect(() => {
    // Skip autosave loading if we already have generated data
    if (generatedFlowData) {
      return;
    }
    
    // Only check autosave if no new generatedFlowData is provided
    try {
      if (projectId) {
        const key = `flow-autosave-${projectId}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.components) {
            setComponents(parsed.components);
            setConnections(parsed.connections || []);
            setSelectedComponentIds([]);
            setSelectedConnectionIds([]);
            
            // Notify parent that flow has been loaded
            if (onFlowGenerated) onFlowGenerated(parsed.components, parsed.connections || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load autosave:', err);
    }
  }, [projectId]); // 依存配列からcomponents.lengthを削除

  // Auto-save components + connections to localStorage (debounced) using useAutoSave
  const saveKey = projectId ? `flow-autosave-${projectId}` : null;
  const saveFunction = async (data: { components: FlowComponentData[]; connections: Connection[] }) => {
    if (!saveKey) return;
    try {
      const dataWithTimestamp = {
        ...data,
        timestamp: Date.now()
      };
      localStorage.setItem(saveKey, JSON.stringify(dataWithTimestamp));
    } catch (err) {
      console.error('Failed to autosave to localStorage:', err);
      throw err as Error;
    }
  };

  const { save: autoSave, isLoading: isAutoSaving } = useAutoSave<{ components: FlowComponentData[]; connections: Connection[] }>({
    saveFunction,
    delay: 100, // 遅延を1秒から100msに短縮
    onError: (e) => console.error('Autosave error', e),
  });

  // Trigger autosave when components or connections change
  React.useEffect(() => {
    if (!saveKey) return;
    
    // Always autosave, even if components array is empty (to preserve empty state)
    autoSave({ 
      components, 
      connections
    });
  }, [components, connections, autoSave, saveKey]);

  const handleCanvasReady = (canvasRef: SVGSVGElement) => {
    // Canvas ready - no logging needed
  };

  const handleComponentsChange = useCallback((newComponents: FlowComponentData[]) => {
    setComponents(newComponents);
    
    // 即座に保存を実行（debounceをバイパス）
    if (saveKey) {
      const dataWithTimestamp = {
        components: newComponents,
        connections,
        timestamp: Date.now()
      };
      try {
        localStorage.setItem(saveKey, JSON.stringify(dataWithTimestamp));
      } catch (err) {
        console.error('❌ Failed to immediately save:', err);
      }
    }
  }, [components, connections, saveKey]);

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
            if (projectId) {
              const key = `flow-autosave-${projectId}`;
              localStorage.removeItem(key);
              console.log('Cleared autosave for project', projectId);
              setComponents([]);
              setConnections([]);
              alert('オートセーブデータをクリアしました。');
            }
          }}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          オートセーブクリア
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
          <li>• ダブルクリック: テキスト編集</li>
          <li>• 空白エリアドラッグ: キャンバスをパン</li>
          <li>• Ctrl/Cmd + マウスホイール: ズーム</li>
          <li>• Delete/Backspace: 削除</li>
          <li>• 💡 コンポーネント数: {components.length}個</li>
          <li>• 💡 接続線数: {connections.length}個</li>
          <li>• 💡 選択中コンポーネント: {selectedComponentIds.length}個</li>
          <li>• 💡 選択中接続線: {selectedConnectionIds.length}個</li>
        </ul>
      </div>
    </div>
  );
}