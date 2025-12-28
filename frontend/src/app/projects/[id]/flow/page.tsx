/**
 * Flow Editing Page (Screen ③)
 * Figma-like flow editor with canvas-based interface
 */

'use client';

import React, { useEffect, useState } from 'react';
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
  const [generatedFlowData, setGeneratedFlowData] = useState<{ components: any[]; connections: any[] } | null>(null);
  const [fitToContentFn, setFitToContentFn] = useState<((components?: any[] | null) => void) | null>(null);
  
  const { 
    lastOperation, 
    isUndoing, 
    recordOperation, 
    performUndo, 
    canUndo 
  } = useUndo();

  // Load existing flow data on component mount
  useEffect(() => {
    const loadExistingFlow = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const existingNodes = await flowApi.getFlowNodes(projectId);
        
        if (existingNodes && existingNodes.length > 0) {
          // Convert existing nodes to canvas components
          const canvasComponents = convertNodesToCanvasComponents(existingNodes);
          const canvasConnections = generateConnectionsFromNodes(canvasComponents);
          
          setGeneratedFlowData({
            components: canvasComponents,
            connections: canvasConnections
          });
          
          console.log('Loaded existing flow data:', { components: canvasComponents.length, connections: canvasConnections.length });
        }
      } catch (err) {
        console.error('Failed to load existing flow:', err);
        // Don't show error for missing flow data, it's normal for new projects
        if (err instanceof Error && !err.message.includes('404')) {
          setError('既存のフローデータの読み込みに失敗しました');
        }
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

  const handleComponentDragStart = (component: DraggedComponent, event: React.DragEvent) => {
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
      const generatedNodes = await flowApi.generateFlow(projectId);
      
      // Convert generated nodes to canvas components
      const canvasComponents = convertNodesToCanvasComponents(generatedNodes);
      const canvasConnections = generateConnectionsFromNodes(canvasComponents);
      
      // Set the generated flow data for canvas
      setGeneratedFlowData({
        components: canvasComponents,
        connections: canvasConnections
      });
      
      // Trigger refresh of Canvas component
      setRefreshKey(prev => prev + 1);
      setSuccessMessage(`${generatedNodes.length}ステップのフローを正常に生成しました`);
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
    console.log('Converting nodes to canvas components:', nodes);
    
    const components = nodes.map((node, index) => {
      const componentType = index === 0 ? 'start' : 
                           index === nodes.length - 1 ? 'end' : 'process';
      
      // Use larger spacing for better visibility
      const spacing = 350; // Increased from 300
      const startX = 100; // Reduced to start closer to left edge
      const startY = 100; // Reduced to start closer to top edge
      
      const position = { x: startX + (index * spacing), y: startY };
      console.log(`Component ${index}: type=${componentType}, position=`, position);
      
      const component = ComponentFactory.createByType(
        componentType,
        position,
        { text: node.text || `ステップ ${node.order}` }
      );
      
      // Ensure component has proper size information
      if (component) {
        console.log(`Created component with size:`, component.size);
      }
      
      return component;
    }).filter(Boolean);
    
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
            onFlowGenerated={() => setGeneratedFlowData(null)} // Clear after processing
            onFitToContent={(fn) => setFitToContentFn(() => fn)}
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