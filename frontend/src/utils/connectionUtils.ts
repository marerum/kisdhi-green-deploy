/**
 * Connection Utilities
 * Helper functions for managing connections between flow components
 */

import { Point } from '@/types/canvas';
import { FlowComponentData, ConnectionPoint, Connection } from '@/types/flowComponents';

// Choose the best connection point on a component for connecting to a target point.
// Preference: a connection point whose side faces the target (top/right/bottom/left).
// If multiple candidates match, choose the nearest. If none match, choose the nearest point.
export function findBestConnectionPoint(
  component: FlowComponentData,
  target: Point
): { point: ConnectionPoint; position: Point } | null {
  if (!component || !component.connectionPoints || component.connectionPoints.length === 0) return null;

  const candidates: Array<{ point: ConnectionPoint; pos: Point; dist: number; sideMatch: boolean }> = [];

  const center = {
    x: component.position.x + component.size.width / 2,
    y: component.position.y + component.size.height / 2,
  };

  component.connectionPoints.forEach((cp) => {
    const pos = getConnectionPointPosition(component, cp.id) as Point;
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Determine if side faces the target (simple sign check)
    let sideMatch = false;
    switch (cp.position) {
      case 'top':
        sideMatch = dy < 0;
        break;
      case 'right':
        sideMatch = dx > 0;
        break;
      case 'bottom':
        sideMatch = dy > 0;
        break;
      case 'left':
      default:
        sideMatch = dx < 0;
        break;
    }

    candidates.push({ point: cp, pos, dist, sideMatch });
  });

  // Prefer side matches
  const sideMatches = candidates.filter(c => c.sideMatch);
  const pool = sideMatches.length > 0 ? sideMatches : candidates;

  // Choose the nearest from pool
  pool.sort((a, b) => a.dist - b.dist);
  const best = pool[0];
  if (!best) return null;
  return { point: best.point, position: best.pos };
}

// Offset a given connection point position slightly outward based on which side it belongs to.
export function offsetPointOutward(component: FlowComponentData, pointPos: Point, padding: number): Point {
  // find which side this point belongs to by comparing to component bounds
  const left = component.position.x;
  const right = component.position.x + component.size.width;
  const top = component.position.y;
  const bottom = component.position.y + component.size.height;

  // If the point is close to a side, offset outward along that axis
  const eps = 1; // tolerance

  if (Math.abs(pointPos.y - top) <= eps) {
    return { x: pointPos.x, y: pointPos.y - padding };
  }
  if (Math.abs(pointPos.x - right) <= eps) {
    return { x: pointPos.x + padding, y: pointPos.y };
  }
  if (Math.abs(pointPos.y - bottom) <= eps) {
    return { x: pointPos.x, y: pointPos.y + padding };
  }
  if (Math.abs(pointPos.x - left) <= eps) {
    return { x: pointPos.x - padding, y: pointPos.y };
  }

  // fallback: return as-is
  return pointPos;
}

// Shorten a segment by moving each endpoint toward the other by amount/2.
export function shortenEndpoints(fromPoint: Point, toPoint: Point, amount: number): { from: Point; to: Point } {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len <= 0) return { from: fromPoint, to: toPoint };
  const shrink = Math.min(amount, len - 1); // avoid reversing
  const ux = dx / len;
  const uy = dy / len;
  const half = shrink / 2;
  return {
    from: { x: fromPoint.x + ux * half, y: fromPoint.y + uy * half },
    to: { x: toPoint.x - ux * half, y: toPoint.y - uy * half },
  };
}

// Connection validation
export function validateConnection(
  fromComponent: FlowComponentData,
  fromPointId: string,
  toComponent: FlowComponentData,
  toPointId: string
): { isValid: boolean; reason?: string } {
  // Can't connect to self
  if (fromComponent.id === toComponent.id) {
    return { isValid: false, reason: 'Cannot connect component to itself' };
  }

  // Find connection points
  const fromPoint = fromComponent.connectionPoints.find(p => p.id === fromPointId);
  const toPoint = toComponent.connectionPoints.find(p => p.id === toPointId);

  if (!fromPoint || !toPoint) {
    return { isValid: false, reason: 'Connection point not found' };
  }

  // Check type compatibility
  if (fromPoint.type === 'output' && toPoint.type === 'input') {
    return { isValid: true };
  }
  
  if (fromPoint.type === 'input' && toPoint.type === 'output') {
    return { isValid: true };
  }
  
  if (fromPoint.type === 'both' || toPoint.type === 'both') {
    return { isValid: true };
  }

  return { isValid: false, reason: 'Incompatible connection point types' };
}

