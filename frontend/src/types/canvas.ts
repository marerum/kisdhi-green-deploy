/**
 * Canvas-related type definitions for Figma-like flow editor
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export interface GridSettings {
  size: number;
  visible: boolean;
  snapEnabled: boolean;
}

export interface CanvasState {
  transform: CanvasTransform;
  grid: GridSettings;
  selection: {
    componentIds: number[];
    selectionBox?: Rectangle;
  };
  viewport: {
    width: number;
    height: number;
  };
}

export interface CanvasConfig {
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  panSensitivity: number;
  defaultGridSize: number;
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CanvasEventHandlers {
  onPan?: (delta: Point) => void;
  onZoom?: (scale: number, center: Point) => void;
  onSelectionChange?: (componentIds: number[]) => void;
}