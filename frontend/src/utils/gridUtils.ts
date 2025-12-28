/**
 * Grid utility functions for snap-to-grid functionality
 */

import { Point } from '@/types/canvas';

/**
 * Snap a point to the nearest grid intersection
 */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Snap a single coordinate value to the nearest grid line
 */
export function snapValueToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Check if a point is aligned to the grid
 */
export function isAlignedToGrid(point: Point, gridSize: number, tolerance: number = 0.1): boolean {
  const snapped = snapToGrid(point, gridSize);
  return Math.abs(point.x - snapped.x) <= tolerance && Math.abs(point.y - snapped.y) <= tolerance;
}

/**
 * Get the nearest grid lines for a given point
 */
export function getNearestGridLines(point: Point, gridSize: number): {
  vertical: number;
  horizontal: number;
} {
  return {
    vertical: Math.round(point.x / gridSize) * gridSize,
    horizontal: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Calculate grid offset for proper alignment with canvas transform
 */
export function calculateGridOffset(transform: { x: number; y: number; scale: number }, gridSize: number): Point {
  const scaledGridSize = gridSize * transform.scale;
  return {
    x: transform.x % scaledGridSize,
    y: transform.y % scaledGridSize,
  };
}

/**
 * Generate grid pattern path for SVG
 */
export function generateGridPattern(
  gridSize: number,
  scale: number,
  strokeWidth: number = 1,
  opacity: number = 0.5
): {
  patternSize: number;
  pathData: string;
  strokeWidth: number;
  opacity: number;
} {
  const patternSize = gridSize * scale;
  const pathData = `M ${patternSize} 0 L 0 0 0 ${patternSize}`;
  
  return {
    patternSize,
    pathData,
    strokeWidth: strokeWidth / scale, // Adjust stroke width for zoom
    opacity: Math.max(0.1, Math.min(1, opacity * scale)), // Fade out when zoomed out
  };
}

/**
 * Calculate visible grid bounds for performance optimization
 */
export function calculateVisibleGridBounds(
  viewportWidth: number,
  viewportHeight: number,
  transform: { x: number; y: number; scale: number },
  gridSize: number,
  padding: number = 2
): {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  stepX: number;
  stepY: number;
} {
  const scaledGridSize = gridSize * transform.scale;
  
  // Calculate visible area in canvas coordinates
  const visibleLeft = -transform.x / transform.scale;
  const visibleTop = -transform.y / transform.scale;
  const visibleRight = (viewportWidth - transform.x) / transform.scale;
  const visibleBottom = (viewportHeight - transform.y) / transform.scale;
  
  // Expand bounds with padding
  const startX = Math.floor((visibleLeft - padding * gridSize) / gridSize) * gridSize;
  const endX = Math.ceil((visibleRight + padding * gridSize) / gridSize) * gridSize;
  const startY = Math.floor((visibleTop - padding * gridSize) / gridSize) * gridSize;
  const endY = Math.ceil((visibleBottom + padding * gridSize) / gridSize) * gridSize;
  
  return {
    startX,
    endX,
    startY,
    endY,
    stepX: gridSize,
    stepY: gridSize,
  };
}

/**
 * Get grid line positions for rendering
 */
export function getGridLines(
  bounds: ReturnType<typeof calculateVisibleGridBounds>
): {
  verticalLines: number[];
  horizontalLines: number[];
} {
  const verticalLines: number[] = [];
  const horizontalLines: number[] = [];
  
  // Generate vertical lines
  for (let x = bounds.startX; x <= bounds.endX; x += bounds.stepX) {
    verticalLines.push(x);
  }
  
  // Generate horizontal lines
  for (let y = bounds.startY; y <= bounds.endY; y += bounds.stepY) {
    horizontalLines.push(y);
  }
  
  return { verticalLines, horizontalLines };
}

/**
 * Calculate grid appearance based on zoom level
 */
export function calculateGridAppearance(scale: number): {
  showMajorGrid: boolean;
  showMinorGrid: boolean;
  majorOpacity: number;
  minorOpacity: number;
  majorStrokeWidth: number;
  minorStrokeWidth: number;
} {
  // Show different grid levels based on zoom
  const showMinorGrid = scale >= 0.5;
  const showMajorGrid = true;
  
  // Adjust opacity based on zoom level
  const baseOpacity = Math.max(0.1, Math.min(0.8, scale * 0.5));
  const majorOpacity = baseOpacity * 0.8;
  const minorOpacity = baseOpacity * 0.4;
  
  // Adjust stroke width based on zoom level
  const majorStrokeWidth = Math.max(0.5, 1 / scale);
  const minorStrokeWidth = Math.max(0.25, 0.5 / scale);
  
  return {
    showMajorGrid,
    showMinorGrid,
    majorOpacity,
    minorOpacity,
    majorStrokeWidth,
    minorStrokeWidth,
  };
}