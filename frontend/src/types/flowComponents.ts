/**
 * Flow component type definitions for Figma-like flow editor
 */

import { Point } from './canvas';

export type FlowComponentType = 'process' | 'decision' | 'start' | 'end' | 'connector';

export interface FlowComponentStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
}

export interface ConnectionPoint {
  id: string;
  position: 'top' | 'right' | 'bottom' | 'left';
  offset: number; // 0-1 along the edge
  type: 'input' | 'output' | 'both';
  label?: string;
}

export interface FlowComponentData {
  id: string;
  type: FlowComponentType;
  position: Point;
  size: { width: number; height: number };
  text: string;
  style: FlowComponentStyle;
  connectionPoints: ConnectionPoint[];
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  metadata?: Record<string, any>;
}

export interface Connection {
  id: string;
  from: { componentId: string; pointId: string };
  to: { componentId: string; pointId: string };
  path?: string; // SVG path data
  label?: string;
  style?: {
    strokeColor: string;
    strokeWidth: number;
    strokeDasharray?: string;
  };
}

export interface ComponentTemplate {
  type: FlowComponentType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultSize: { width: number; height: number };
  defaultStyle: FlowComponentStyle;
  defaultConnectionPoints: Omit<ConnectionPoint, 'id'>[];
  category: 'basic' | 'advanced' | 'connectors';
}

export interface DraggedComponent {
  template: ComponentTemplate;
  offset: Point; // Offset from mouse position
}

export interface ComponentLibraryCategory {
  id: string;
  name: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  templates: ComponentTemplate[];
  collapsed?: boolean;
}

// Default styles for different component types
export const DEFAULT_COMPONENT_STYLES: Record<FlowComponentType, FlowComponentStyle> = {
  process: {
    backgroundColor: '#4f46e5',
    borderColor: '#3730a3',
    textColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 8,
  },
  decision: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
    textColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 0,
  },
  start: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
    textColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 50,
  },
  end: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
    textColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 50,
  },
  connector: {
    backgroundColor: 'transparent',
    borderColor: '#6b7280',
    textColor: '#374151',
    borderWidth: 2,
    borderRadius: 0,
  },
};

// Default sizes for different component types
export const DEFAULT_COMPONENT_SIZES: Record<FlowComponentType, { width: number; height: number }> = {
  process: { width: 160, height: 80 },
  decision: { width: 120, height: 120 },
  start: { width: 80, height: 80 },
  end: { width: 80, height: 80 },
  connector: { width: 100, height: 20 },
};

// Default connection points for different component types
export const DEFAULT_CONNECTION_POINTS: Record<FlowComponentType, Omit<ConnectionPoint, 'id'>[]> = {
  process: [
    { position: 'top', offset: 0.5, type: 'input' },
    { position: 'right', offset: 0.5, type: 'output' },
    { position: 'bottom', offset: 0.5, type: 'output' },
    { position: 'left', offset: 0.5, type: 'input' },
  ],
  decision: [
    { position: 'top', offset: 0.5, type: 'input' },
    { position: 'right', offset: 0.5, type: 'output' },
    { position: 'bottom', offset: 0.5, type: 'output' },
    { position: 'left', offset: 0.5, type: 'output' },
  ],
  start: [
    { position: 'right', offset: 0.5, type: 'output' },
    { position: 'bottom', offset: 0.5, type: 'output' },
  ],
  end: [
    { position: 'top', offset: 0.5, type: 'input' },
    { position: 'left', offset: 0.5, type: 'input' },
  ],
  connector: [
    { position: 'left', offset: 0.5, type: 'input' },
    { position: 'right', offset: 0.5, type: 'output' },
  ],
};