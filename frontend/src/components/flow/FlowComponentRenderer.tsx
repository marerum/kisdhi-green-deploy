/**
 * FlowComponentRenderer - Renders flow components based on their type
 * Acts as a factory for rendering different component types
 */

'use client';

import React from 'react';
import { FlowComponentData } from '@/types/flowComponents';
import { FlowComponentBaseProps } from './FlowComponentBase';
import ProcessStepComponent from './ProcessStepComponent';
import DecisionComponent from './DecisionComponent';
import StartEndComponent from './StartEndComponent';
import ConnectorComponent from './ConnectorComponent';
import ActorComponent from './ActorComponent';
import StepComponent from './StepComponent';

export interface FlowComponentRendererProps extends Omit<FlowComponentBaseProps, 'data'> {
  component: FlowComponentData;
  connectingFromPointId?: string | null;
  allComponents?: FlowComponentData[];
  selectedComponentsCount?: number;
}

export default function FlowComponentRenderer({
  component,
  connectingFromPointId,
  allComponents,
  selectedComponentsCount = 1,
  ...baseProps
}: FlowComponentRendererProps) {
  // Don't render if component is not visible
  if (component.visible === false) {
    return null;
  }

  const props = {
    ...baseProps,
    data: component,
    // Hide individual resize handles when multiple components are selected
    showResizeHandles: selectedComponentsCount <= 1,
  };

  switch (component.type) {
    case 'process':
      return <ProcessStepComponent {...props} />;
    
    case 'decision':
      return <DecisionComponent {...props} />;
    
    case 'start':
    case 'end':
      return <StartEndComponent {...props} />;
    
    case 'connector':
      return <ConnectorComponent {...props} allComponents={allComponents} />;
    
    case 'actor':
      return <ActorComponent {...props} />;
    
    case 'step':
      return <StepComponent {...props} />;
    
    default:
      console.warn(`Unknown component type: ${component.type}`);
      return null;
  }
}

// Helper function to get component display name
export function getComponentDisplayName(type: FlowComponentData['type']): string {
  switch (type) {
    case 'process':
      return 'プロセス';
    case 'decision':
      return '判断';
    case 'start':
      return '開始';
    case 'end':
      return '終了';
    case 'connector':
      return '矢印';
    case 'actor':
      return '登場人物';
    case 'step':
      return 'ステップ';
    default:
      return type;
  }
}

// Helper function to check if component type supports text editing
export function isTextEditable(type: FlowComponentData['type']): boolean {
  return ['process', 'decision', 'start', 'end', 'actor', 'step'].includes(type);
}

// Helper function to check if component type supports resizing
export function isResizable(type: FlowComponentData['type']): boolean {
  return ['process', 'decision', 'actor', 'step'].includes(type);
}

// Helper function to get minimum size for component type
export function getMinimumSize(type: FlowComponentData['type']): { width: number; height: number } {
  switch (type) {
    case 'process':
      return { width: 100, height: 60 };
    case 'decision':
      return { width: 80, height: 80 };
    case 'start':
    case 'end':
      return { width: 60, height: 60 };
    case 'connector':
      return { width: 80, height: 20 };
    case 'actor':
      return { width: 100, height: 30 };
    case 'step':
      return { width: 100, height: 30 };
    default:
      return { width: 80, height: 60 };
  }
}