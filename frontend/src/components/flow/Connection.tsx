/**
 * Connection Component
 * Renders connections (arrows) between flow components
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { Connection as ConnectionData } from '@/types/flowComponents';
import { Point } from '@/types/canvas';
import { generateConnectionPath } from '@/utils/connectionUtils';

export interface ConnectionProps {
  connection: ConnectionData;
  fromPoint: Point;
  toPoint: Point;
  isSelected?: boolean;
  isHovered?: boolean;
  isEditing?: boolean;
  scale?: number;
  style?: 'straight' | 'curved' | 'orthogonal';
  onSelect?: (connectionId: string) => void;
  onHover?: (connectionId: string | null) => void;
  onDoubleClick?: (connectionId: string) => void;
  onRightClick?: (connectionId: string, event: React.MouseEvent) => void;
  onLabelChange?: (connectionId: string, label: string) => void;
  className?: string;
}

export default function Connection({
  connection,
  fromPoint,
  toPoint,
  isSelected = false,
  isHovered = false,
  isEditing = false,
  scale = 1,
  style = 'curved',
  onSelect,
  onHover,
  onDoubleClick,
  onRightClick,
  onLabelChange,
  className = '',
}: ConnectionProps) {
  // Generate SVG path
  const path = useMemo(() => {
    return generateConnectionPath(fromPoint, toPoint, style);
  }, [fromPoint, toPoint, style]);

  // Calculate arrow marker position and rotation
  const arrowPosition = useMemo(() => {
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return {
      x: toPoint.x,
      y: toPoint.y,
      angle,
    };
  }, [fromPoint, toPoint]);

  // Calculate label position (midpoint of connection)
  const labelPosition = useMemo(() => {
    return {
      x: (fromPoint.x + toPoint.x) / 2,
      y: (fromPoint.y + toPoint.y) / 2,
    };
  }, [fromPoint, toPoint]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect?.(connection.id);
  }, [connection.id, onSelect]);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onDoubleClick?.(connection.id);
  }, [connection.id, onDoubleClick]);

  const handleRightClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onRightClick?.(connection.id, event);
  }, [connection.id, onRightClick]);

  const handleMouseEnter = useCallback(() => {
    onHover?.(connection.id);
  }, [connection.id, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  // Calculate stroke width based on scale
  const strokeWidth = Math.max(1, (connection.style?.strokeWidth || 2) / scale);
  const selectedStrokeWidth = Math.max(2, strokeWidth * 1.5);

  // Determine colors based on state
  const strokeColor = isSelected 
    ? '#3b82f6' 
    : isHovered 
      ? '#f59e0b' 
      : connection.style?.strokeColor || '#6b7280';

  const arrowSize = Math.max(6, 8 / scale);

  return (
    <g className={`connection ${className}`}>
      {/* Connection path */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? selectedStrokeWidth : strokeWidth}
        strokeDasharray={connection.style?.strokeDasharray}
        className={`
          cursor-pointer
          transition-all
          duration-150
          ${isHovered ? 'drop-shadow-sm' : ''}
        `}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleRightClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(10, strokeWidth * 3)}
        className="cursor-pointer"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleRightClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Arrow marker */}
      <g
        transform={`translate(${arrowPosition.x}, ${arrowPosition.y}) rotate(${arrowPosition.angle})`}
        className="pointer-events-none"
      >
        <polygon
          points={`0,0 -${arrowSize},-${arrowSize/2} -${arrowSize},${arrowSize/2}`}
          fill={strokeColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth / 2}
        />
      </g>

      {/* Connection label */}
      {(connection.label || isEditing) && (
        <g
          transform={`translate(${labelPosition.x}, ${labelPosition.y})`}
          className="pointer-events-none"
        >
          {/* Label background */}
          <rect
            x={isEditing ? -40 : -20}
            y={-8}
            width={isEditing ? 80 : 40}
            height={16}
            fill="rgba(255, 255, 255, 0.9)"
            stroke={strokeColor}
            strokeWidth={strokeWidth / 2}
            rx={4}
          />
          
          {isEditing ? (
            /* Editing mode - use foreignObject for input */
            <foreignObject
              x={-38}
              y={-6}
              width={76}
              height={12}
              className="pointer-events-auto"
            >
              <input
                type="text"
                defaultValue={connection.label || ''}
                className="w-full h-3 text-xs text-center border-none outline-none bg-transparent"
                style={{ 
                  fontSize: Math.max(8, 10 / scale),
                  fontFamily: 'Inter, system-ui, sans-serif',
                  color: strokeColor,
                }}
                autoFocus
                onBlur={(e) => {
                  onLabelChange?.(connection.id, e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onLabelChange?.(connection.id, e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    onLabelChange?.(connection.id, connection.label || '');
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </foreignObject>
          ) : (
            /* Display mode */
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fill={strokeColor}
              fontSize={Math.max(10, 12 / scale)}
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="500"
            >
              {connection.label}
            </text>
          )}
        </g>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <g className="pointer-events-none">
          {/* Selection outline */}
          <path
            d={path}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={selectedStrokeWidth + 2}
            strokeDasharray="4 2"
            opacity={0.5}
            style={{
              animation: 'connection-selection-dash 1s linear infinite',
            }}
          />
          
          {/* Selection handles at endpoints */}
          <circle
            cx={fromPoint.x}
            cy={fromPoint.y}
            r={4}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={1}
          />
          <circle
            cx={toPoint.x}
            cy={toPoint.y}
            r={4}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={1}
          />
        </g>
      )}
    </g>
  );
}

// Temporary connection component for showing connection being created
export interface TempConnectionProps {
  fromPoint: Point;
  toPoint: Point;
  isValid?: boolean;
  scale?: number;
  style?: 'straight' | 'curved' | 'orthogonal';
  className?: string;
}

export function TempConnection({
  fromPoint,
  toPoint,
  isValid = true,
  scale = 1,
  style = 'curved',
  className = '',
}: TempConnectionProps) {
  const path = useMemo(() => {
    return generateConnectionPath(fromPoint, toPoint, style);
  }, [fromPoint, toPoint, style]);

  const strokeColor = isValid ? '#22c55e' : '#ef4444';
  const strokeWidth = Math.max(1, 2 / scale);

  return (
    <g className={`temp-connection ${className}`}>
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray="4 2"
        opacity={0.7}
        className="pointer-events-none"
        style={{
          animation: 'temp-connection-dash 0.5s linear infinite',
        }}
      />
      
      {/* Endpoint indicator */}
      <circle
        cx={toPoint.x}
        cy={toPoint.y}
        r={Math.max(3, 4 / scale)}
        fill={strokeColor}
        opacity={0.8}
        className="pointer-events-none"
      />
    </g>
  );
}

// CSS animations (to be added to global styles)
export const connectionStyles = `
  @keyframes connection-selection-dash {
    0% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: 6;
    }
  }
  
  @keyframes temp-connection-dash {
    0% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: 6;
    }
  }
`;