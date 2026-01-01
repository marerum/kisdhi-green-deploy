/**
 * GroupResizeHandles - Handles resizing of multiple selected components as a group
 */

'use client';

import React, { useCallback, useState } from 'react';
import { FlowComponentData } from '@/types/flowComponents';
import { Point } from '@/types/canvas';

interface GroupResizeHandlesProps {
  selectedComponents: FlowComponentData[];
  scale: number;
  onComponentsUpdate: (updates: { id: string; position: Point; size: { width: number; height: number } }[]) => void;
}

interface GroupBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface ResizeState {
  isResizing: boolean;
  handle: string | null;
  initialBounds: GroupBounds | null;
  initialMousePos: Point;
  initialComponentStates: Array<{
    id: string;
    position: Point;
    size: { width: number; height: number };
    relativePosition: { x: number; y: number }; // Relative to group bounds
    relativeSize: { width: number; height: number }; // Relative to group bounds
  }>;
}

export default function GroupResizeHandles({
  selectedComponents,
  scale,
  onComponentsUpdate,
}: GroupResizeHandlesProps) {
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    handle: null,
    initialBounds: null,
    initialMousePos: { x: 0, y: 0 },
    initialComponentStates: [],
  });

  // Calculate group bounds
  const getGroupBounds = useCallback((components: FlowComponentData[]): GroupBounds => {
    if (components.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    components.forEach(component => {
      const left = component.position.x;
      const top = component.position.y;
      const right = left + component.size.width;
      const bottom = top + component.size.height;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    });

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, []);

  const groupBounds = getGroupBounds(selectedComponents);

  // Handle resize start
  const handleResizeStart = useCallback((event: React.MouseEvent, handle: string) => {
    event.stopPropagation();
    
    const initialBounds = getGroupBounds(selectedComponents);
    const initialComponentStates = selectedComponents.map(component => ({
      id: component.id,
      position: { ...component.position },
      size: { ...component.size },
      relativePosition: {
        x: (component.position.x - initialBounds.minX) / initialBounds.width,
        y: (component.position.y - initialBounds.minY) / initialBounds.height,
      },
      relativeSize: {
        width: component.size.width / initialBounds.width,
        height: component.size.height / initialBounds.height,
      },
    }));

    setResizeState({
      isResizing: true,
      handle,
      initialBounds,
      initialMousePos: { x: event.clientX, y: event.clientY },
      initialComponentStates,
    });

    // Add global mouse event listeners
    const handleMouseMove = (e: MouseEvent) => {
      handleResizeMove(e, handle, initialBounds, initialComponentStates);
    };

    const handleMouseUp = () => {
      setResizeState(prev => ({
        ...prev,
        isResizing: false,
        handle: null,
      }));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [selectedComponents, getGroupBounds]);

  // Handle resize move
  const handleResizeMove = useCallback((
    event: MouseEvent,
    handle: string,
    initialBounds: GroupBounds,
    initialComponentStates: ResizeState['initialComponentStates']
  ) => {
    const deltaX = event.clientX - resizeState.initialMousePos.x;
    const deltaY = event.clientY - resizeState.initialMousePos.y;

    // Convert screen delta to canvas delta
    const canvasDeltaX = deltaX / scale;
    const canvasDeltaY = deltaY / scale;

    // Calculate new bounds based on handle
    let newBounds = { ...initialBounds };

    switch (handle) {
      case 'nw': // Top-left
        newBounds.minX += canvasDeltaX;
        newBounds.minY += canvasDeltaY;
        break;
      case 'n': // Top
        newBounds.minY += canvasDeltaY;
        break;
      case 'ne': // Top-right
        newBounds.maxX += canvasDeltaX;
        newBounds.minY += canvasDeltaY;
        break;
      case 'e': // Right
        newBounds.maxX += canvasDeltaX;
        break;
      case 'se': // Bottom-right
        newBounds.maxX += canvasDeltaX;
        newBounds.maxY += canvasDeltaY;
        break;
      case 's': // Bottom
        newBounds.maxY += canvasDeltaY;
        break;
      case 'sw': // Bottom-left
        newBounds.minX += canvasDeltaX;
        newBounds.maxY += canvasDeltaY;
        break;
      case 'w': // Left
        newBounds.minX += canvasDeltaX;
        break;
    }

    // Ensure minimum size
    const minGroupWidth = 100;
    const minGroupHeight = 60;
    
    newBounds.width = Math.max(minGroupWidth, newBounds.maxX - newBounds.minX);
    newBounds.height = Math.max(minGroupHeight, newBounds.maxY - newBounds.minY);
    newBounds.maxX = newBounds.minX + newBounds.width;
    newBounds.maxY = newBounds.minY + newBounds.height;

    // Calculate scale factors
    const scaleX = newBounds.width / initialBounds.width;
    const scaleY = newBounds.height / initialBounds.height;

    // Update all components proportionally
    const updates = initialComponentStates.map(componentState => {
      const newPosition = {
        x: newBounds.minX + (componentState.relativePosition.x * newBounds.width),
        y: newBounds.minY + (componentState.relativePosition.y * newBounds.height),
      };

      const newSize = {
        width: Math.max(60, componentState.relativeSize.width * newBounds.width),
        height: Math.max(40, componentState.relativeSize.height * newBounds.height),
      };

      return {
        id: componentState.id,
        position: newPosition,
        size: newSize,
      };
    });

    onComponentsUpdate(updates);
  }, [resizeState.initialMousePos, scale, onComponentsUpdate]);

  // Don't render if less than 2 components selected
  if (selectedComponents.length < 2) {
    return null;
  }

  // Resize handles configuration
  const handles = [
    { id: 'nw', x: groupBounds.minX, y: groupBounds.minY, cursor: 'nw-resize' },
    { id: 'n', x: groupBounds.minX + groupBounds.width / 2, y: groupBounds.minY, cursor: 'n-resize' },
    { id: 'ne', x: groupBounds.maxX, y: groupBounds.minY, cursor: 'ne-resize' },
    { id: 'e', x: groupBounds.maxX, y: groupBounds.minY + groupBounds.height / 2, cursor: 'e-resize' },
    { id: 'se', x: groupBounds.maxX, y: groupBounds.maxY, cursor: 'se-resize' },
    { id: 's', x: groupBounds.minX + groupBounds.width / 2, y: groupBounds.maxY, cursor: 's-resize' },
    { id: 'sw', x: groupBounds.minX, y: groupBounds.maxY, cursor: 'sw-resize' },
    { id: 'w', x: groupBounds.minX, y: groupBounds.minY + groupBounds.height / 2, cursor: 'w-resize' },
  ];

  const handleSize = 8 / scale;
  const handleOffset = handleSize / 2;

  return (
    <g className="group-resize-handles">
      {/* Group bounds outline */}
      <rect
        x={groupBounds.minX}
        y={groupBounds.minY}
        width={groupBounds.width}
        height={groupBounds.height}
        fill="none"
        stroke="rgb(59, 130, 246)"
        strokeWidth={2 / scale}
        strokeDasharray={`${6 / scale} ${3 / scale}`}
        pointerEvents="none"
      />

      {/* Resize handles */}
      {handles.map(handle => (
        <rect
          key={handle.id}
          x={handle.x - handleOffset}
          y={handle.y - handleOffset}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="rgb(59, 130, 246)"
          strokeWidth={1 / scale}
          style={{
            cursor: handle.cursor,
            pointerEvents: 'all',
          }}
          onMouseDown={(e) => handleResizeStart(e, handle.id)}
        />
      ))}
    </g>
  );
}