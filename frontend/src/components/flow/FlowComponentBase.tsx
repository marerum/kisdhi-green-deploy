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
  });

  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const componentRef = useRef<SVGGElement>(null);

  // Update last position when data changes
  useEffect(() => {
    setState(prev => ({ ...prev, lastPosition: data.position }));
  }, [data.position]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Don't start drag if we're editing
    if (isEditing) return;
    
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

    onSelect?.(data.id, event.ctrlKey || event.metaKey);
    onStartDrag?.(data.id, startPoint);
  }, [data.id, data.position, isEditing, onSelect, onStartDrag]);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onStartEdit?.(data.id);
    onDoubleClick?.(data.id);
  }, [data.id, onStartEdit, onDoubleClick]);

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
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
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