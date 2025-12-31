/**
 * Flow Editing Page (Screen ③)
 * Figma-like flow editor with canvas-based interface
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CanvasTest } from '@/components/flow';
import FlowEditorLayout from '@/components/flow/FlowEditorLayout';
import ComponentSidebar from '@/components/flow/ComponentSidebar';
import { useUndo } from '@/hooks/useUndo';
import { flowApi } from '@/lib/api';
import { DraggedComponent } from '@/types/flowComponents';
import { ComponentFactory } from '@/utils/componentRegistry';

interface FlowPageProps {
  params: {
    id: string;
  };
}

export default function FlowPage({ params }: FlowPageProps) {
  const projectId = parseInt(params.id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [propertiesPanelVisible, setPropertiesPanelVisible] = useState(false);
  const [draggedComponent, setDraggedComponent] = useState<DraggedComponent | null>(null);
  const [generatedFlowData, setGeneratedFlowData] = useState<{ 
    components: any[]; 
    connections: any[];
    timestamp?: number;
  } | null>(null);
  
  // Handle actors/steps loaded from autosave - REMOVED
  
  const { 
    lastOperation, 
    isUndoing, 
    performUndo, 
    canUndo 
  } = useUndo();

  // Load existing flow data on component mount
  useEffect(() => {
    console.log('=== FLOW PAGE: useEffect triggered ===');
    console.log('Project ID:', projectId);
    
    const loadExistingFlow = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // First, check if there's freshly generated data from other pages
        const sessionKey = `flow-generated-${projectId}`;
        const sessionData = sessionStorage.getItem(sessionKey);
        
        if (sessionData) {
          console.log('=== FOUND FRESH GENERATED DATA IN SESSION ===');
          try {
            const parsedSessionData = JSON.parse(sessionData);
            console.log('Session data:', parsedSessionData);
            
            // IMMEDIATELY clear the session data so it's only used once
            sessionStorage.removeItem(sessionKey);
            console.log('Cleared session data to prevent future conflicts');
            
            // Convert the flow nodes to canvas components using the same logic as button #3
            const canvasComponents = convertNodesToCanvasComponents(
              parsedSessionData.flow_nodes
            );
            const canvasConnections = generateConnectionsFromNodes(canvasComponents);
            
            if (canvasComponents.length === 0) {
              console.error('❌ Canvas components array is empty!');
              setError('フロー図のコンポーネント変換に失敗しました。開発者にお問い合わせください。');
              return;
            }
            
            // Set the generated flow data using the same structure as button #3
            setGeneratedFlowData({
              components: canvasComponents,
              connections: canvasConnections,
              timestamp: Date.now()
            });
            
            // Trigger refresh
            setRefreshKey(prev => prev + 1);
            setSuccessMessage(`${parsedSessionData.flow_nodes.length}ステップのフローを正常に生成しました`);
            setTimeout(() => setSuccessMessage(null), 5000);
            
            console.log('✅ Fresh generated data loaded successfully');
            return;
          } catch (err) {
            console.error('Failed to parse session data:', err);
            sessionStorage.removeItem(sessionKey);
          }
        }
        
        // If no session data, load existing flow nodes from database OR autosave
        console.log('No session data found, checking autosave and database...');
        
        // Check autosave first (prioritize user edits)
        const autosaveKey = `flow-autosave-${projectId}`;
        const autosaveData = localStorage.getItem(autosaveKey);
        
        if (autosaveData) {
          try {
            const parsed = JSON.parse(autosaveData);
            if (parsed?.components && parsed.components.length > 0) {
              console.log('Found autosaved data with', parsed.components.length, 'components');
              setGeneratedFlowData({
                components: parsed.components,
                connections: parsed.connections || [],
                timestamp: parsed.timestamp || Date.now()
              });
              setRefreshKey(prev => prev + 1);
              console.log('✅ Loaded autosaved data');
              return;
            }
          } catch (err) {
            console.error('Failed to parse autosave data:', err);
          }
        }
        
        // Finally, try to load from database
        const existingNodes = await flowApi.getFlowNodes(projectId);
        
        if (existingNodes && existingNodes.length > 0) {
          // Convert existing nodes to canvas components (without actors/steps since they're not stored with existing nodes)
          const canvasComponents = convertNodesToCanvasComponents(existingNodes);
          const canvasConnections = generateConnectionsFromNodes(canvasComponents);
          
          if (canvasComponents.length === 0) {
            console.error('❌ Canvas components array is empty!');
            setError('フロー図のコンポーネント変換に失敗しました。開発者にお問い合わせください。');
            return;
          }
          
          // For existing nodes, convert to canvas components
          setGeneratedFlowData({
            components: canvasComponents,
            connections: canvasConnections,
            timestamp: Date.now()
          });
          
          console.log('✅ Generated flow data set successfully');
          console.log('Loaded existing flow data:', { components: canvasComponents.length, connections: canvasConnections.length });
        } else {
          console.log('No existing nodes found');
          // Auto-trigger generation for testing to restore functionality
          console.log('Auto-triggering flow generation to restore data...');
          setTimeout(() => {
            handleGenerateFlow();
          }, 1000);
        }
      } catch (err) {
        console.error('Failed to load existing flow:', err);
        // Don't show error for missing flow data, it's normal for new projects
        if (err instanceof Error && !err.message.includes('404')) {
          setError('既存のフローデータの読み込みに失敗しました');
        }
        
        // Auto-trigger flow generation to restore functionality
        console.log('Auto-triggering flow generation after error to restore data...');
        setTimeout(() => {
          handleGenerateFlow();
        }, 1000);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadExistingFlow();
    }
  }, [projectId]);

  // Add keyboard shortcut for undo (Ctrl+Z / Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          performUndo().catch(console.error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, performUndo]);

  const handleComponentDragStart = (component: DraggedComponent) => {
    setDraggedComponent(component);
    console.log('Component drag started:', component.template.name);
  };

  const handleComponentDragEnd = () => {
    setDraggedComponent(null);
    console.log('Component drag ended');
  };

  const handleUndo = async () => {
    try {
      await performUndo();
    } catch (error) {
      console.error('Failed to undo operation:', error);
      // Could show a toast notification here
    }
  };

  const handleGenerateFlow = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setSuccessMessage(null);
      
      const flowResponse = await flowApi.generateFlow(projectId);
      
      console.log('=== FLOW GENERATION RESPONSE ===');
      console.log('Full response:', flowResponse);
      console.log('Flow nodes:', flowResponse.flow_nodes);
      console.log('Actors:', flowResponse.actors);
      console.log('Steps:', flowResponse.steps);
      
      // Check if we have valid data
      if (!flowResponse.flow_nodes || flowResponse.flow_nodes.length === 0) {
        setError('フロー図の生成に成功しましたが、データが空でした。ヒアリングログの内容を確認してください。');
        return;
      }
      
      // Convert generated nodes to canvas components
      const canvasComponents = convertNodesToCanvasComponents(flowResponse.flow_nodes);
      const canvasConnections = generateConnectionsFromNodes(canvasComponents);
      
      console.log('=== CONVERTED COMPONENTS ===');
      console.log('Canvas components:', canvasComponents);
      console.log('Canvas connections:', canvasConnections);
      
      // Check if conversion was successful
      if (!canvasComponents || canvasComponents.length === 0) {
        setError('フロー図のコンポーネント変換に失敗しました。開発者にお問い合わせください。');
        return;
      }
      
      // Set the generated flow data for canvas
      setGeneratedFlowData({
        components: canvasComponents,
        connections: canvasConnections,
        timestamp: Date.now()
      });
      
      // Trigger refresh of Canvas component
      setRefreshKey(prev => prev + 1);
      setSuccessMessage(`${flowResponse.flow_nodes.length}ステップのフローを正常に生成しました`);
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Failed to generate flow:', err);
      setError('フロー図の生成に失敗しました。ヒアリングログがあることを確認して再度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert legacy flow nodes to canvas components
  const convertNodesToCanvasComponents = (nodes: any[]) => {
    console.log('=== CONVERT NODES TO CANVAS COMPONENTS ===');
    console.log('Input nodes:', nodes);
    console.log('Nodes length:', nodes?.length);
    console.log('Nodes type:', typeof nodes);
    console.log('Is nodes array?', Array.isArray(nodes));
    
    // Test ComponentFactory directly
    console.log('=== TESTING COMPONENT FACTORY ===');
    try {
      const testComponent = ComponentFactory.createByType('start', { x: 100, y: 100 }, { text: 'Test' });
      console.log('ComponentFactory test result:', testComponent);
      if (testComponent) {
        console.log('✅ ComponentFactory is working');
      } else {
        console.log('❌ ComponentFactory returned null');
      }
    } catch (error) {
      console.error('❌ ComponentFactory error:', error);
    }
    
    if (!nodes || !Array.isArray(nodes)) {
      console.error('Nodes is not a valid array:', nodes);
      return [];
    }
    
    if (nodes.length === 0) {
      console.warn('Nodes array is empty');
      return [];
    }
    
    // TEMPORARY: Create simple test components instead of using ComponentFactory
    console.log('=== CREATING SIMPLE TEST COMPONENTS ===');
    const components = nodes.map((node, index) => {
      const componentType = index === 0 ? 'start' : 
                           index === nodes.length - 1 ? 'end' : 'process';
      
      const spacing = 350;
      const startX = 100;
      const startY = 100;
      const position = { x: startX + (index * spacing), y: startY };
      
      // Create a simple component manually for testing
      const simpleComponent: any = {
        id: `test-${componentType}-${index}`,
        type: componentType,
        position,
        size: { width: 160, height: 80 },
        text: node.text || `ステップ ${node.order}`,
        style: {
          backgroundColor: '#4f46e5',
          borderColor: '#3730a3',
          textColor: '#ffffff',
          borderWidth: 2,
          borderRadius: 8,
        },
        connectionPoints: [
          { id: `test-${componentType}-${index}-top`, position: 'top', offset: 0.5, type: 'input' },
          { id: `test-${componentType}-${index}-right`, position: 'right', offset: 0.5, type: 'output' },
          { id: `test-${componentType}-${index}-bottom`, position: 'bottom', offset: 0.5, type: 'output' },
          { id: `test-${componentType}-${index}-left`, position: 'left', offset: 0.5, type: 'input' },
        ],
        zIndex: 0,
        locked: false,
        visible: true,
        metadata: {},
      };
      
      // Add actor and step metadata - REMOVED
      
      console.log(`Created simple component ${index}:`, simpleComponent);
      return simpleComponent;
    });
    
    console.log('=== CONVERSION COMPLETE ===');
    console.log('Generated components count:', components.length);
    console.log('Generated components:', components);
    return components;
  };

  // Generate connections between sequential components
  const generateConnectionsFromNodes = (components: any[]) => {
    const connections = [];
    
    for (let i = 0; i < components.length - 1; i++) {
      const fromComponent = components[i];
      const toComponent = components[i + 1];
      
      if (fromComponent && toComponent) {
        connections.push({
          id: `connection-${i}`,
          from: {
            componentId: fromComponent.id,
            pointId: fromComponent.connectionPoints.find((cp: any) => cp.type === 'output')?.id || fromComponent.connectionPoints[0]?.id
          },
          to: {
            componentId: toComponent.id,
            pointId: toComponent.connectionPoints.find((cp: any) => cp.type === 'input')?.id || toComponent.connectionPoints[0]?.id
          },
          label: '',
          style: 'solid'
        });
      }
    }
    
    return connections;
  };

  // Toolbar content
  const toolbar = (
    <div className="flex items-center justify-between w-full min-h-0">
      <div className="flex items-center space-x-4 min-w-0 flex-1">
        <div className="min-w-0 flex-shrink">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            AI Business Flow - フロー図エディター
          </h1>
          <p className="text-sm text-gray-600 hidden sm:block truncate">
            Figma風のビジュアルフローエディター
          </p>
        </div>

        {/* Properties Panel Toggle */}
        <button
          onClick={() => setPropertiesPanelVisible(!propertiesPanelVisible)}
          className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 flex-shrink-0 ${
            propertiesPanelVisible
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="プロパティパネルを切り替え"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          <span className="hidden md:inline whitespace-nowrap">プロパティ</span>
        </button>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
        <button 
          onClick={handleUndo}
          disabled={!canUndo}
          className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 flex-shrink-0 ${
            canUndo
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={canUndo ? `元に戻す: ${lastOperation?.description}` : '元に戻すアクションがありません'}
        >
          {isUndoing ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              <span className="hidden lg:inline whitespace-nowrap">元に戻し中...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="hidden lg:inline whitespace-nowrap">元に戻す</span>
            </>
          )}
        </button>
        
        <button 
          onClick={handleGenerateFlow}
          disabled={isGenerating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              <span className="hidden lg:inline whitespace-nowrap">作成中...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden lg:inline whitespace-nowrap">フロー図を作成</span>
            </>
          )}
        </button>
        
        <button 
          onClick={() => {
            if (projectId) {
              const autosaveKey = `flow-autosave-${projectId}`;
              localStorage.removeItem(autosaveKey);
              console.log('Cleared autosave data');
              // Clear current state
              setGeneratedFlowData(null);
              setRefreshKey(prev => prev + 1);
              setSuccessMessage('オートセーブデータをクリアしました。新しいフロー図を作成してください。');
              setTimeout(() => setSuccessMessage(null), 3000);
            }
          }}
          className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center space-x-2 flex-shrink-0"
          title="古いデータをクリアして新しいフロー図を作成"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden lg:inline whitespace-nowrap">リセット</span>
        </button>
      </div>
    </div>
  );

  // Sidebar content
  const sidebar = (
    <ComponentSidebar 
      collapsed={sidebarCollapsed}
      onDragStart={handleComponentDragStart}
      onDragEnd={handleComponentDragEnd}
    />
  );

  // Canvas content
  const canvas = (
    <div className="flex-1 flex flex-col">
      {/* Error/Success Messages */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mx-4 mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mx-4 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
            <p className="text-blue-700 text-sm">フローデータを読み込み中...</p>
          </div>
        </div>
      )}

      {/* Canvas Interface */}
      <div className="flex-1 p-4">
        <div className="h-full">
          <CanvasTest 
            key={refreshKey}
            showPropertiesPanel={propertiesPanelVisible}
            onPropertiesPanelToggle={() => setPropertiesPanelVisible(!propertiesPanelVisible)}
            projectName={`project-${projectId}`}
            projectId={projectId}
            onUndo={handleUndo}
            onRedo={() => {}} // TODO: Implement redo functionality
            canUndo={canUndo}
            canRedo={false} // TODO: Implement redo functionality
            generatedFlowData={generatedFlowData}
            onFlowGenerated={(components, connections) => {
              console.log('Flow generated callback called with:', components.length, 'components');
              // Don't clear generatedFlowData immediately - let it persist for rendering
            }}
            draggedComponent={draggedComponent}
            onComponentDragEnd={handleComponentDragEnd}
          />
        </div>
      </div>
    </div>
  );

  // Status bar content
  const statusBar = (
    <div className="flex items-center justify-between w-full min-h-0">
      <div className="flex items-center space-x-4 min-w-0 flex-1">
        <span className="truncate text-xs">すべての変更は自動的に保存されます</span>
        {lastOperation && (
          <span className="text-blue-600 truncate hidden lg:inline text-xs">
            最後のアクション: {lastOperation.description} • Ctrl+Zで元に戻す
          </span>
        )}
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
        <span className="text-xs whitespace-nowrap">ID: {projectId}</span>
      </div>
    </div>
  );

  return (
    <FlowEditorLayout
      toolbar={toolbar}
      sidebar={sidebar}
      canvas={canvas}
      statusBar={statusBar}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarToggle={setSidebarCollapsed}
    />
  );
}