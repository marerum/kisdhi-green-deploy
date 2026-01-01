/**
 * useDragAndDrop Hook
 * Manages drag and drop operations for flow components
 */

import { useCallback, useState } from 'react';
import { ComponentTemplate, DraggedComponent } from '@/types/flowComponents';
import { Point } from '@/types/canvas';

export interface DragState {
  isDragging: boolean;
  draggedTemplate: ComponentTemplate | null;
  dragOffset: Point;
  dragPreview: HTMLElement | null;
}

export interface UseDragAndDropOptions {
  onDragStart?: (template: ComponentTemplate, offset: Point) => void;
  onDragEnd?: () => void;
  onDrop?: (template: ComponentTemplate, position: Point) => void;
}

export function useDragAndDrop(options: UseDragAndDropOptions = {}) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedTemplate: null,
    dragOffset: { x: 0, y: 0 },
    dragPreview: null,
  });

  const startDrag = useCallback((
    template: ComponentTemplate,
    event: React.DragEvent,
    offset: Point = { x: 0, y: 0 }
  ) => {
    console.log('=== USE DRAG AND DROP START DRAG ===');
    console.log('Template:', template);
    console.log('Offset:', offset);
    
    const draggedComponent: DraggedComponent = {
      template,
      offset,
    };

    // Set drag data
    const dragDataString = JSON.stringify(draggedComponent);
    console.log('Setting drag data:', dragDataString);
    event.dataTransfer.setData('application/json', dragDataString);
    event.dataTransfer.effectAllowed = 'copy';

    // Create drag preview
    const dragPreview = createDragPreview(template);
    if (dragPreview) {
      document.body.appendChild(dragPreview);
      event.dataTransfer.setDragImage(dragPreview, offset.x, offset.y);
      
      // Clean up preview after drag starts
      setTimeout(() => {
        if (document.body.contains(dragPreview)) {
          document.body.removeChild(dragPreview);
        }
      }, 0);
    }

    setDragState({
      isDragging: true,
      draggedTemplate: template,
      dragOffset: offset,
      dragPreview,
    });

    options.onDragStart?.(template, offset);
    console.log('Start drag completed');
  }, [options]);

  const endDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedTemplate: null,
      dragOffset: { x: 0, y: 0 },
      dragPreview: null,
    });

    options.onDragEnd?.();
  }, [options]);

  const handleDrop = useCallback((
    event: React.DragEvent,
    position: Point
  ) => {
    console.log('=== DRAG AND DROP HANDLE DROP ===');
    event.preventDefault();
    
    try {
      const dragData = event.dataTransfer.getData('application/json');
      console.log('Drag data:', dragData);
      if (!dragData) {
        console.log('No drag data found');
        return;
      }
      
      const draggedComponent: DraggedComponent = JSON.parse(dragData);
      console.log('Parsed dragged component:', draggedComponent);
      
      // Calculate final drop position accounting for offset
      const dropPosition = {
        x: position.x - draggedComponent.offset.x,
        y: position.y - draggedComponent.offset.y,
      };
      
      console.log('Final drop position:', dropPosition);
      console.log('About to call onDrop callback...');
      console.log('onDrop function exists:', !!options.onDrop);
      
      if (options.onDrop) {
        console.log('Calling onDrop with template and position...');
        options.onDrop(draggedComponent.template, dropPosition);
        console.log('onDrop callback completed');
      } else {
        console.warn('No onDrop callback provided');
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
    
    console.log('Calling endDrag...');
    endDrag();
    console.log('handleDrop completed');
  }, [options, endDrag]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  return {
    dragState,
    startDrag,
    endDrag,
    handleDrop,
    handleDragOver,
  };
}

// Helper function to create drag preview element
function createDragPreview(template: ComponentTemplate): HTMLElement | null {
  try {
    const preview = document.createElement('div');
    preview.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      width: ${template.defaultSize.width}px;
      height: ${template.defaultSize.height}px;
      background-color: ${template.defaultStyle.backgroundColor};
      border: 2px solid ${template.defaultStyle.borderColor};
      border-radius: ${template.defaultStyle.borderRadius || 0}px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${template.defaultStyle.textColor};
      font-size: 12px;
      font-weight: 500;
      font-family: Inter, system-ui, sans-serif;
      opacity: 0.8;
      pointer-events: none;
      z-index: 9999;
    `;
    
    // Add text content
    const textNode = document.createTextNode(template.name);
    preview.appendChild(textNode);
    
    // Special styling for different component types
    if (template.type === 'decision') {
      preview.style.transform = 'rotate(45deg)';
      preview.style.borderRadius = '0';
    } else if (template.type === 'start' || template.type === 'end') {
      preview.style.borderRadius = '50%';
    }
    
    return preview;
  } catch (error) {
    console.error('Failed to create drag preview:', error);
    return null;
  }
}

// Helper function to get drag data from event
export function getDraggedComponent(event: React.DragEvent): DraggedComponent | null {
  try {
    const dragData = event.dataTransfer.getData('application/json');
    if (!dragData) return null;
    
    return JSON.parse(dragData) as DraggedComponent;
  } catch (error) {
    console.error('Failed to parse drag data:', error);
    return null;
  }
}

// Helper function to calculate drop position relative to element
export function getDropPosition(
  event: React.DragEvent,
  element: HTMLElement,
  transform?: { x: number; y: number; scale: number }
): Point {
  const rect = element.getBoundingClientRect();
  
  let x = event.clientX - rect.left;
  let y = event.clientY - rect.top;
  
  // Account for canvas transform if provided
  if (transform) {
    x = (x - transform.x) / transform.scale;
    y = (y - transform.y) / transform.scale;
  }
  
  return { x, y };
}