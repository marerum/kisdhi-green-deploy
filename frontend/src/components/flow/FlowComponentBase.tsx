/**
 * FlowComponentBase - Abstract base component for all flow elements
 * Provides common functionality for positioning, sizing, selection, and interaction
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FlowComponentData, ConnectionPoint } from '@/types/flowComponents';
import { Point } from '@/types/canvas';
import ComponentEditor from './ComponentEditor';
import { ConnectionPoints } from './ConnectionPoint';

export interface FlowComponentBaseProps {
  data: FlowComponentData;
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  isEditing?: boolean;
  scale?: number;
  onUpdate?: (id: string, updates: Partial<FlowComponentData>) => void;
  onSelect?: (id: string, multiSelect?: boolean) => void;
  onStartDrag?: (id: string, startPoint: Point) => void;
  onDrag?: (id: string, delta: Point) => void;
  onEndDrag?: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  onStartEdit?: (id: string) => void;
  onEndEdit?: (id: string) => void;
  onConnectionPointHover?: (componentId: string, pointId: string | null) => void;
  onConnectionStart?: (componentId: string, pointId: string, position: Point) => void;
  onConnectionEnd?: (componentId: string, pointId: string, position: Point) => void;
  children?: React.ReactNode;
}

export interface FlowComponentState {
  dragStart: Point | null;
  lastPosition: Point;
  isResizing: boolean;
  resizeHandle: string | null;
  initialSize: { width: number; height: number };
  initialMousePos: Point;
}

/**
 * Abstract base class for all flow components
 * Handles common functionality like selection, dragging, editing
 */
