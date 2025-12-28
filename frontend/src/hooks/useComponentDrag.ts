/**
 * useComponentDrag Hook
 * Manages dragging of components on the canvas
 */

import { useCallback, useState, useRef } from 'react';
import { FlowComponentData } from '@/types/flowComponents';
import { Point } from '@/types/canvas';
import { snapToGrid } from '@/utils/gridUtils';

export interface ComponentDragState {
  isDragging: boolean;
  draggedComponentIds: string[];
  dragStart: Point | null;
  dragOffset: Point;
  initialPositions: Map<string, Point>;
}

export interface UseComponentDragOptions {
  components: FlowComponentData[];
  selectedIds: string[];
  gridSize: number;
  snapToGrid: boolean;
  onComponentsUpdate: (updates: Array<{ id: string; position: Point }>) => void;
  onDragStart?: (componentIds: string[]) => void;
  onDragEnd?: (componentIds: string[]) => void;
}

export function useComponentDrag(options: UseComponentDragOptions) {
  const [dragState, setDragState] = useState<ComponentDragState>({
    isDragging: false,
    draggedComponentIds: [],
    dragStart: null,
    dragOffset: { x: 0, y: 0 },
    initialPositions: new Map(),
  });

  const dragStartRef = useRef<Point | null>(null);
  const initialPositionsRef = useRef<Map<string, Point>>(new Map());

  const startDrag = useCallback((
    componentId: string,
    startPoint: Point,
    event?: React.MouseEvent
  ) => {
    // Determine which components to drag
    let componentsToDrag: string[];
    
    if (options.selectedIds.includes(componentId)) {
      // If the clicked component is selected, drag all selected components
      componentsToDrag = options.selectedIds;
    } else {
      // If the clicked component is not selected, drag only this component
      componentsToDrag = [componentId];
    }

    // Store initial positions
    const initialPositions = new Map<string, Point>();
    componentsToDrag.forEach(id => {
      const component = options.components.find(c => c.id === id);
      if (component) {
        initialPositions.set(id, { ...component.position });
      }
    });

    dragStartRef.current = startPoint;
    initialPositionsRef.current = initialPositions;

    setDragState({
      isDragging: true,
      draggedComponentIds: componentsToDrag,
      dragStart: startPoint,
      dragOffset: { x: 0, y: 0 },
      initialPositions,
    });

    options.onDragStart?.(componentsToDrag);
  }, [options]);

  const updateDrag = useCallback((currentPoint: Point) => {
    if (!dragState.isDragging || !dragStartRef.current) return;

    const offset = {
      x: currentPoint.x - dragStartRef.current.x,
      y: currentPoint.y - dragStartRef.current.y,
    };

    setDragState(prev => ({
      ...prev,
      dragOffset: offset,
    }));

    // Calculate new positions for all dragged components
    const updates: Array<{ id: string; position: Point }> = [];
    
    dragState.draggedComponentIds.forEach(id => {
      const initialPosition = initialPositionsRef.current.get(id);
      if (initialPosition) {
        let newPosition = {
          x: initialPosition.x + offset.x,
          y: initialPosition.y + offset.y,
        };

        // Apply grid snapping if enabled
        if (options.snapToGrid) {
          newPosition = snapToGrid(newPosition, options.gridSize);
        }

        updates.push({ id, position: newPosition });
      }
    });

    options.onComponentsUpdate(updates);
  }, [dragState.isDragging, dragState.draggedComponentIds, options]);

  const endDrag = useCallback(() => {
    if (!dragState.isDragging) return;

    const draggedIds = [...dragState.draggedComponentIds];

    setDragState({
      isDragging: false,
      draggedComponentIds: [],
      dragStart: null,
      dragOffset: { x: 0, y: 0 },
      initialPositions: new Map(),
    });

    dragStartRef.current = null;
    initialPositionsRef.current.clear();

    options.onDragEnd?.(draggedIds);
  }, [dragState.isDragging, dragState.draggedComponentIds, options]);

  const cancelDrag = useCallback(() => {
    if (!dragState.isDragging) return;

    // Restore original positions
    const updates: Array<{ id: string; position: Point }> = [];
    
    dragState.draggedComponentIds.forEach(id => {
      const initialPosition = initialPositionsRef.current.get(id);
      if (initialPosition) {
        updates.push({ id, position: initialPosition });
      }
    });

    options.onComponentsUpdate(updates);
    endDrag();
  }, [dragState.isDragging, dragState.draggedComponentIds, options, endDrag]);

  const isDragging = useCallback((componentId?: string) => {
    if (componentId) {
      return dragState.draggedComponentIds.includes(componentId);
    }
    return dragState.isDragging;
  }, [dragState.isDragging, dragState.draggedComponentIds]);

  const getDragOffset = useCallback(() => {
    return dragState.dragOffset;
  }, [dragState.dragOffset]);

  const getDraggedComponentIds = useCallback(() => {
    return dragState.draggedComponentIds;
  }, [dragState.draggedComponentIds]);

  return {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    isDragging,
    getDragOffset,
    getDraggedComponentIds,
  };
}

// Helper function to check if a point is within a component's bounds
export function isPointInComponent(point: Point, component: FlowComponentData): boolean {
  return (
    point.x >= component.position.x &&
    point.x <= component.position.x + component.size.width &&
    point.y >= component.position.y &&
    point.y <= component.position.y + component.size.height
  );
}

// Helper function to get the component at a specific point
export function getComponentAtPoint(
  point: Point,
  components: FlowComponentData[]
): FlowComponentData | null {
  // Search from top to bottom (highest z-index first)
  const sortedComponents = [...components].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  
  for (const component of sortedComponents) {
    if (component.visible !== false && isPointInComponent(point, component)) {
      return component;
    }
  }
  
  return null;
}

// Helper function to calculate component bounds
export function getComponentBounds(component: FlowComponentData) {
  return {
    left: component.position.x,
    top: component.position.y,
    right: component.position.x + component.size.width,
    bottom: component.position.y + component.size.height,
    width: component.size.width,
    height: component.size.height,
  };
}

// Helper function to check if two components overlap
export function doComponentsOverlap(
  component1: FlowComponentData,
  component2: FlowComponentData
): boolean {
  const bounds1 = getComponentBounds(component1);
  const bounds2 = getComponentBounds(component2);
  
  return !(
    bounds1.right <= bounds2.left ||
    bounds1.left >= bounds2.right ||
    bounds1.bottom <= bounds2.top ||
    bounds1.top >= bounds2.bottom
  );
}