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
    canUndo,
    recordOperation 
  } = useUndo();

  // Load existing flow data on component mount
  useEffect(() => {
    const loadExistingFlow = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // First, check if there's freshly generated data from other pages
        const sessionKey = `flow-generated-${projectId}`;
        const sessionData = sessionStorage.getItem(sessionKey);
        
        if (sessionData) {
          try {
            const parsedSessionData = JSON.parse(sessionData);
            
            // IMMEDIATELY clear the session data so it's only used once
            sessionStorage.removeItem(sessionKey);
            
            // Convert the flow nodes to canvas components using the same logic as button #3
            const canvasComponents = convertNodesToCanvasComponents(parsedSessionData);
            const canvasConnections = generateConnectionsFromNodes(canvasComponents.filter(c => c.type === 'process'));
            
            if (canvasComponents.length === 0) {
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
            
            return;
          } catch (err) {
            console.error('Failed to parse session data:', err);
            sessionStorage.removeItem(sessionKey);
          }
        }
        
        // If no session data, load existing flow nodes from database OR autosave
        
        // Check autosave first (prioritize user edits)
        const autosaveKey = `flow-autosave-${projectId}`;
        const autosaveData = localStorage.getItem(autosaveKey);
        
        if (autosaveData) {
          try {
            const parsed = JSON.parse(autosaveData);
            if (parsed?.components && parsed.components.length > 0) {
              setGeneratedFlowData({
                components: parsed.components,
                connections: parsed.connections || [],
                timestamp: parsed.timestamp || Date.now()
              });
              setRefreshKey(prev => prev + 1);
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
          // For existing flows, we'll use a simple linear layout
          const canvasComponents = existingNodes.map((node: any, index: number) => {
            const componentType = index === 0 ? 'start' : 
                               index === existingNodes.length - 1 ? 'end' : 'process';
            
            const spacing = 350;
            const startX = 100;
            const startY = 100;
            const position = { x: startX + (index * spacing), y: startY };
            
            return {
              id: `existing-${componentType}-${index}`,
              type: componentType,
              position,
              size: { width: 160, height: 80 },
              text: node.text || `ステップ ${node.order + 1}`,
              style: {
                backgroundColor: '#4f46e5',
                borderColor: '#3730a3',
                textColor: '#ffffff',
                borderWidth: 2,
                borderRadius: 8,
              },
              connectionPoints: [
                { id: `existing-${componentType}-${index}-top`, position: 'top', offset: 0.5, type: 'input' },
                { id: `existing-${componentType}-${index}-right`, position: 'right', offset: 0.5, type: 'output' },
                { id: `existing-${componentType}-${index}-bottom`, position: 'bottom', offset: 0.5, type: 'output' },
                { id: `existing-${componentType}-${index}-left`, position: 'left', offset: 0.5, type: 'input' },
              ],
              zIndex: 0,
              locked: false,
              visible: true,
              metadata: {},
            };
          });
          
          const canvasConnections = generateConnectionsFromNodes(canvasComponents);
          
          if (canvasComponents.length === 0) {
            setError('フロー図のコンポーネント変換に失敗しました。開発者にお問い合わせください。');
            return;
          }
          
          // For existing nodes, convert to canvas components
          setGeneratedFlowData({
            components: canvasComponents,
            connections: canvasConnections,
            timestamp: Date.now()
          });
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
      
      // Check if we have valid data
      if (!flowResponse.flow_nodes || flowResponse.flow_nodes.length === 0) {
        setError('フロー図の生成に成功しましたが、データが空でした。ヒアリングログの内容を確認してください。');
        return;
      }
      
      // Convert generated nodes to canvas components
      const canvasComponents = convertNodesToCanvasComponents(flowResponse);
      const canvasConnections = generateConnectionsFromNodes(canvasComponents.filter(c => c.type === 'process'));
      
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
      
      // Save to session storage for page transitions
      const sessionKey = `flow-generated-${projectId}`;
      const sessionData = {
        actors: flowResponse.actors || [],
        steps: flowResponse.steps || [],
        flow_nodes: flowResponse.flow_nodes || [],
        timestamp: Date.now()
      };
      sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
      
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

  // Convert legacy flow nodes to canvas components with swimlane layout
  const convertNodesToCanvasComponents = (flowResponse: any) => {
    let { actors = [], steps = [], flow_nodes = [] } = flowResponse;
    
    if (!Array.isArray(flow_nodes) || flow_nodes.length === 0) {
      console.error('No flow nodes found');
      return [];
    }
    
    // If actors or steps are missing/empty, extract them from flow_nodes
    if (!Array.isArray(actors) || actors.length === 0) {
      const uniqueActors = [...new Set(flow_nodes.map((node: any) => node.actor).filter(Boolean))];
      actors = uniqueActors.map((actorName: string, index: number) => ({
        name: actorName,
        role: `役割${index + 1}`
      }));
    }
    
    if (!Array.isArray(steps) || steps.length === 0) {
      const uniqueSteps = [...new Set(flow_nodes.map((node: any) => node.step).filter(Boolean))];
      steps = uniqueSteps.map((stepName: string, index: number) => ({
        name: stepName,
        description: `ステップ${index + 1}の説明`
      }));
    }
    
    // スイムレーンのレイアウト設定（改良版）
    const ACTOR_LANE_WIDTH = 180;  // 登場人物レーンの幅を拡大
    const STEP_LANE_HEIGHT = 80;   // ステップレーンの高さを拡大
    const CELL_WIDTH = 250;        // セル幅を拡大
    const CELL_HEIGHT = 150;       // セル高さを拡大
    const START_X = 200;           // 開始X位置
    const START_Y = 100;           // 開始Y位置
    const MARGIN = 20;             // マージン
    
    // 各セルの最大ノード数を事前に計算
    const cellNodes: { [key: string]: any[] } = {};
    
    flow_nodes.forEach((node: any, nodeIndex: number) => {
      const actorIndex = actors.findIndex((actor: any) => actor.name === node.actor);
      const stepIndex = steps.findIndex((step: any) => step.name === node.step);
      
      if (actorIndex !== -1 && stepIndex !== -1) {
        const cellKey = `${actorIndex}-${stepIndex}`;
        if (!cellNodes[cellKey]) {
          cellNodes[cellKey] = [];
        }
        cellNodes[cellKey].push({ ...node, nodeIndex });
      }
    });
    
    const maxNodesInCell = Math.max(...Object.values(cellNodes).map(nodes => nodes.length), 1);
    const DYNAMIC_CELL_HEIGHT = Math.max(CELL_HEIGHT, 100 + (maxNodesInCell - 1) * 110);
    
    const components: any[] = [];
    
    // 1. まず各アクターが関係するノードの範囲を事前計算
    const actorNodeRanges: { minY: number; maxY: number; hasNodes: boolean }[] = [];
    
    actors.forEach((actor: any, actorIndex: number) => {
      let minNodeY = Infinity;
      let maxNodeY = -Infinity;
      let hasNodes = false;
      
      // このアクターが関係する全てのフローノードの位置を確認
      steps.forEach((_: any, stepIndex: number) => {
        const cellKey = `${actorIndex}-${stepIndex}`;
        if (cellNodes[cellKey] && cellNodes[cellKey].length > 0) {
          hasNodes = true;
          const cellX = START_X + (stepIndex * CELL_WIDTH);
          const cellY = START_Y + STEP_LANE_HEIGHT + MARGIN + (actorIndex * DYNAMIC_CELL_HEIGHT);
          
          cellNodes[cellKey].forEach((node: any, indexInCell: number) => {
            const nodeHeight = 85;
            const nodeSpacing = 20;
            
            let nodeY;
            if (cellNodes[cellKey].length === 1) {
              nodeY = cellY + (DYNAMIC_CELL_HEIGHT - nodeHeight) / 2;
            } else {
              const totalNodesHeight = cellNodes[cellKey].length * nodeHeight + (cellNodes[cellKey].length - 1) * nodeSpacing;
              const startY = cellY + (DYNAMIC_CELL_HEIGHT - totalNodesHeight) / 2;
              nodeY = startY + indexInCell * (nodeHeight + nodeSpacing);
            }
            
            minNodeY = Math.min(minNodeY, nodeY);
            maxNodeY = Math.max(maxNodeY, nodeY + nodeHeight);
          });
        }
      });
      
      actorNodeRanges.push({
        minY: hasNodes ? minNodeY : START_Y + STEP_LANE_HEIGHT + MARGIN + (actorIndex * DYNAMIC_CELL_HEIGHT),
        maxY: hasNodes ? maxNodeY : START_Y + STEP_LANE_HEIGHT + MARGIN + (actorIndex * DYNAMIC_CELL_HEIGHT) + 80,
        hasNodes
      });
    });
    
    // 2. 登場人物（Actor）コンポーネントを重ならないように配置
    let currentY = START_Y + STEP_LANE_HEIGHT + MARGIN;
    const ACTOR_MARGIN = 30; // 登場人物間のマージン
    
    actors.forEach((actor: any, actorIndex: number) => {
      const range = actorNodeRanges[actorIndex];
      
      // アクターの高さと位置を計算
      let actorHeight, actorY;
      if (range.hasNodes) {
        // ノードがある場合：ノード全体をカバーする高さ + 少しのマージン
        const nodeRangeHeight = range.maxY - range.minY;
        actorHeight = Math.max(60, nodeRangeHeight + 20);
        
        // 前のアクターとの重複を避けるため、currentYとノード位置の最大値を使用
        actorY = Math.max(currentY, range.minY - 10);
      } else {
        // ノードがない場合：デフォルトの高さ
        actorHeight = 80;
        actorY = currentY;
      }
      
      // 次のアクターの開始位置を更新（現在のアクターの終了位置 + マージン）
      currentY = actorY + actorHeight + ACTOR_MARGIN;
      
      const textLength = (actor.name || `登場人物${actorIndex + 1}`).length;
      const actorWidth = Math.max(120, Math.min(textLength * 12 + 40, ACTOR_LANE_WIDTH - 20));
      
      const actorComponent = {
        id: `actor-${actorIndex}`,
        type: 'actor',
        position: { 
          x: START_X - ACTOR_LANE_WIDTH + 60, // 登場人物をさらに右側に移動（40px → 80px）
          y: actorY
        },
        size: { width: actorWidth, height: actorHeight },
        text: actor.name || `登場人物${actorIndex + 1}`,
        style: {
          backgroundColor: '#8b5cf6',
          borderColor: '#7c3aed',
          textColor: '#ffffff',
          borderWidth: 2,
          borderRadius: 6,
        },
        connectionPoints: [
          { id: `actor-${actorIndex}-right`, position: 'right', offset: 0.5, type: 'both' },
          { id: `actor-${actorIndex}-left`, position: 'left', offset: 0.5, type: 'both' },
        ],
        zIndex: 0,
        locked: false,
        visible: true,
        metadata: { role: actor.role },
      };
      components.push(actorComponent);
    });
    
    // 2. まずフローノードの配置を事前計算して、各ステップの必要幅を決定
    const stepNodeRanges: { minX: number; maxX: number; hasNodes: boolean }[] = [];
    
    steps.forEach((step: any, stepIndex: number) => {
      let minNodeX = Infinity;
      let maxNodeX = -Infinity;
      let hasNodes = false;
      
      // このステップに関係する全てのフローノードの位置を確認
      actors.forEach((_: any, actorIndex: number) => {
        const cellKey = `${actorIndex}-${stepIndex}`;
        if (cellNodes[cellKey] && cellNodes[cellKey].length > 0) {
          hasNodes = true;
          const cellX = START_X + (stepIndex * CELL_WIDTH);
          const nodeWidth = 200;
          
          // ノードの左端と右端を計算
          const nodeX = cellX + (CELL_WIDTH - nodeWidth) / 2;
          minNodeX = Math.min(minNodeX, nodeX);
          maxNodeX = Math.max(maxNodeX, nodeX + nodeWidth);
        }
      });
      
      stepNodeRanges.push({
        minX: hasNodes ? minNodeX : START_X + (stepIndex * CELL_WIDTH),
        maxX: hasNodes ? maxNodeX : START_X + (stepIndex * CELL_WIDTH) + CELL_WIDTH,
        hasNodes
      });
    });
    
    // 3. ステップ（Step）コンポーネントを横に配置（ノードの幅に合わせて動的サイズ）
    // まず一番上の登場人物コンポーネントの上端位置を取得
    let topActorTopY = START_Y + STEP_LANE_HEIGHT + MARGIN; // デフォルト値
    if (components.length > 0) {
      const topActorComponent = components.find(c => c.id === 'actor-0');
      if (topActorComponent) {
        topActorTopY = topActorComponent.position.y;
      }
    }
    
    steps.forEach((step: any, stepIndex: number) => {
      const range = stepNodeRanges[stepIndex];
      
      // ステップの幅を、関係するノードの範囲に合わせて設定
      let stepWidth;
      if (range.hasNodes) {
        // ノードがある場合：ノードの範囲 + 少しのマージン
        const nodeRangeWidth = range.maxX - range.minX;
        const textLength = (step.name || `ステップ${stepIndex + 1}`).length;
        const minTextWidth = textLength * 12 + 40;
        stepWidth = Math.max(minTextWidth, nodeRangeWidth + 20);
      } else {
        // ノードがない場合：テキストベースの幅
        const textLength = (step.name || `ステップ${stepIndex + 1}`).length;
        stepWidth = Math.max(180, textLength * 12 + 40);
      }
      
      const stepHeight = 60;
      
      // ステップの位置を、関係するノードの中央に配置
      let stepX;
      if (range.hasNodes) {
        stepX = (range.minX + range.maxX) / 2 - stepWidth / 2;
      } else {
        stepX = START_X + (stepIndex * CELL_WIDTH) + (CELL_WIDTH - stepWidth) / 2;
      }
      
      // ステップのY位置を、下端が一番上の登場人物の上端に合うように設定
      const stepY = topActorTopY - stepHeight;
      
      const stepComponent = {
        id: `step-${stepIndex}`,
        type: 'step',
        position: { 
          x: stepX,
          y: stepY  // ステップの下端を一番上の登場人物の上端に合わせて配置
        },
        size: { width: stepWidth, height: stepHeight },
        text: step.name || `ステップ${stepIndex + 1}`,
        style: {
          backgroundColor: '#06b6d4',
          borderColor: '#0891b2',
          textColor: '#ffffff',
          borderWidth: 2,
          borderRadius: 6,
        },
        connectionPoints: [
          { id: `step-${stepIndex}-bottom`, position: 'bottom', offset: 0.5, type: 'both' },
          { id: `step-${stepIndex}-top`, position: 'top', offset: 0.5, type: 'both' },
        ],
        zIndex: 0,
        locked: false,
        visible: true,
        metadata: { description: step.description },
      };
      components.push(stepComponent);
    });
    
    // 4. フローノードを登場人物の実際の位置に合わせて配置
    // 各セルのノードを配置
    Object.entries(cellNodes).forEach(([cellKey, nodesInCell]) => {
      const [actorIndex, stepIndex] = cellKey.split('-').map(Number);
      const cellX = START_X + (stepIndex * CELL_WIDTH);
      
      // 登場人物の実際の位置と高さを取得
      const actorComponent = components.find(c => c.id === `actor-${actorIndex}`);
      let cellY, cellHeight;
      
      if (actorComponent) {
        // 登場人物コンポーネントが存在する場合、その位置と高さを使用
        cellY = actorComponent.position.y + 10; // 少しのマージン
        cellHeight = actorComponent.size.height - 20; // 上下のマージンを考慮
      } else {
        // フォールバック：従来の計算方法
        cellY = START_Y + STEP_LANE_HEIGHT + MARGIN + (actorIndex * DYNAMIC_CELL_HEIGHT);
        cellHeight = DYNAMIC_CELL_HEIGHT;
      }
      
      nodesInCell.forEach((node: any, indexInCell: number) => {
        const nodeWidth = 200;
        const nodeHeight = 85;
        const nodeSpacing = 20; // ノード間のスペース
        
        let x, y;
        
        if (nodesInCell.length === 1) {
          // セル内に1つだけの場合は中央配置
          x = cellX + (CELL_WIDTH - nodeWidth) / 2;
          y = cellY + (cellHeight - nodeHeight) / 2;
        } else {
          // セル内に複数ある場合は縦に等間隔で配置
          const totalNodesHeight = nodesInCell.length * nodeHeight + (nodesInCell.length - 1) * nodeSpacing;
          const startY = cellY + (cellHeight - totalNodesHeight) / 2;
          
          x = cellX + (CELL_WIDTH - nodeWidth) / 2;
          y = startY + indexInCell * (nodeHeight + nodeSpacing);
        }
        
        const flowComponent = {
          id: `flow-node-${node.nodeIndex}`,
          type: 'process',
          position: { x, y },
          size: { width: nodeWidth, height: nodeHeight },
          text: node.text || `ステップ ${node.order + 1}`,
          style: {
            backgroundColor: '#4f46e5',
            borderColor: '#3730a3',
            textColor: '#ffffff',
            borderWidth: 2,
            borderRadius: 8,
          },
          connectionPoints: [
            { id: `flow-node-${node.nodeIndex}-top`, position: 'top', offset: 0.5, type: 'input' },
            { id: `flow-node-${node.nodeIndex}-right`, position: 'right', offset: 0.5, type: 'output' },
            { id: `flow-node-${node.nodeIndex}-bottom`, position: 'bottom', offset: 0.5, type: 'output' },
            { id: `flow-node-${node.nodeIndex}-left`, position: 'left', offset: 0.5, type: 'input' },
          ],
          zIndex: 1,
          locked: false,
          visible: true,
          metadata: { 
            actor: node.actor, 
            step: node.step, 
            order: node.order 
          },
        };
        components.push(flowComponent);
      });
    });
    
    // 無効なactor/stepを持つノードを処理
    flow_nodes.forEach((node: any, nodeIndex: number) => {
      const actorIndex = actors.findIndex((actor: any) => actor.name === node.actor);
      const stepIndex = steps.findIndex((step: any) => step.name === node.step);
      
      if (actorIndex === -1 || stepIndex === -1) {
        console.warn(`Node ${nodeIndex} has invalid actor or step:`, { actor: node.actor, step: node.step });
        // For nodes without valid actor/step mapping, place them in a simple linear layout
        const x = START_X + (nodeIndex * 220);
        const y = START_Y + STEP_LANE_HEIGHT + MARGIN + actors.length * DYNAMIC_CELL_HEIGHT + 60;
        
        const flowComponent = {
          id: `flow-node-${nodeIndex}`,
          type: 'process',
          position: { x, y },
          size: { width: 180, height: 90 },
          text: node.text || `ステップ ${node.order + 1}`,
          style: {
            backgroundColor: '#4f46e5',
            borderColor: '#3730a3',
            textColor: '#ffffff',
            borderWidth: 2,
            borderRadius: 8,
          },
          connectionPoints: [
            { id: `flow-node-${nodeIndex}-top`, position: 'top', offset: 0.5, type: 'input' },
            { id: `flow-node-${nodeIndex}-right`, position: 'right', offset: 0.5, type: 'output' },
            { id: `flow-node-${nodeIndex}-bottom`, position: 'bottom', offset: 0.5, type: 'output' },
            { id: `flow-node-${nodeIndex}-left`, position: 'left', offset: 0.5, type: 'input' },
          ],
          zIndex: 1,
          locked: false,
          visible: true,
          metadata: { 
            actor: node.actor, 
            step: node.step, 
            order: node.order 
          },
        };
        components.push(flowComponent);
      }
    });
    
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
            Business Flow Editor
          </h1>
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
              <span className="hidden lg:inline whitespace-nowrap">元に戻す (Cmd+Z)</span>
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
            recordOperation={recordOperation}
            generatedFlowData={generatedFlowData}
            onFlowGenerated={(components, connections) => {
              // Clear generatedFlowData after it's been used to prevent re-execution
              setGeneratedFlowData(null);
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