export default function FlowComponentBase({
  data,
  isSelected = false,
  isHovered = false,
  isDragging = false,
  isEditing = false,
  scale = 1,
  onUpdate,
  onSelect,
  onStartDrag,
  onDrag,
  onEndDrag,
  onDoubleClick,
  onStartEdit,
  onEndEdit,
  onConnectionPointHover,
  onConnectionStart,
  onConnectionEnd,
  children,
}: FlowComponentBaseProps) {
  const [state, setState] = useState<FlowComponentState>({
    dragStart: null,
    lastPosition: data.position,
    isResizing: false,
    resizeHandle: null,
    initialSize: data.size,
    initialMousePos: { x: 0, y: 0 },
  });

  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const componentRef = useRef<SVGGElement>(null);

  // Update last position when data changes
  useEffect(() => {
    setState(prev => ({ ...prev, lastPosition: data.position }));
  }, [data.position]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    console.log('=== COMPONENT MOUSE DOWN ===');
    console.log('Component ID:', data.id);
    console.log('Event:', event);
    console.log('isEditing:', isEditing);
    
    event.stopPropagation();
    
    // Don't start drag if we're editing
    if (isEditing) {
      console.log('Ignoring mouse down - component is editing');
      return;
    }
    
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const startPoint: Point = {
      x: event.clientX,
      y: event.clientY,
    };

    setState(prev => ({
      ...prev,
      dragStart: startPoint,
      lastPosition: data.position,
    }));

    console.log('Calling onSelect with:', data.id, event.ctrlKey || event.metaKey);
    onSelect?.(data.id, event.ctrlKey || event.metaKey);
    onStartDrag?.(data.id, startPoint);
  }, [data.id, data.position, isEditing, onSelect, onStartDrag]);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onStartEdit?.(data.id);
    onDoubleClick?.(data.id);
  }, [data.id, onStartEdit, onDoubleClick]);

  // リサイズハンドルのマウスダウン
  const handleResizeMouseDown = useCallback((event: React.MouseEvent, handle: string) => {
    console.log('🔧 RESIZE HANDLE CLICKED:', handle);
    console.log('Current state before update:', state);
    
    event.stopPropagation();
    event.preventDefault();
    
    const newState = {
      ...state,
      isResizing: true,
      resizeHandle: handle,
      initialSize: data.size,
      initialMousePos: { x: event.clientX, y: event.clientY },
    };
    
    console.log('Setting new state:', newState);
    setState(newState);

    // グローバルマウスイベントリスナーを追加
    const handleMouseMove = (e: MouseEvent) => {
      handleResizeMouseMove(e, handle, newState); // 新しい状態を直接渡す
    };

    const handleMouseUp = () => {
      console.log('🔧 RESIZE MOUSE UP');
      handleResizeMouseUp();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    console.log('Added global event listeners for resize');
  }, [data.size, data.id, state]);

  // リサイズ中のマウス移動
  const handleResizeMouseMove = useCallback((event: MouseEvent, handle: string, currentState?: FlowComponentState) => {
    const resizeState = currentState || state;
    
    if (!resizeState.isResizing) {
      return;
    }

    const deltaX = event.clientX - resizeState.initialMousePos.x;
    const deltaY = event.clientY - resizeState.initialMousePos.y;
    
    let newSize = { ...resizeState.initialSize };
    let newPosition = { ...data.position };

    // ハンドルに応じてサイズと位置を計算
    switch (handle) {
      case 'nw': // 左上
        newSize.width = Math.max(50, resizeState.initialSize.width - deltaX);
        newSize.height = Math.max(30, resizeState.initialSize.height - deltaY);
        newPosition.x = data.position.x + (resizeState.initialSize.width - newSize.width);
        newPosition.y = data.position.y + (resizeState.initialSize.height - newSize.height);
        break;
      case 'ne': // 右上
        newSize.width = Math.max(50, resizeState.initialSize.width + deltaX);
        newSize.height = Math.max(30, resizeState.initialSize.height - deltaY);
        newPosition.y = data.position.y + (resizeState.initialSize.height - newSize.height);
        break;
      case 'sw': // 左下
        newSize.width = Math.max(50, resizeState.initialSize.width - deltaX);
        newSize.height = Math.max(30, resizeState.initialSize.height + deltaY);
        newPosition.x = data.position.x + (resizeState.initialSize.width - newSize.width);
        break;
      case 'se': // 右下
        newSize.width = Math.max(50, resizeState.initialSize.width + deltaX);
        newSize.height = Math.max(30, resizeState.initialSize.height + deltaY);
        break;
      case 'n': // 上
        newSize.height = Math.max(30, resizeState.initialSize.height - deltaY);
        newPosition.y = data.position.y + (resizeState.initialSize.height - newSize.height);
        break;
      case 's': // 下
        newSize.height = Math.max(30, resizeState.initialSize.height + deltaY);
        break;
      case 'w': // 左
        newSize.width = Math.max(50, resizeState.initialSize.width - deltaX);
        newPosition.x = data.position.x + (resizeState.initialSize.width - newSize.width);
        break;
      case 'e': // 右
        newSize.width = Math.max(50, resizeState.initialSize.width + deltaX);
        break;
    }

    // サイズと位置を更新
    onUpdate?.(data.id, { 
      size: newSize,
      position: newPosition
    });
  }, [state, data.position, data.id, onUpdate]);

  // リサイズ終了
  const handleResizeMouseUp = useCallback(() => {
    console.log('🔧 RESIZE END');
    setState(prev => ({
      ...prev,
      isResizing: false,
      resizeHandle: null,
    }));
  }, []);

  const handleTextSave = useCallback((newText: string) => {
    onUpdate?.(data.id, { text: newText });
    onEndEdit?.(data.id);
  }, [data.id, onUpdate, onEndEdit]);

  const handleTextCancel = useCallback(() => {
    onEndEdit?.(data.id);
  }, [data.id, onEndEdit]);

  const handleConnectionPointMouseEnter = useCallback((pointId: string) => {
    setHoveredPointId(pointId);
    onConnectionPointHover?.(data.id, pointId);
  }, [data.id, onConnectionPointHover]);

  const handleConnectionPointMouseLeave = useCallback(() => {
    setHoveredPointId(null);
    onConnectionPointHover?.(data.id, null);
  }, [data.id, onConnectionPointHover]);

  const handleConnectionStart = useCallback((pointId: string, position: Point) => {
    onConnectionStart?.(data.id, pointId, position);
  }, [data.id, onConnectionStart]);

  const handleConnectionEnd = useCallback((pointId: string, position: Point) => {
    onConnectionEnd?.(data.id, pointId, position);
  }, [data.id, onConnectionEnd]);

  // Calculate connection point positions
  const getConnectionPointPosition = useCallback((point: ConnectionPoint): Point => {
    const { position, size } = data;
    const { offset } = point;

    switch (point.position) {
      case 'top':
        return {
          x: position.x + size.width * offset,
          y: position.y,
        };
      case 'right':
        return {
          x: position.x + size.width,
          y: position.y + size.height * offset,
        };
      case 'bottom':
        return {
          x: position.x + size.width * offset,
          y: position.y + size.height,
        };
      case 'left':
        return {
          x: position.x,
          y: position.y + size.height * offset,
        };
      default:
        return position;
    }
  }, [data.position, data.size]);

  // Render connection points using the new ConnectionPoints component
  const renderConnectionPoints = useCallback(() => {
    if (!isHovered && !isSelected) return null;

    return (
      <ConnectionPoints
        connectionPoints={data.connectionPoints}
        componentPosition={data.position}
        componentSize={data.size}
        scale={scale}
        isVisible={true}
        hoveredPointId={hoveredPointId}
        onPointHover={setHoveredPointId}
        onConnectionStart={handleConnectionStart}
        onConnectionEnd={handleConnectionEnd}
      />
    );
  }, [
    data.connectionPoints,
    data.position,
    data.size,
    isHovered,
    isSelected,
    scale,
    hoveredPointId,
    handleConnectionStart,
    handleConnectionEnd,
  ]);

  // Render selection outline
  const renderSelectionOutline = useCallback(() => {
    if (!isSelected) return null;

    const padding = 4 / scale;
    return (
      <rect
        x={data.position.x - padding}
        y={data.position.y - padding}
        width={data.size.width + padding * 2}
        height={data.size.height + padding * 2}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2 / scale}
        strokeDasharray={`${4 / scale} ${2 / scale}`}
        className="pointer-events-none"
        rx={(data.style.borderRadius || 0) + padding}
      />
    );
  }, [isSelected, data.position, data.size, data.style.borderRadius, scale]);

  // Render resize handles
  const renderResizeHandles = useCallback(() => {
    if (!isSelected || isEditing) {
      return null;
    }

    const handleSize = 12 / scale; // サイズを大きくして見やすくする
    const handles = [
      { id: 'nw', x: data.position.x - handleSize/2, y: data.position.y - handleSize/2, cursor: 'nw-resize' },
      { id: 'ne', x: data.position.x + data.size.width - handleSize/2, y: data.position.y - handleSize/2, cursor: 'ne-resize' },
      { id: 'sw', x: data.position.x - handleSize/2, y: data.position.y + data.size.height - handleSize/2, cursor: 'sw-resize' },
      { id: 'se', x: data.position.x + data.size.width - handleSize/2, y: data.position.y + data.size.height - handleSize/2, cursor: 'se-resize' },
      { id: 'n', x: data.position.x + data.size.width/2 - handleSize/2, y: data.position.y - handleSize/2, cursor: 'n-resize' },
      { id: 's', x: data.position.x + data.size.width/2 - handleSize/2, y: data.position.y + data.size.height - handleSize/2, cursor: 's-resize' },
      { id: 'w', x: data.position.x - handleSize/2, y: data.position.y + data.size.height/2 - handleSize/2, cursor: 'w-resize' },
      { id: 'e', x: data.position.x + data.size.width - handleSize/2, y: data.position.y + data.size.height/2 - handleSize/2, cursor: 'e-resize' },
    ];

    return (
      <g 
        className="resize-handles" 
        style={{ 
          pointerEvents: 'all',
          zIndex: 1000 
        }}
      >
        {handles.map(handle => (
          <rect
            key={handle.id}
            x={handle.x}
            y={handle.y}
            width={handleSize}
            height={handleSize}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2 / scale}
            style={{ 
              cursor: handle.cursor,
              pointerEvents: 'all'
            }}
            onMouseDown={(e) => {
              console.log('🔧 RESIZE HANDLE CLICKED:', handle.id);
              handleResizeMouseDown(e, handle.id);
            }}
          />
        ))}
      </g>
    );
  }, [isSelected, isEditing, data.position, data.size, data.type, scale, handleResizeMouseDown]);

  // Render text editor
  const renderTextEditor = useCallback(() => {
    if (!isEditing) return null;

    return (
      <ComponentEditor
        component={data}
        isEditing={isEditing}
        onSave={handleTextSave}
        onCancel={handleTextCancel}
        scale={scale}
      />
    );
  }, [isEditing, data, handleTextSave, handleTextCancel, scale]);

  const componentClasses = [
    'cursor-pointer',
    'transition-all',
    'duration-150',
    isSelected ? 'drop-shadow-lg' : '',
    isHovered ? 'drop-shadow-md' : '',
    isDragging ? 'opacity-75' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <g
        ref={componentRef}
        className={componentClasses}
        onMouseDown={state.isResizing ? undefined : handleMouseDown} // リサイズ中は通常のドラッグを無効化
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          console.log('=== COMPONENT CLICKED ===');
          console.log('Component ID:', data.id);
          console.log('Event:', e);
        }}
        style={{
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          transformOrigin: `${data.position.x + data.size.width / 2}px ${data.position.y + data.size.height / 2}px`,
        }}
      >
        {/* Selection outline */}
        {renderSelectionOutline()}
        
        {/* Component content */}
        {children}
        
        {/* Connection points */}
        {renderConnectionPoints()}
      </g>
      
      {/* Resize handles - 別のグループとして最後にレンダリング（最前面に表示） */}
      {renderResizeHandles()}
      
      {/* Text editor */}
      {renderTextEditor()}
    </>
  );
}

// Helper function to create component data
export function createComponentData(
  type: FlowComponentData['type'],
  position: Point,
  template?: Partial<FlowComponentData>
): FlowComponentData {
  const id = template?.id || `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    type,
    position,
    size: template?.size || { width: 160, height: 80 },
    text: template?.text || type,
    style: template?.style || {
      backgroundColor: '#4f46e5',
      borderColor: '#3730a3',
      textColor: '#ffffff',
      borderWidth: 2,
      borderRadius: 8,
    },
    connectionPoints: template?.connectionPoints || [],
    zIndex: template?.zIndex || 0,
    locked: template?.locked || false,
    visible: template?.visible !== false,
    metadata: template?.metadata || {},
  };
}