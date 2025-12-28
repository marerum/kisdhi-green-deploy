/**
 * useSelection Hook
 * Manages component selection state and operations for the flow editor
 */

import { useCallback, useState, useRef } from 'react';
import { FlowComponentData } from '@/types/flowComponents';
import { Point } from '@/types/canvas';

export interface SelectionBox {
  start: Point;
  end: Point;
  isActive: boolean;
}

export interface UseSelectionOptions {
  onSelectionChange?: (selectedIds: string[]) => void;
  onSelectionBoxChange?: (box: SelectionBox | null) => void;
}

export function useSelection(options: UseSelectionOptions = {}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStartRef = useRef<Point | null>(null);

  // Select a single component
  const selectComponent = useCallback((id: string, multiSelect = false) => {
    setSelectedIds(prev => {
      let newSelection: string[];
      
      if (multiSelect) {
        // Multi-select: toggle the component
        if (prev.includes(id)) {
          newSelection = prev.filter(selectedId => selectedId !== id);
        } else {
          newSelection = [...prev, id];
        }
      } else {
        // Single select: replace selection
        newSelection = [id];
      }
      
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        options.onSelectionChange?.(newSelection);
      }, 0);
      
      return newSelection;
    });
  }, [options]);

  // Select multiple components
  const selectComponents = useCallback((ids: string[], replace = true) => {
    setSelectedIds(prev => {
      const newSelection = replace ? ids : [...prev, ...ids.filter(id => !prev.includes(id))];
      
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        options.onSelectionChange?.(newSelection);
      }, 0);
      
      return newSelection;
    });
  }, [options]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.length > 0) {
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          options.onSelectionChange?.([]);
        }, 0);
        return [];
      }
      return prev;
    });
  }, [options]);

  // Select all components
  const selectAll = useCallback((components: FlowComponentData[]) => {
    const allIds = components.map(c => c.id);
    setSelectedIds(allIds);
    
    // Use setTimeout to avoid setState during render
    setTimeout(() => {
      options.onSelectionChange?.(allIds);
    }, 0);
  }, [options]);

  // Check if a component is selected
  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  // Start selection box
  const startSelectionBox = useCallback((point: Point) => {
    setIsSelecting(true);
    selectionStartRef.current = point;
    
    const box: SelectionBox = {
      start: point,
      end: point,
      isActive: true,
    };
    
    setSelectionBox(box);
    options.onSelectionBoxChange?.(box);
  }, [options]);

  // Update selection box
  const updateSelectionBox = useCallback((point: Point) => {
    if (!isSelecting || !selectionStartRef.current) return;
    
    const box: SelectionBox = {
      start: selectionStartRef.current,
      end: point,
      isActive: true,
    };
    
    setSelectionBox(box);
    options.onSelectionBoxChange?.(box);
  }, [isSelecting, options]);

  // End selection box and select components within it
  const endSelectionBox = useCallback((
    components: FlowComponentData[],
    multiSelect = false
  ) => {
    if (!selectionBox || !isSelecting) return;
    
    // Calculate selection rectangle
    const rect = {
      left: Math.min(selectionBox.start.x, selectionBox.end.x),
      top: Math.min(selectionBox.start.y, selectionBox.end.y),
      right: Math.max(selectionBox.start.x, selectionBox.end.x),
      bottom: Math.max(selectionBox.start.y, selectionBox.end.y),
    };
    
    // Find components within selection box
    const selectedComponents = components.filter(component => {
      const compLeft = component.position.x;
      const compTop = component.position.y;
      const compRight = component.position.x + component.size.width;
      const compBottom = component.position.y + component.size.height;
      
      // Check if component overlaps with selection rectangle
      return (
        compLeft < rect.right &&
        compRight > rect.left &&
        compTop < rect.bottom &&
        compBottom > rect.top
      );
    });
    
    const newSelectedIds = selectedComponents.map(c => c.id);
    
    if (multiSelect) {
      // Add to existing selection
      selectComponents(newSelectedIds, false);
    } else {
      // Replace selection
      selectComponents(newSelectedIds, true);
    }
    
    // Clear selection box
    setIsSelecting(false);
    setSelectionBox(null);
    selectionStartRef.current = null;
    options.onSelectionBoxChange?.(null);
  }, [selectionBox, isSelecting, selectComponents, options]);

  // Cancel selection box
  const cancelSelectionBox = useCallback(() => {
    setIsSelecting(false);
    setSelectionBox(null);
    selectionStartRef.current = null;
    options.onSelectionBoxChange?.(null);
  }, [options]);

  // Get selection bounds (bounding box of all selected components)
  const getSelectionBounds = useCallback((components: FlowComponentData[]) => {
    const selectedComponents = components.filter(c => selectedIds.includes(c.id));
    
    if (selectedComponents.length === 0) return null;
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    selectedComponents.forEach(component => {
      const left = component.position.x;
      const top = component.position.y;
      const right = component.position.x + component.size.width;
      const bottom = component.position.y + component.size.height;
      
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selectedIds]);

  // Delete selected components
  const deleteSelected = useCallback((
    components: FlowComponentData[],
    onComponentsChange: (components: FlowComponentData[]) => void
  ) => {
    if (selectedIds.length === 0) return;
    
    const remainingComponents = components.filter(c => !selectedIds.includes(c.id));
    onComponentsChange(remainingComponents);
    clearSelection();
  }, [selectedIds, clearSelection]);

  // Duplicate selected components
  const duplicateSelected = useCallback((
    components: FlowComponentData[],
    onComponentsChange: (components: FlowComponentData[]) => void,
    offset: Point = { x: 20, y: 20 }
  ) => {
    if (selectedIds.length === 0) return;
    
    const selectedComponents = components.filter(c => selectedIds.includes(c.id));
    const duplicatedComponents = selectedComponents.map(component => ({
      ...component,
      id: `${component.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: component.position.x + offset.x,
        y: component.position.y + offset.y,
      },
      connectionPoints: component.connectionPoints.map((cp, index) => ({
        ...cp,
        id: `${component.type}-${Date.now()}-${index}`,
      })),
    }));
    
    const newComponents = [...components, ...duplicatedComponents];
    onComponentsChange(newComponents);
    
    // Select the duplicated components
    const duplicatedIds = duplicatedComponents.map(c => c.id);
    selectComponents(duplicatedIds, true);
  }, [selectedIds, selectComponents]);

  return {
    // State
    selectedIds,
    selectionBox,
    isSelecting,
    
    // Selection operations
    selectComponent,
    selectComponents,
    clearSelection,
    selectAll,
    isSelected,
    
    // Selection box operations
    startSelectionBox,
    updateSelectionBox,
    endSelectionBox,
    cancelSelectionBox,
    
    // Utility functions
    getSelectionBounds,
    deleteSelected,
    duplicateSelected,
  };
}