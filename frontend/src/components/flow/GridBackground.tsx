/**
 * GridBackground Component
 * Renders grid background for Figma-like flow editor with proper scaling and visibility
 */

'use client';

import React, { useMemo } from 'react';
import { CanvasTransform, GridSettings } from '@/types/canvas';
import { 
  calculateVisibleGridBounds, 
  getGridLines, 
  calculateGridAppearance 
} from '@/utils/gridUtils';

interface GridBackgroundProps {
  width: number;
  height: number;
  transform: CanvasTransform;
  gridSettings: GridSettings;
  className?: string;
}

export default function GridBackground({
  width,
  height,
  transform,
  gridSettings,
  className = '',
}: GridBackgroundProps) {
  // Don't render if grid is not visible
  if (!gridSettings.visible) {
    return null;
  }

  // Calculate grid appearance based on zoom level
  const gridAppearance = useMemo(() => 
    calculateGridAppearance(transform.scale), 
    [transform.scale]
  );

  // Calculate visible grid bounds for performance
  const gridBounds = useMemo(() => 
    calculateVisibleGridBounds(width, height, transform, gridSettings.size),
    [width, height, transform, gridSettings.size]
  );

  // Get grid line positions
  const { verticalLines, horizontalLines } = useMemo(() => 
    getGridLines(gridBounds),
    [gridBounds]
  );

  // Major grid lines (every 5th line)
  const majorVerticalLines = verticalLines.filter((_, index) => index % 5 === 0);
  const majorHorizontalLines = horizontalLines.filter((_, index) => index % 5 === 0);

  // Minor grid lines (all other lines)
  const minorVerticalLines = verticalLines.filter((_, index) => index % 5 !== 0);
  const minorHorizontalLines = horizontalLines.filter((_, index) => index % 5 !== 0);

  return (
    <g className={`grid-background ${className}`}>
      {/* Minor grid lines */}
      {gridAppearance.showMinorGrid && (
        <g className="minor-grid">
          {/* Minor vertical lines */}
          {minorVerticalLines.map((x) => (
            <line
              key={`minor-v-${x}`}
              x1={x}
              y1={gridBounds.startY}
              x2={x}
              y2={gridBounds.endY}
              stroke="#e5e5e5"
              strokeWidth={gridAppearance.minorStrokeWidth}
              opacity={gridAppearance.minorOpacity}
              className="pointer-events-none"
            />
          ))}
          
          {/* Minor horizontal lines */}
          {minorHorizontalLines.map((y) => (
            <line
              key={`minor-h-${y}`}
              x1={gridBounds.startX}
              y1={y}
              x2={gridBounds.endX}
              y2={y}
              stroke="#e5e5e5"
              strokeWidth={gridAppearance.minorStrokeWidth}
              opacity={gridAppearance.minorOpacity}
              className="pointer-events-none"
            />
          ))}
        </g>
      )}

      {/* Major grid lines */}
      {gridAppearance.showMajorGrid && (
        <g className="major-grid">
          {/* Major vertical lines */}
          {majorVerticalLines.map((x) => (
            <line
              key={`major-v-${x}`}
              x1={x}
              y1={gridBounds.startY}
              x2={x}
              y2={gridBounds.endY}
              stroke="#d1d1d1"
              strokeWidth={gridAppearance.majorStrokeWidth}
              opacity={gridAppearance.majorOpacity}
              className="pointer-events-none"
            />
          ))}
          
          {/* Major horizontal lines */}
          {majorHorizontalLines.map((y) => (
            <line
              key={`major-h-${y}`}
              x1={gridBounds.startX}
              y1={y}
              x2={gridBounds.endX}
              y2={y}
              stroke="#d1d1d1"
              strokeWidth={gridAppearance.majorStrokeWidth}
              opacity={gridAppearance.majorOpacity}
              className="pointer-events-none"
            />
          ))}
        </g>
      )}

      {/* Origin indicator (0,0 point) */}
      {transform.scale > 0.3 && (
        <g className="origin-indicator">
          <circle
            cx={0}
            cy={0}
            r={3 / transform.scale}
            fill="#3b82f6"
            opacity={0.6}
            className="pointer-events-none"
          />
          <line
            x1={-10 / transform.scale}
            y1={0}
            x2={10 / transform.scale}
            y2={0}
            stroke="#3b82f6"
            strokeWidth={1 / transform.scale}
            opacity={0.6}
            className="pointer-events-none"
          />
          <line
            x1={0}
            y1={-10 / transform.scale}
            x2={0}
            y2={10 / transform.scale}
            stroke="#3b82f6"
            strokeWidth={1 / transform.scale}
            opacity={0.6}
            className="pointer-events-none"
          />
        </g>
      )}
    </g>
  );
}