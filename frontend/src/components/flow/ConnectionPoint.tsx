/**
 * ConnectionPoint Component
 * Renders connection points on flow components for creating connections
 */

'use client';

import React, { useCallback, useState } from 'react';
import { ConnectionPoint as ConnectionPointData } from '@/types/flowComponents';
import { Point } from '@/types/canvas';

export interface ConnectionPointProps {
  connectionPoint: ConnectionPointData;
  position: Point;
  scale: number;
  isVisible: boolean;
  isHovered?: boolean;
  isConnecting?: boolean;
  isValidTarget?: boolean;
  onMouseEnter?: (pointId: string) => void;
  onMouseLeave?: (pointId: string) => void;
  onConnectionStart?: (pointId: string, position: Point) => void;
  onConnectionEnd?: (pointId: string, position: Point) => void;
  className?: string;
}

export default function ConnectionPoint({
  connectionPoint,
  position,
  scale,
  isVisible,
  isHovered = false,
  isConnecting = false,
  isValidTarget = false,
  onMouseEnter,
  onMouseLeave,
  onConnectionStart,
  onConnectionEnd,
  className = '',
}: ConnectionPointProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter?.(connectionPoint.id);
  }, [connectionPoint.id, onMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    onMouseLeave?.(connectionPoint.id);
  }, [connectionPoint.id, onMouseLeave]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDragging(true);
    onConnectionStart?.(connectionPoint.id, position);
  }, [connectionPoint.id, position, onConnectionStart]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (isDragging) {
      setIsDragging(false);
      onConnectionEnd?.(connectionPoint.id, position);
    }
  }, [isDragging, connectionPoint.id, position, onConnectionEnd]);

  if (!isVisible) {
    return null;
  }

  // Calculate point size based on scale
  const pointSize = Math.max(6, 8 / scale);
  const hoverSize = Math.max(8, 10 / scale);
  const strokeWidth = Math.max(1, 2 / scale);

  // Determine point color based on type and state
  let fillColor = '#6b7280'; // default gray
  let strokeColor = '#ffffff';

  if (connectionPoint.type === 'input') {
    fillColor = '#3b82f6'; // blue for inputs
  } else if (connectionPoint.type === 'output') {
    fillColor = '#10b981'; // green for outputs
  }

  if (isConnecting) {
    if (isValidTarget) {
      fillColor = '#22c55e'; // bright green for valid targets
      strokeColor = '#ffffff';
    } else {
      fillColor = '#ef4444'; // red for invalid targets
      strokeColor = '#ffffff';
    }
  } else if (isHovered) {
    fillColor = '#f59e0b'; // orange on hover
  }

  const currentSize = isHovered || isConnecting ? hoverSize : pointSize;

  return (
    <g className={`connection-point ${className}`}>
      {/* Connection point circle */}
      <circle
        cx={position.x}
        cy={position.y}
        r={currentSize}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className={`
          cursor-crosshair
          transition-all
          duration-150
          ${isHovered ? 'scale-125' : 'scale-100'}
          ${isConnecting ? 'animate-pulse' : ''}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{
          transformOrigin: `${position.x}px ${position.y}px`,
        }}
      />
      
      {/* Connection point indicator ring for better visibility */}
      {(isHovered || isConnecting) && (
        <circle
          cx={position.x}
          cy={position.y}
          r={currentSize + 2}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth / 2}
          opacity={0.5}
          className="pointer-events-none"
        />
      )}
      
      {/* Connection point label (optional) */}
      {isHovered && connectionPoint.label && (
        <g className="pointer-events-none">
          <rect
            x={position.x - 20}
            y={position.y - 25}
            width={40}
            height={16}
            fill="rgba(0, 0, 0, 0.8)"
            rx={4}
          />
          <text
            x={position.x}
            y={position.y - 15}
            textAnchor="middle"
            fill="white"
            fontSize={10 / scale}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {connectionPoint.label}
          </text>
        </g>
      )}
    </g>
  );
}

// Helper component for rendering multiple connection points
export interface ConnectionPointsProps {
  connectionPoints: ConnectionPointData[];
  componentPosition: Point;
  componentSize: { width: number; height: number };
  scale: number;
  isVisible: boolean;
  hoveredPointId?: string | null;
  connectingFromPointId?: string | null;
  onPointHover?: (pointId: string | null) => void;
  onConnectionStart?: (pointId: string, position: Point) => void;
  onConnectionEnd?: (pointId: string, position: Point) => void;
}

export function ConnectionPoints({
  connectionPoints,
  componentPosition,
  componentSize,
  scale,
  isVisible,
  hoveredPointId,
  connectingFromPointId,
  onPointHover,
  onConnectionStart,
  onConnectionEnd,
}: ConnectionPointsProps) {
  // Calculate connection point positions
  const getConnectionPointPosition = useCallback((point: ConnectionPointData): Point => {
    const { offset } = point;

    switch (point.position) {
      case 'top':
        return {
          x: componentPosition.x + componentSize.width * offset,
          y: componentPosition.y,
        };
      case 'right':
        return {
          x: componentPosition.x + componentSize.width,
          y: componentPosition.y + componentSize.height * offset,
        };
      case 'bottom':
        return {
          x: componentPosition.x + componentSize.width * offset,
          y: componentPosition.y + componentSize.height,
        };
      case 'left':
        return {
          x: componentPosition.x,
          y: componentPosition.y + componentSize.height * offset,
        };
      default:
        return componentPosition;
    }
  }, [componentPosition, componentSize]);

  const handlePointMouseEnter = useCallback((pointId: string) => {
    onPointHover?.(pointId);
  }, [onPointHover]);

  const handlePointMouseLeave = useCallback((pointId: string) => {
    onPointHover?.(null);
  }, [onPointHover]);

  return (
    <g className="connection-points">
      {connectionPoints.map((point) => {
        const pointPosition = getConnectionPointPosition(point);
        const isHovered = hoveredPointId === point.id;
        const isConnecting = connectingFromPointId !== null;
        const isValidTarget = isConnecting && connectingFromPointId !== point.id;

        return (
          <ConnectionPoint
            key={point.id}
            connectionPoint={point}
            position={pointPosition}
            scale={scale}
            isVisible={isVisible}
            isHovered={isHovered}
            isConnecting={isConnecting}
            isValidTarget={isValidTarget}
            onMouseEnter={handlePointMouseEnter}
            onMouseLeave={handlePointMouseLeave}
            onConnectionStart={onConnectionStart}
            onConnectionEnd={onConnectionEnd}
          />
        );
      })}
    </g>
  );
}

// Connection point validation utilities
export function canConnectPoints(
  fromPoint: ConnectionPointData,
  toPoint: ConnectionPointData
): boolean {
  // Basic validation rules
  if (fromPoint.id === toPoint.id) return false;
  
  // Output can connect to input
  if (fromPoint.type === 'output' && toPoint.type === 'input') return true;
  
  // Input can connect to output
  if (fromPoint.type === 'input' && toPoint.type === 'output') return true;
  
  // Both-directional points can connect to anything
  if (fromPoint.type === 'both' || toPoint.type === 'both') return true;
  
  return false;
}

// Get connection point by ID
export function findConnectionPoint(
  connectionPoints: ConnectionPointData[],
  pointId: string
): ConnectionPointData | null {
  return connectionPoints.find(point => point.id === pointId) || null;
}

// Get all connection points of a specific type
export function getConnectionPointsByType(
  connectionPoints: ConnectionPointData[],
  type: ConnectionPointData['type']
): ConnectionPointData[] {
  return connectionPoints.filter(point => point.type === type);
}