// Calculate connection point position
export function getConnectionPointPosition(
  component: FlowComponentData,
  pointId: string
): Point | null {
  const point = component.connectionPoints.find(p => p.id === pointId);
  if (!point) return null;

  const { position, size } = component;
  const { offset } = point;

  switch (point.position) {
    case 'top':
      return {
        x: position.x + size.width * offset,
        y: position.y,
      };
    case 'right':
      return {
        x: position.x + size.width,
        y: position.y + size.height * offset,
      };
    case 'bottom':
      return {
        x: position.x + size.width * offset,
        y: position.y + size.height,
      };
    case 'left':
      return {
        x: position.x,
        y: position.y + size.height * offset,
      };
    default:
      return position;
  }
}

// Get endpoint position offset slightly outside the component border to avoid overlapping
export function getConnectionEndpointPosition(
  component: FlowComponentData,
  pointId: string,
  padding: number = 6
): Point | null {
  const point = component.connectionPoints.find(p => p.id === pointId);
  if (!point) return null;

  const base = getConnectionPointPosition(component, pointId);
  if (!base) return null;

  // Offset outwards depending on side
  switch (point.position) {
    case 'top':
      return { x: base.x, y: base.y - padding };
    case 'right':
      return { x: base.x + padding, y: base.y };
    case 'bottom':
      return { x: base.x, y: base.y + padding };
    case 'left':
    default:
      return { x: base.x - padding, y: base.y };
  }
}

// Generate SVG path for connection
export function generateConnectionPath(
  fromPoint: Point,
  toPoint: Point,
  style: 'straight' | 'curved' | 'orthogonal' = 'curved'
): string {
  switch (style) {
    case 'straight':
      return `M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`;
    
    case 'curved':
      return generateCurvedPath(fromPoint, toPoint);
    
    case 'orthogonal':
      return generateOrthogonalPath(fromPoint, toPoint);
    
    default:
      return generateCurvedPath(fromPoint, toPoint);
  }
}

// Generate curved connection path (Bezier curve)
function generateCurvedPath(fromPoint: Point, toPoint: Point): string {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  
  // Control point offset based on distance
  const controlOffset = Math.min(Math.abs(dx) * 0.5, 100);
  
  const cp1x = fromPoint.x + controlOffset;
  const cp1y = fromPoint.y;
  const cp2x = toPoint.x - controlOffset;
  const cp2y = toPoint.y;
  
  return `M ${fromPoint.x} ${fromPoint.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPoint.x} ${toPoint.y}`;
}

// Generate orthogonal connection path (right angles)
function generateOrthogonalPath(fromPoint: Point, toPoint: Point): string {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  
  // Simple L-shaped path
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal first
    const midX = fromPoint.x + dx * 0.5;
    return `M ${fromPoint.x} ${fromPoint.y} L ${midX} ${fromPoint.y} L ${midX} ${toPoint.y} L ${toPoint.x} ${toPoint.y}`;
  } else {
    // Vertical first
    const midY = fromPoint.y + dy * 0.5;
    return `M ${fromPoint.x} ${fromPoint.y} L ${fromPoint.x} ${midY} L ${toPoint.x} ${midY} L ${toPoint.x} ${toPoint.y}`;
  }
}

// Calculate connection bounds (for selection and collision detection)
export function getConnectionBounds(connection: Connection, components: FlowComponentData[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  const fromComponent = components.find(c => c.id === connection.from.componentId);
  const toComponent = components.find(c => c.id === connection.to.componentId);
  
  if (!fromComponent || !toComponent) return null;
  
  const fromPoint = getConnectionPointPosition(fromComponent, connection.from.pointId);
  const toPoint = getConnectionPointPosition(toComponent, connection.to.pointId);
  
  if (!fromPoint || !toPoint) return null;
  
  const minX = Math.min(fromPoint.x, toPoint.x);
  const minY = Math.min(fromPoint.y, toPoint.y);
  const maxX = Math.max(fromPoint.x, toPoint.x);
  const maxY = Math.max(fromPoint.y, toPoint.y);
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Check if a point is near a connection path
export function isPointNearConnection(
  point: Point,
  connection: Connection,
  components: FlowComponentData[],
  threshold: number = 10
): boolean {
  const fromComponent = components.find(c => c.id === connection.from.componentId);
  const toComponent = components.find(c => c.id === connection.to.componentId);
  
  if (!fromComponent || !toComponent) return false;
  
  const fromPoint = getConnectionPointPosition(fromComponent, connection.from.pointId);
  const toPoint = getConnectionPointPosition(toComponent, connection.to.pointId);
  
  if (!fromPoint || !toPoint) return false;
  
  return distanceToLineSegment(point, fromPoint, toPoint) <= threshold;
}

// Calculate distance from point to line segment
function distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line segment is a point
    return Math.sqrt(A * A + B * B);
  }
  
  let param = dot / lenSq;
  
  let xx: number, yy: number;
  
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}

// Find connections involving a specific component
export function getComponentConnections(
  componentId: string,
  connections: Connection[]
): Connection[] {
  return connections.filter(
    conn => conn.from.componentId === componentId || conn.to.componentId === componentId
  );
}

