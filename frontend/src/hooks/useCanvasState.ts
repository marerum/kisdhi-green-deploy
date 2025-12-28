/**
 * Canvas state management hook for Figma-like flow editor
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { CanvasState, CanvasTransform, Point, CanvasConfig, ViewportBounds } from '@/types/canvas';
import { snapToGrid } from '@/utils/gridUtils';

const DEFAULT_CONFIG: CanvasConfig = {
  minZoom: 0.1,
  maxZoom: 5.0,
  zoomStep: 0.1,
  panSensitivity: 1.0,
  defaultGridSize: 20,
};

const DEFAULT_CANVAS_STATE: CanvasState = {
  transform: {
    x: 0,
    y: 0,
    scale: 1.0,
  },
  grid: {
    size: DEFAULT_CONFIG.defaultGridSize,
    visible: true,
    snapEnabled: true,
  },
  selection: {
    componentIds: [],
  },
  viewport: {
    width: 800,
    height: 600,
  },
};

export function useCanvasState(config: Partial<CanvasConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [canvasState, setCanvasState] = useState<CanvasState>(DEFAULT_CANVAS_STATE);
  const isDragging = useRef(false);
  const lastMousePosition = useRef<Point>({ x: 0, y: 0 });

  // Update viewport size
  const updateViewport = useCallback((width: number, height: number) => {
    console.log('Updating viewport size:', { width, height });
    setCanvasState(prev => ({
      ...prev,
      viewport: { width, height },
    }));
  }, []);

  // Pan the canvas
  const pan = useCallback((delta: Point) => {
    setCanvasState(prev => ({
      ...prev,
      transform: {
        ...prev.transform,
        x: prev.transform.x + delta.x * finalConfig.panSensitivity,
        y: prev.transform.y + delta.y * finalConfig.panSensitivity,
      },
    }));
  }, [finalConfig.panSensitivity]);

  // Zoom the canvas
  const zoom = useCallback((scaleDelta: number, center?: Point) => {
    setCanvasState(prev => {
      const newScale = Math.max(
        finalConfig.minZoom,
        Math.min(finalConfig.maxZoom, prev.transform.scale + scaleDelta)
      );

      if (newScale === prev.transform.scale) {
        return prev; // No change if zoom is at limits
      }

      let newTransform = { ...prev.transform, scale: newScale };

      // If center point is provided, zoom towards that point
      if (center) {
        const scaleRatio = newScale / prev.transform.scale;
        newTransform.x = center.x - (center.x - prev.transform.x) * scaleRatio;
        newTransform.y = center.y - (center.y - prev.transform.y) * scaleRatio;
      }

      return {
        ...prev,
        transform: newTransform,
      };
    });
  }, [finalConfig.minZoom, finalConfig.maxZoom]);

  // Set zoom to specific value
  const setZoom = useCallback((scale: number, center?: Point) => {
    setCanvasState(prev => {
      const clampedScale = Math.max(finalConfig.minZoom, Math.min(finalConfig.maxZoom, scale));
      const scaleDelta = clampedScale - prev.transform.scale;
      
      if (Math.abs(scaleDelta) < 0.001) {
        return prev; // No change if scale is essentially the same
      }

      let newTransform = { ...prev.transform, scale: clampedScale };

      // If center point is provided, zoom towards that point
      if (center) {
        const scaleRatio = clampedScale / prev.transform.scale;
        newTransform.x = center.x - (center.x - prev.transform.x) * scaleRatio;
        newTransform.y = center.y - (center.y - prev.transform.y) * scaleRatio;
      }

      return {
        ...prev,
        transform: newTransform,
      };
    });
  }, [finalConfig.minZoom, finalConfig.maxZoom]);

  // Reset canvas to default state
  const resetCanvas = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      transform: DEFAULT_CANVAS_STATE.transform,
    }));
  }, []);

  // Fit canvas to content
  const fitToContent = useCallback((components?: any[] | null) => {
    if (!components || components.length === 0) {
      resetCanvas();
      return;
    }

    console.log('=== FIT TO CONTENT DEBUG ===');
    console.log('Components:', components);
    console.log('Viewport:', canvasState.viewport);

    // Calculate bounding box of all components
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    components.forEach(component => {
      if (!component || !component.position) {
        console.log('Skipping invalid component:', component);
        return;
      }
      
      const x = component.position.x;
      const y = component.position.y;
      const width = component.size?.width || 120; // Default component width
      const height = component.size?.height || 60; // Default component height

      console.log(`Component at (${x}, ${y}) size ${width}x${height}`);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    console.log('Bounding box:', { minX, minY, maxX, maxY });

    // If no valid components found, reset
    if (minX === Infinity || maxX === -Infinity) {
      console.log('No valid components found, resetting canvas');
      resetCanvas();
      return;
    }

    // FORCE A SIMPLE 1:1 SCALE WITH CENTERING
    // This bypasses all the complex scaling logic and just centers at 100% scale
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    
    const viewportCenterX = canvasState.viewport.width / 2;
    const viewportCenterY = canvasState.viewport.height / 2;

    // Calculate transform to center the content at 100% scale
    const targetX = viewportCenterX - contentCenterX;
    const targetY = viewportCenterY - contentCenterY;
    const targetScale = 1.0; // Force 100% scale

    console.log('FORCING 100% SCALE WITH CENTERING:', {
      contentCenter: { x: contentCenterX, y: contentCenterY },
      viewportCenter: { x: viewportCenterX, y: viewportCenterY },
      finalTransform: { x: targetX, y: targetY, scale: targetScale }
    });

    // Apply the transform
    setCanvasState(prev => ({
      ...prev,
      transform: {
        x: targetX,
        y: targetY,
        scale: targetScale,
      },
    }));

    console.log('=== FIT TO CONTENT COMPLETE (FORCED 100%) ===');
  }, [canvasState.viewport, resetCanvas, setCanvasState]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenPoint: Point): Point => {
    const { transform } = canvasState;
    return {
      x: (screenPoint.x - transform.x) / transform.scale,
      y: (screenPoint.y - transform.y) / transform.scale,
    };
  }, [canvasState]);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasPoint: Point): Point => {
    const { transform } = canvasState;
    return {
      x: canvasPoint.x * transform.scale + transform.x,
      y: canvasPoint.y * transform.scale + transform.y,
    };
  }, [canvasState]);

  // Snap point to grid if snap is enabled
  const snapPointToGrid = useCallback((point: Point): Point => {
    if (canvasState.grid.snapEnabled) {
      return snapToGrid(point, canvasState.grid.size);
    }
    return point;
  }, [canvasState.grid.snapEnabled, canvasState.grid.size]);

  // Grid settings
  const toggleGrid = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      grid: {
        ...prev.grid,
        visible: !prev.grid.visible,
      },
    }));
  }, []);

  const toggleSnapToGrid = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      grid: {
        ...prev.grid,
        snapEnabled: !prev.grid.snapEnabled,
      },
    }));
  }, []);

  const setGridSize = useCallback((size: number) => {
    setCanvasState(prev => ({
      ...prev,
      grid: {
        ...prev.grid,
        size: Math.max(5, Math.min(100, size)), // Clamp between 5 and 100
      },
    }));
  }, []);

  // Selection management
  const setSelection = useCallback((componentIds: number[]) => {
    setCanvasState(prev => ({
      ...prev,
      selection: {
        ...prev.selection,
        componentIds,
      },
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelection([]);
  }, [setSelection]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
      // Middle mouse button or Ctrl + left click for panning
      isDragging.current = true;
      lastMousePosition.current = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging.current) {
      const delta = {
        x: event.clientX - lastMousePosition.current.x,
        y: event.clientY - lastMousePosition.current.y,
      };
      pan(delta);
      lastMousePosition.current = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
  }, [pan]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Zoom with Ctrl/Cmd + wheel
      event.preventDefault();
      const scaleDelta = -event.deltaY * 0.001 * finalConfig.zoomStep;
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const center = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      zoom(scaleDelta, center);
    }
  }, [zoom, finalConfig.zoomStep]);

  return {
    // State
    canvasState,
    config: finalConfig,
    
    // Transform operations
    pan,
    zoom,
    setZoom,
    resetCanvas,
    fitToContent,
    
    // Coordinate conversion
    screenToCanvas,
    canvasToScreen,
    snapPointToGrid,
    
    // Grid operations
    toggleGrid,
    toggleSnapToGrid,
    setGridSize,
    
    // Selection operations
    setSelection,
    clearSelection,
    
    // Viewport operations
    updateViewport,
    
    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    
    // Computed values
    isZoomedIn: canvasState.transform.scale > 1,
    isZoomedOut: canvasState.transform.scale < 1,
    canZoomIn: canvasState.transform.scale < finalConfig.maxZoom,
    canZoomOut: canvasState.transform.scale > finalConfig.minZoom,
  };
}