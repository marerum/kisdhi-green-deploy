/**
 * Drag Utilities
 * Helper functions for drag and drop operations
 */

import { Point } from '@/types/canvas';
import { FlowComponentData } from '@/types/flowComponents';

// Convert screen coordinates to canvas coordinates
export function screenToCanvas(
  screenPoint: Point,
  canvasElement: HTMLElement,
  transform: { x: number; y: number; scale: number }
): Point {
  const rect = canvasElement.getBoundingClientRect();
  
  return {
    x: (screenPoint.x - rect.left - transform.x) / transform.scale,
    y: (screenPoint.y - rect.top - transform.y) / transform.scale,
  };
}

// Convert canvas coordinates to screen coordinates
export function canvasToScreen(
  canvasPoint: Point,
  canvasElement: HTMLElement,
  transform: { x: number; y: number; scale: number }
): Point {
  const rect = canvasElement.getBoundingClientRect();
  
  return {
    x: canvasPoint.x * transform.scale + transform.x + rect.left,
    y: canvasPoint.y * transform.scale + transform.y + rect.top,
  };
}

// Get mouse position relative to canvas
export function getCanvasMousePosition(
  event: React.MouseEvent | MouseEvent,
  canvasElement: HTMLElement,
  transform: { x: number; y: number; scale: number }
): Point {
  return screenToCanvas(
    { x: event.clientX, y: event.clientY },
    canvasElement,
    transform
  );
}

// Calculate distance between two points
export function getDistance(point1: Point, point2: Point): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check if a drag operation should start based on distance threshold
export function shouldStartDrag(
  startPoint: Point,
  currentPoint: Point,
  threshold: number = 5
): boolean {
  return getDistance(startPoint, currentPoint) > threshold;
}

// Constrain a point to stay within bounds
export function constrainToBounds(
  point: Point,
  bounds: { x: number; y: number; width: number; height: number }
): Point {
  return {
    x: Math.max(bounds.x, Math.min(point.x, bounds.x + bounds.width)),
    y: Math.max(bounds.y, Math.min(point.y, bounds.y + bounds.height)),
  };
}

// Constrain component position to stay within canvas bounds
export function constrainComponentToBounds(
  component: FlowComponentData,
  canvasBounds: { width: number; height: number },
  margin: number = 10
): Point {
  return {
    x: Math.max(
      margin,
      Math.min(component.position.x, canvasBounds.width - component.size.width - margin)
    ),
    y: Math.max(
      margin,
      Math.min(component.position.y, canvasBounds.height - component.size.height - margin)
    ),
  };
}

// Calculate the center point of a component
export function getComponentCenter(component: FlowComponentData): Point {
  return {
    x: component.position.x + component.size.width / 2,
    y: component.position.y + component.size.height / 2,
  };
}

// Calculate bounding box for multiple components
export function getMultiComponentBounds(components: FlowComponentData[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (components.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  components.forEach(component => {
    minX = Math.min(minX, component.position.x);
    minY = Math.min(minY, component.position.y);
    maxX = Math.max(maxX, component.position.x + component.size.width);
    maxY = Math.max(maxY, component.position.y + component.size.height);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Check if a point is within a rectangular area
export function isPointInRect(
  point: Point,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

// Calculate the closest point on a rectangle to a given point
export function getClosestPointOnRect(
  point: Point,
  rect: { x: number; y: number; width: number; height: number }
): Point {
  return {
    x: Math.max(rect.x, Math.min(point.x, rect.x + rect.width)),
    y: Math.max(rect.y, Math.min(point.y, rect.y + rect.height)),
  };
}

// Create a visual feedback element for drag operations
export function createDragFeedback(
  components: FlowComponentData[],
  offset: Point
): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 9999;
    opacity: 0.7;
    transform: translate(${offset.x}px, ${offset.y}px);
  `;
  
  components.forEach(component => {
    const element = document.createElement('div');
    element.style.cssText = `
      position: absolute;
      left: ${component.position.x}px;
      top: ${component.position.y}px;
      width: ${component.size.width}px;
      height: ${component.size.height}px;
      background-color: ${component.style.backgroundColor};
      border: 2px solid ${component.style.borderColor};
      border-radius: ${component.style.borderRadius || 0}px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${component.style.textColor};
      font-size: 12px;
      font-weight: 500;
      font-family: Inter, system-ui, sans-serif;
    `;
    
    // Add text content
    const textNode = document.createTextNode(component.text);
    element.appendChild(textNode);
    
    // Special styling for different component types
    if (component.type === 'decision') {
      element.style.transform = 'rotate(45deg)';
      element.style.borderRadius = '0';
    } else if (component.type === 'start' || component.type === 'end') {
      element.style.borderRadius = '50%';
    }
    
    container.appendChild(element);
  });
  
  return container;
}

// Clean up drag feedback element
export function cleanupDragFeedback(element: HTMLElement) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

// Animate component movement
export function animateComponentMovement(
  componentElement: SVGElement,
  fromPosition: Point,
  toPosition: Point,
  duration: number = 200
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const deltaX = toPosition.x - fromPosition.x;
    const deltaY = toPosition.y - fromPosition.y;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentX = fromPosition.x + deltaX * easeOut;
      const currentY = fromPosition.y + deltaY * easeOut;
      
      componentElement.style.transform = `translate(${currentX}px, ${currentY}px)`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        componentElement.style.transform = '';
        resolve();
      }
    };
    
    requestAnimationFrame(animate);
  });
}