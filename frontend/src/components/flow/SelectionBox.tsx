/**
 * SelectionBox Component
 * Renders the selection box for multi-selecting components
 */

'use client';

import React from 'react';
import { SelectionBox as SelectionBoxType } from '@/hooks/useSelection';

export interface SelectionBoxProps {
  selectionBox: SelectionBoxType | null;
  className?: string;
}

export default function SelectionBox({ selectionBox, className = '' }: SelectionBoxProps) {
  if (!selectionBox || !selectionBox.isActive) {
    return null;
  }

  const { start, end } = selectionBox;
  
  // Calculate rectangle dimensions
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <rect
      x={left}
      y={top}
      width={width}
      height={height}
      fill="rgba(59, 130, 246, 0.1)"
      stroke="#3b82f6"
      strokeWidth="1"
      strokeDasharray="4 2"
      className={`pointer-events-none ${className}`}
      style={{
        animation: 'selection-box-dash 1s linear infinite',
      }}
    />
  );
}

// Selection bounds component for showing the bounds of selected components
export interface SelectionBoundsProps {
  bounds: { x: number; y: number; width: number; height: number } | null;
  className?: string;
}

export function SelectionBounds({ bounds, className = '' }: SelectionBoundsProps) {
  if (!bounds) {
    return null;
  }

  const padding = 4;
  
  return (
    <g className={`pointer-events-none ${className}`}>
      {/* Selection bounds rectangle */}
      <rect
        x={bounds.x - padding}
        y={bounds.y - padding}
        width={bounds.width + padding * 2}
        height={bounds.height + padding * 2}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="6 3"
        rx="4"
        style={{
          animation: 'selection-bounds-dash 2s linear infinite',
        }}
      />
      
      {/* Corner handles */}
      {[
        { x: bounds.x - padding, y: bounds.y - padding }, // top-left
        { x: bounds.x + bounds.width + padding, y: bounds.y - padding }, // top-right
        { x: bounds.x - padding, y: bounds.y + bounds.height + padding }, // bottom-left
        { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding }, // bottom-right
      ].map((corner, index) => (
        <rect
          key={index}
          x={corner.x - 3}
          y={corner.y - 3}
          width="6"
          height="6"
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth="1"
          rx="1"
        />
      ))}
      
      {/* Side handles */}
      {[
        { x: bounds.x + bounds.width / 2, y: bounds.y - padding }, // top
        { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height / 2 }, // right
        { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + padding }, // bottom
        { x: bounds.x - padding, y: bounds.y + bounds.height / 2 }, // left
      ].map((handle, index) => (
        <rect
          key={`side-${index}`}
          x={handle.x - 2}
          y={handle.y - 2}
          width="4"
          height="4"
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth="1"
          rx="1"
        />
      ))}
    </g>
  );
}

// CSS animations (to be added to global styles)
export const selectionBoxStyles = `
  @keyframes selection-box-dash {
    0% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: 6;
    }
  }
  
  @keyframes selection-bounds-dash {
    0% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: 9;
    }
  }
`;