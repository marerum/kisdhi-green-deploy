'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

// 共通のノードスタイル
const baseNodeStyle = {
  padding: '12px 16px',
  borderRadius: '8px',
  border: '2px solid',
  fontSize: '14px',
  fontWeight: '500',
  minWidth: '120px',
  textAlign: 'center' as const,
};

// 開始ノード（楕円形）
export const StartNode = memo(({ data }: NodeProps) => {
  return (
    <div
      style={{
        ...baseNodeStyle,
        backgroundColor: '#10b981',
        borderColor: '#059669',
        color: 'white',
        borderRadius: '50px',
      }}
    >
      <Handle type="source" position={Position.Right} />
      {data.label || '開始'}
    </div>
  );
});
StartNode.displayName = 'StartNode';

// プロセスノード（角丸四角形）
export const ProcessNode = memo(({ data }: NodeProps) => {
  return (
    <div
      style={{
        ...baseNodeStyle,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        color: 'white',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div>{data.label || 'プロセス'}</div>
      {data.actor && (
        <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>
          {data.actor}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});
ProcessNode.displayName = 'ProcessNode';

// 判断ノード（ひし形）
export const DecisionNode = memo(({ data }: NodeProps) => {
  return (
    <div
      style={{
        ...baseNodeStyle,
        backgroundColor: '#f59e0b',
        borderColor: '#d97706',
        color: 'white',
        transform: 'rotate(45deg)',
        minWidth: '100px',
        minHeight: '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ transform: 'rotate(-45deg)' }} />
      <div style={{ transform: 'rotate(-45deg)' }}>
        {data.label || '判断'}
      </div>
      <Handle type="source" position={Position.Right} style={{ transform: 'rotate(-45deg)' }} />
      <Handle type="source" position={Position.Bottom} style={{ transform: 'rotate(-45deg)' }} />
    </div>
  );
});
DecisionNode.displayName = 'DecisionNode';

// 終了ノード（楕円形）
export const EndNode = memo(({ data }: NodeProps) => {
  return (
    <div
      style={{
        ...baseNodeStyle,
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
        color: 'white',
        borderRadius: '50px',
      }}
    >
      <Handle type="target" position={Position.Left} />
      {data.label || '終了'}
    </div>
  );
});
EndNode.displayName = 'EndNode';

// ノードタイプのマッピング
export const nodeTypes = {
  start: StartNode,
  process: ProcessNode,
  decision: DecisionNode,
  end: EndNode,
};
