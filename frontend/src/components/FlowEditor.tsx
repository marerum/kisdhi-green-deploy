'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { convertToReactFlow, convertFromReactFlow, FlowData, isValidFlowData } from '@/utils/flowConverter';
import { nodeTypes } from './flow/CustomNodes';

interface FlowEditorProps {
  flowData: FlowData | null;
  onSave?: (flowData: FlowData) => void;
  readOnly?: boolean;
}

export default function FlowEditor({ flowData, onSave, readOnly = false }: FlowEditorProps) {
  const [nodes, setNodes, onNodesState] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // flowDataが更新されたらReactFlow形式に変換
  useEffect(() => {
    if (flowData && isValidFlowData(flowData)) {
      const { nodes: convertedNodes, edges: convertedEdges } = convertToReactFlow(flowData);
      setNodes(convertedNodes);
      setEdges(convertedEdges);
      
      // 位置情報がない（新規生成されたフロー）場合は保存ボタンを有効化
      const hasPositions = flowData.flow_nodes.some(
        node => node.position_x !== undefined && node.position_y !== undefined
      );
      setHasChanges(!hasPositions);
    } else {
      console.warn('Invalid or missing flow data:', flowData);
      setNodes([]);
      setEdges([]);
    }
  }, [flowData, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      setEdges((eds) => addEdge({ 
        ...connection, 
        type: 'smoothstep',
      }, eds));
      setHasChanges(true);
    },
    [readOnly, setEdges]
  );

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesState(changes);
      if (!readOnly && changes.some((c: any) => c.type === 'position' && !c.dragging)) {
        setHasChanges(true);
      }
    },
    [readOnly, onNodesState]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      if (!readOnly) {
        setHasChanges(true);
      }
    },
    [readOnly, onEdgesChange]
  );

  const handleSave = useCallback(() => {
    if (!flowData || !onSave || !isValidFlowData(flowData)) return;

    const updatedFlowData = convertFromReactFlow(nodes, edges, flowData.actors);
    onSave(updatedFlowData);
    setHasChanges(false);
  }, [nodes, edges, flowData, onSave]);

  const handleResetLayout = useCallback(() => {
    if (!flowData || !isValidFlowData(flowData)) return;
    const { nodes: convertedNodes, edges: convertedEdges } = convertToReactFlow(flowData);
    setNodes(convertedNodes);
    setEdges(convertedEdges);
    setHasChanges(true);
  }, [flowData, setNodes, setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');
      
      if (!data) return;

      const { type, label } = JSON.parse(data);
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label },
      };

      setNodes((nds) => nds.concat(newNode));
      setHasChanges(true);
    },
    [reactFlowInstance, setNodes]
  );

  if (!flowData) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">フローデータがありません</p>
      </div>
    );
  }

  if (!isValidFlowData(flowData)) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-lg border-2 border-dashed border-red-300">
        <div className="text-center p-4">
          <p className="text-red-700 font-medium mb-2">無効なフローデータ形式</p>
          <p className="text-red-600 text-sm">データ構造を確認してください</p>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
              デバッグ情報を表示
            </summary>
            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(flowData, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">表示可能なノードがありません</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#64748b', strokeWidth: 2 },
        }}
        fitView
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap />
        
        {!readOnly && (
          <Panel position="top-right" className="bg-white p-2 rounded-lg shadow-md space-x-2">
            <button
              onClick={handleResetLayout}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
            >
              レイアウトをリセット
            </button>
            {onSave && (
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  hasChanges
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {hasChanges ? '保存する' : '保存済み'}
              </button>
            )}
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}