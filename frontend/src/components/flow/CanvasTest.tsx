/**
 * CanvasTest Component
 * Test component for the new FlowCanvas with component system integration
 */

'use client';

import React, { useState, useCallback } from 'react';
import FlowCanvas from './FlowCanvas';
import { useAutoSave } from '@/hooks/useAutoSave';
import { FlowComponentData, Connection, DraggedComponent } from '@/types/flowComponents';
import { UndoOperation } from '@/hooks/useUndo';

export interface CanvasTestProps {
  showPropertiesPanel?: boolean;
  onPropertiesPanelToggle?: () => void;
  projectName?: string;
  projectId?: number | null;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  recordOperation?: (operation: UndoOperation) => void;
  onFlowGenerated?: (components: FlowComponentData[], connections: Connection[]) => void;
  generatedFlowData?: { 
    components: FlowComponentData[]; 
    connections: Connection[];
    timestamp?: number;
  } | null;
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
  recordOperation,
  onFlowGenerated,
  generatedFlowData,
  projectId = null,
}: CanvasTestProps) {
  const [components, setComponents] = useState<FlowComponentData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  
  // Track drag state to prevent recording undo operations during drag
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartComponents, setDragStartComponents] = useState<FlowComponentData[]>([]);

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

  const { save: autoSave } = useAutoSave<{ components: FlowComponentData[]; connections: Connection[] }>({
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

  const handleCanvasReady = () => {
    // Canvas ready - no logging needed
  };

  const handleComponentsChange = useCallback((newComponents: FlowComponentData[]) => {
    // Skip if components are identical (avoid unnecessary undo operations)
    if (JSON.stringify(components) === JSON.stringify(newComponents)) {
      return;
    }
    
    // Record undo operation before making changes (only if recordOperation is available and not dragging)
    if (recordOperation && components.length > 0 && !isDragging) {
      const previousComponents = JSON.parse(JSON.stringify(components)); // Deep copy
      
      recordOperation({
        type: 'update',
        description: `コンポーネントの変更 (${previousComponents.length} → ${newComponents.length})`,
        undo: async () => {
          setComponents(previousComponents);
          
          // Also update localStorage immediately
          if (saveKey) {
            const dataWithTimestamp = {
              components: previousComponents,
              connections,
              timestamp: Date.now()
            };
            try {
              localStorage.setItem(saveKey, JSON.stringify(dataWithTimestamp));
            } catch (err) {
              console.error('Failed to save undo state:', err);
            }
          }
        }
      });
    }
    
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
        console.error('Failed to immediately save:', err);
      }
    }
  }, [components, connections, saveKey, recordOperation, isDragging]);

  const handleConnectionsChange = useCallback((newConnections: Connection[]) => {
    setConnections(newConnections);
  }, []);

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedComponentIds(selectedIds);
  }, []);

  const handleConnectionSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedConnectionIds(selectedIds);
  }, []);

  // Handle drag start - record initial state and set dragging flag
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setDragStartComponents(JSON.parse(JSON.stringify(components))); // Deep copy
  }, [components]);

  // Handle drag end - record undo operation for the entire drag
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    
    // Record undo operation for the entire drag operation
    if (recordOperation && dragStartComponents.length > 0) {
      const finalComponents = JSON.parse(JSON.stringify(components)); // Deep copy
      const startComponents = dragStartComponents;
      
      // Check if anything actually changed
      const hasChanged = JSON.stringify(startComponents) !== JSON.stringify(finalComponents);
      
      if (hasChanged) {
        recordOperation({
          type: 'update',
          description: 'ドラッグ操作',
          undo: async () => {
            setComponents(startComponents);
            
            // Also update localStorage immediately
            if (saveKey) {
              const dataWithTimestamp = {
                components: startComponents,
                connections,
                timestamp: Date.now()
              };
              try {
                localStorage.setItem(saveKey, JSON.stringify(dataWithTimestamp));
              } catch (err) {
                console.error('Failed to save drag undo state:', err);
              }
            }
          }
        });
      }
    }
    
    // Clear drag start components
    setDragStartComponents([]);
  }, [components, dragStartComponents, recordOperation, connections, saveKey]);



  return (
    <div className="p-8">
      {/* Canvas Interface */}
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
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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