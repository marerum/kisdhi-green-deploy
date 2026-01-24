import { Node, Edge, Position } from 'reactflow';
import dagre from 'dagre';

// バックエンドからの実際のデータ形式
export interface FlowData {
  actors: Array<{
    name: string;
    role: string;
  }>;
  steps: Array<{
    name: string;
    description: string;
  }>;
  flow_nodes: Array<{
    text: string;
    order: number;
    actor: string;
    step: string;
    position_x?: number;
    position_y?: number;
  }>;
  edges?: Array<{
    from_node_order: number;
    to_node_order: number;
    condition?: string;
  }>;
}

export interface ReactFlowData {
  nodes: Node[];
  edges: Edge[];
}

// Dagreを使った自動レイアウト（デフォルトは横方向LR）
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 125,
        y: nodeWithPosition.y - 50,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// アクターごとの色を生成
const getActorColor = (actor: string, actors: Array<{name: string; role: string}>): string => {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];
  const index = actors.findIndex(a => a.name === actor);
  return colors[index >= 0 ? index % colors.length : 0];
};

// FlowDataの検証
export const isValidFlowData = (data: any): data is FlowData => {
  return (
    data &&
    Array.isArray(data.actors) &&
    Array.isArray(data.steps) &&
    Array.isArray(data.flow_nodes) &&
    data.flow_nodes.length > 0
  );
};

// FlowDataをReactFlow形式に変換
export const convertToReactFlow = (flowData: FlowData): ReactFlowData => {
  // データ検証
  if (!isValidFlowData(flowData)) {
    console.error('Invalid flow data structure:', flowData);
    return { nodes: [], edges: [] };
  }

  // flow_nodesが空の場合は空の結果を返す
  if (flowData.flow_nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: Node[] = flowData.flow_nodes.map((flowNode, index) => ({
    id: `node-${flowNode.order}`,
    type: 'default',
    data: {
      label: `${flowNode.actor}\n[${flowNode.step}]\n${flowNode.text}`,
      actor: flowNode.actor,
      action: flowNode.text,
      step: flowNode.step,
      order: flowNode.order,
    },
    // 位置情報があればそれを使う、なければ後でdagreで自動配置
    position: flowNode.position_x !== undefined && flowNode.position_y !== undefined
      ? { x: flowNode.position_x, y: flowNode.position_y }
      : { x: 0, y: 0 },
    style: {
      background: getActorColor(flowNode.actor, flowData.actors),
      color: 'white',
      border: '1px solid #222',
      borderRadius: '8px',
      width: 280,
      padding: '12px',
      fontSize: '12px',
      whiteSpace: 'pre-wrap',
      textAlign: 'center',
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  // edgesが存在しない場合は、orderの順序で自動的に接続を生成
  const edges: Edge[] = [];
  
  if (flowData.edges && flowData.edges.length > 0) {
    // edgesが提供されている場合はそれを使用
    flowData.edges.forEach((flowEdge, index) => {
      edges.push({
        id: `edge-${index}`,
        source: `node-${flowEdge.from_node_order}`,
        target: `node-${flowEdge.to_node_order}`,
        label: flowEdge.condition || '',
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#64748b', strokeWidth: 2 },
        labelStyle: { fill: '#64748b', fontSize: 12 },
      });
    });
  } else {
    // edgesがない場合は、orderの順序で自動接続
    const sortedNodes = [...flowData.flow_nodes].sort((a, b) => a.order - b.order);
    
    for (let i = 0; i < sortedNodes.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: `node-${sortedNodes[i].order}`,
        target: `node-${sortedNodes[i + 1].order}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 },
      });
    }
  }

  // 位置情報が保存されているかチェック
  const hasPositions = flowData.flow_nodes.some(
    node => node.position_x !== undefined && node.position_y !== undefined
  );

  // 位置情報があればそのまま返す、なければdagreで自動レイアウト
  if (hasPositions) {
    return { nodes, edges };
  }

  return getLayoutedElements(nodes, edges);
};

// ReactFlow形式からFlowDataに逆変換（保存用）
export const convertFromReactFlow = (
  nodes: Node[],
  edges: Edge[],
  actors: Array<{name: string; role: string}>
): FlowData => {
  const flowNodes = nodes.map((node) => ({
    text: node.data.action,
    order: node.data.order,
    actor: node.data.actor,
    step: node.data.step,
    position_x: node.position.x,
    position_y: node.position.y,
  }));

  const flowEdges = edges.map((edge) => {
    // source/targetからorder番号を抽出 (例: "node-0" -> 0)
    const fromOrder = parseInt(edge.source.replace('node-', ''));
    const toOrder = parseInt(edge.target.replace('node-', ''));
    
    return {
      from_node_order: fromOrder,
      to_node_order: toOrder,
      condition: typeof edge.label === 'string' ? edge.label : undefined,
    };
  });

  // stepsは元のデータから復元（編集されないため）
  const steps: Array<{name: string; description: string}> = [];

  return {
    actors,
    steps,
    flow_nodes: flowNodes,
    edges: flowEdges.length > 0 ? flowEdges : undefined,
  };
};