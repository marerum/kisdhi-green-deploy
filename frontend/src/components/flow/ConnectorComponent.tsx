/**
 * ConnectorComponent - Renders a connector (arrow) as a canvas component
 */

'use client';

import React, { useMemo, useRef, useState } from 'react';
import FlowComponentBase, { FlowComponentBaseProps } from './FlowComponentBase';
import { FlowComponentData } from '@/types/flowComponents';
import { createConnection, updateConnectionPath, connectionExists } from '@/utils/connectionUtils';

export interface ConnectorComponentProps extends Omit<FlowComponentBaseProps, 'children'> {
  allComponents?: FlowComponentData[];
}

export default function ConnectorComponent(props: ConnectorComponentProps) {
  const { data } = props as { data: FlowComponentData };
  const { position, size, style } = data;
  const [isResizing, setIsResizing] = useState<null | 'left' | 'right'>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const lastStateRef = useRef<{ position: { x: number; y: number }; size: { width: number; height: number } } | null>(null);

  const from = useMemo(() => ({ x: position.x, y: position.y + size.height / 2 }), [position, size]);
  const to = useMemo(() => ({ x: position.x + size.width, y: position.y + size.height / 2 }), [position, size]);

  const strokeColor = style?.borderColor || style?.textColor || '#6b7280';
  const strokeWidth = style?.borderWidth || 2;
  const arrowSize = Math.max(6, Math.min(12, size.height * 0.6));

  const pathD = `M ${from.x} ${from.y} L ${to.x - arrowSize} ${to.y}`;

  // Start resizing when user presses a handle
  function startResize(event: React.MouseEvent, which: 'left' | 'right') {
    event.stopPropagation();
    event.preventDefault();
    setIsResizing(which);

    const svg = (event.currentTarget as SVGElement).ownerSVGElement as SVGSVGElement | null;
    if (!svg) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const pt = svg.createSVGPoint();
      pt.x = moveEvent.clientX;
      pt.y = moveEvent.clientY;
      const ctm = svg.getScreenCTM?.();
      if (!ctm) return;
      let loc = pt.matrixTransform(ctm.inverse());

      // Snapping: find nearest connection point from other components
      try {
        const allComponents = (props as any).allComponents as FlowComponentData[] | undefined;
        const SNAP_DISTANCE = 24;
        if (allComponents && allComponents.length > 0) {
          let best: { x: number; y: number; dist: number } | undefined = undefined;
          for (let i = 0; i < allComponents.length; i++) {
            const c = allComponents[i];
            if (c.id === data.id) continue;
            const cps = (c.connectionPoints || []) as any[];
            for (let j = 0; j < cps.length; j++) {
              const cp = cps[j];
              let px = c.position.x;
              let py = c.position.y;
              const offset = typeof cp.offset === 'number' ? cp.offset : 0.5;
              switch (cp.position) {
                case 'top':
                  px = c.position.x + c.size.width * offset;
                  py = c.position.y;
                  break;
                case 'right':
                  px = c.position.x + c.size.width;
                  py = c.position.y + c.size.height * offset;
                  break;
                case 'bottom':
                  px = c.position.x + c.size.width * offset;
                  py = c.position.y + c.size.height;
                  break;
                case 'left':
                default:
                  px = c.position.x;
                  py = c.position.y + c.size.height * offset;
                  break;
              }
              const dx = px - loc.x;
              const dy = py - loc.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (!best || d < best.dist) {
                best = { x: px, y: py, dist: d };
              }
            }
          }

          if (best && best.dist <= SNAP_DISTANCE) {
            loc.x = best.x;
            loc.y = best.y;
          }
        }
      } catch (err) {
        // ignore snapping errors
        console.error('Connector snap error', err);
      }

      if (which === 'left') {
        const rightX = position.x + size.width;
        const newX = Math.min(loc.x, rightX - 20);
        const newWidth = Math.max(20, rightX - newX);
        const newState = { position: { x: newX, y: loc.y - size.height / 2 }, size: { width: newWidth, height: size.height } };
        lastStateRef.current = newState;
        props.onUpdate?.(data.id, newState as any);
      } else {
        const leftX = position.x;
        const newRight = Math.max(loc.x, leftX + 20);
        const newWidth = Math.max(20, newRight - leftX);
        const newState = { position: { x: leftX, y: loc.y - size.height / 2 }, size: { width: newWidth, height: size.height } };
        lastStateRef.current = newState;
        props.onUpdate?.(data.id, newState as any);
      }
    };

    const onMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // On resize end, check if endpoints snapped to real components and create logical Connection
      try {
        const finalState = lastStateRef.current || { position, size };
        const leftX = finalState.position.x;
        const rightX = finalState.position.x + finalState.size.width;
        const midY = finalState.position.y + finalState.size.height / 2;

        const allComponents = (props as any).allComponents as FlowComponentData[] | undefined;
        const existingConnections = (props as any).connections as any[] | undefined;
        const onConnectionsChange = (props as any).onConnectionsChange as ((conns: any[]) => void) | undefined;

        if (allComponents && allComponents.length > 0 && onConnectionsChange) {
          const allPoints: { componentId: string; pointId: string; x: number; y: number }[] = [];
          allComponents.forEach((c) => {
            if (c.id === data.id) return;
            (c.connectionPoints || []).forEach((cp: any) => {
              let px = c.position.x;
              let py = c.position.y;
              const offset = typeof cp.offset === 'number' ? cp.offset : 0.5;
              switch (cp.position) {
                case 'top':
                  px = c.position.x + c.size.width * offset;
                  py = c.position.y;
                  break;
                case 'right':
                  px = c.position.x + c.size.width;
                  py = c.position.y + c.size.height * offset;
                  break;
                case 'bottom':
                  px = c.position.x + c.size.width * offset;
                  py = c.position.y + c.size.height;
                  break;
                case 'left':
                default:
                  px = c.position.x;
                  py = c.position.y + c.size.height * offset;
                  break;
              }
              allPoints.push({ componentId: c.id, pointId: cp.id, x: px, y: py });
            });
          });

          const SNAP_DISTANCE = 24;
          const findNearest = (x: number, y: number) => {
            let best = null as null | { componentId: string; pointId: string; x: number; y: number; dist: number };
            allPoints.forEach((p) => {
              const dx = p.x - x;
              const dy = p.y - y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (best === null || d < best.dist) {
                best = { ...p, dist: d } as any;
              }
            });
            return best;
          };

          const nearestLeft = findNearest(leftX, midY);
          const nearestRight = findNearest(rightX, midY);

          const leftSnap = nearestLeft && nearestLeft.dist <= SNAP_DISTANCE ? nearestLeft : null;
          const rightSnap = nearestRight && nearestRight.dist <= SNAP_DISTANCE ? nearestRight : null;

          if (leftSnap && rightSnap && leftSnap.componentId !== rightSnap.componentId) {
            if (!connectionExists(leftSnap.componentId, leftSnap.pointId, rightSnap.componentId, rightSnap.pointId, existingConnections || [])) {
              const conn = createConnection(leftSnap.componentId, leftSnap.pointId, rightSnap.componentId, rightSnap.pointId);
              const updated = updateConnectionPath(conn, allComponents.concat(data));
              onConnectionsChange([...(existingConnections || []), updated]);
            }
          }
        }
      } catch (err) {
        console.error('Error creating connection after connector resize:', err);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  return (
    <FlowComponentBase {...props}>
      <g ref={groupRef}>
        {/* Invisible background for hit testing */}
        <rect
          x={position.x}
          y={position.y}
          width={size.width}
          height={size.height}
          fill="transparent"
          className="pointer-events-auto"
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Arrow head */}
        <g transform={`translate(${to.x}, ${to.y}) rotate(0)`}>
          <polygon
            points={`0,0 -${arrowSize},-${arrowSize / 2} -${arrowSize},${arrowSize / 2}`}
            fill={strokeColor}
          />
        </g>

        {/* Resize handles at endpoints */}
        <circle
          cx={from.x}
          cy={from.y}
          r={6}
          fill="#ffffff"
          stroke={strokeColor}
          strokeWidth={1}
          className="cursor-ew-resize"
          onMouseDown={(e) => startResize(e, 'left')}
          onDoubleClick={(e) => e.stopPropagation()}
        />

        <circle
          cx={to.x}
          cy={to.y}
          r={6}
          fill="#ffffff"
          stroke={strokeColor}
          strokeWidth={1}
          className="cursor-ew-resize"
          onMouseDown={(e) => startResize(e, 'right')}
          onDoubleClick={(e) => e.stopPropagation()}
        />

      </g>

      {/* Optional label */}
      {data.text && (
        <text
          x={position.x + size.width / 2}
          y={position.y + size.height / 2 - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={style?.textColor || strokeColor}
          fontSize={12}
          className="pointer-events-none select-none"
        >
          {data.text}
        </text>
      )}
    </FlowComponentBase>
  );
}