// Find connections involving a specific connection point
export function getConnectionPointConnections(
  componentId: string,
  pointId: string,
  connections: Connection[]
): Connection[] {
  return connections.filter(
    conn => 
      (conn.from.componentId === componentId && conn.from.pointId === pointId) ||
      (conn.to.componentId === componentId && conn.to.pointId === pointId)
  );
}

// Check if a connection already exists between two points
export function connectionExists(
  fromComponentId: string,
  fromPointId: string,
  toComponentId: string,
  toPointId: string,
  connections: Connection[]
): boolean {
  return connections.some(conn =>
    (conn.from.componentId === fromComponentId && 
     conn.from.pointId === fromPointId &&
     conn.to.componentId === toComponentId && 
     conn.to.pointId === toPointId) ||
    (conn.from.componentId === toComponentId && 
     conn.from.pointId === toPointId &&
     conn.to.componentId === fromComponentId && 
     conn.to.pointId === fromPointId)
  );
}

// Generate unique connection ID
export function generateConnectionId(): string {
  return `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create a new connection
export function createConnection(
  fromComponentId: string,
  fromPointId: string,
  toComponentId: string,
  toPointId: string,
  label?: string
): Connection {
  return {
    id: generateConnectionId(),
    from: {
      componentId: fromComponentId,
      pointId: fromPointId,
    },
    to: {
      componentId: toComponentId,
      pointId: toPointId,
    },
    path: '', // Will be calculated when rendering
    label,
    style: {
      strokeColor: '#6b7280',
      strokeWidth: 2,
      strokeDasharray: undefined,
    },
  };
}

// Update connection path based on component positions
export function updateConnectionPath(
  connection: Connection,
  components: FlowComponentData[],
  style: 'straight' | 'curved' | 'orthogonal' = 'curved'
): Connection {
  const fromComponent = components.find(c => c.id === connection.from.componentId);
  const toComponent = components.find(c => c.id === connection.to.componentId);
  
  if (!fromComponent || !toComponent) return connection;
  
  // Select best connection points for each component relative to the other component center
  const toCenter = { x: toComponent.position.x + toComponent.size.width / 2, y: toComponent.position.y + toComponent.size.height / 2 };
  const fromCenter = { x: fromComponent.position.x + fromComponent.size.width / 2, y: fromComponent.position.y + fromComponent.size.height / 2 };

  // Prefer using explicit pointIds if they still make sense; otherwise pick best
  let fromPos = null as Point | null;
  if (connection.from.pointId) {
    const explicitPos = getConnectionPointPosition(fromComponent, connection.from.pointId);
    if (explicitPos) {
      const dx = toCenter.x - explicitPos.x;
      const dy = toCenter.y - explicitPos.y;
      // simple outward check
      const cp = fromComponent.connectionPoints.find(p => p.id === connection.from.pointId);
      if (cp) {
        const outward = (cp.position === 'top' && dy < 0) || (cp.position === 'bottom' && dy > 0) || (cp.position === 'left' && dx < 0) || (cp.position === 'right' && dx > 0);
        if (outward) fromPos = explicitPos;
      }
    }
  }

  if (!fromPos) {
    const bestFrom = findBestConnectionPoint(fromComponent, toCenter);
    fromPos = bestFrom ? bestFrom.position : getConnectionPointPosition(fromComponent, connection.from.pointId);
  }

  let toPos = null as Point | null;
  if (connection.to.pointId) {
    const explicitPos = getConnectionPointPosition(toComponent, connection.to.pointId);
    if (explicitPos) {
      const dx = fromCenter.x - explicitPos.x;
      const dy = fromCenter.y - explicitPos.y;
      const cp = toComponent.connectionPoints.find(p => p.id === connection.to.pointId);
      if (cp) {
        const outward = (cp.position === 'top' && dy < 0) || (cp.position === 'bottom' && dy > 0) || (cp.position === 'left' && dx < 0) || (cp.position === 'right' && dx > 0);
        if (outward) toPos = explicitPos;
      }
    }
  }

  if (!toPos) {
    const bestTo = findBestConnectionPoint(toComponent, fromCenter);
    toPos = bestTo ? bestTo.position : getConnectionPointPosition(toComponent, connection.to.pointId);
  }

  // Now offset endpoints slightly outside the border along their side so the line doesn't overlap the stroke
  const offset = 6;
  const fromPoint = fromPos ? offsetPointOutward(fromComponent, fromPos, offset) : null;
  const toPoint = toPos ? offsetPointOutward(toComponent, toPos, offset) : null;
  
  if (!fromPoint || !toPoint) return connection;

  // Shorten the visible connection slightly so it doesn't appear too long when auto-generated
  const SHORTEN_AMOUNT = 12; // total pixels to remove from the connection length
  const { from: shortFrom, to: shortTo } = shortenEndpoints(fromPoint, toPoint, SHORTEN_AMOUNT);

  const path = generateConnectionPath(shortFrom, shortTo, style);
  
  return {
    ...connection,
    path,
  };
}