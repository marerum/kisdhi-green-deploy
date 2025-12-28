/**
 * useConnections Hook
 * Manages connections between flow components
 */

import { useCallback, useState } from 'react';
import { Connection, FlowComponentData } from '@/types/flowComponents';
import { Point } from '@/types/canvas';
import { 
  validateConnection, 
  createConnection, 
  updateConnectionPath,
  getConnectionPointPosition,
  findBestConnectionPoint,
  offsetPointOutward,
  shortenEndpoints,
  connectionExists,
} from '@/utils/connectionUtils';

export interface ConnectionState {
  isConnecting: boolean;
  fromComponentId: string | null;
  fromPointId: string | null;
  tempToPoint: Point | null;
  isValidConnection: boolean;
}

export interface UseConnectionsOptions {
  components: FlowComponentData[];
  connections: Connection[];
  onConnectionsChange: (connections: Connection[]) => void;
  onConnectionStart?: (componentId: string, pointId: string) => void;
  onConnectionEnd?: (componentId: string, pointId: string) => void;
  onConnectionCancel?: () => void;
}

export function useConnections(options: UseConnectionsOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    fromComponentId: null,
    fromPointId: null,
    tempToPoint: null,
    isValidConnection: false,
  });

  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    connectionId: string;
    position: Point;
  } | null>(null);

  // Start creating a connection
  const startConnection = useCallback((componentId: string, pointId: string, position: Point) => {
    setConnectionState({
      isConnecting: true,
      fromComponentId: componentId,
      fromPointId: pointId,
      tempToPoint: position,
      isValidConnection: false,
    });
    
    options.onConnectionStart?.(componentId, pointId);
  }, [options.onConnectionStart]);

  // Update temporary connection endpoint
  const updateTempConnection = useCallback((point: Point, targetComponentId?: string, targetPointId?: string) => {
    if (!connectionState.isConnecting) return;

    let isValid = false;
    
    if (targetComponentId && targetPointId && connectionState.fromComponentId && connectionState.fromPointId) {
      const fromComponent = options.components.find(c => c.id === connectionState.fromComponentId);
      const toComponent = options.components.find(c => c.id === targetComponentId);
      
      if (fromComponent && toComponent) {
        const validation = validateConnection(
          fromComponent,
          connectionState.fromPointId,
          toComponent,
          targetPointId
        );
        
        isValid = validation.isValid && !connectionExists(
          connectionState.fromComponentId,
          connectionState.fromPointId,
          targetComponentId,
          targetPointId,
          options.connections
        );
      }
    }

    setConnectionState(prev => ({
      ...prev,
      tempToPoint: point,
      isValidConnection: isValid,
    }));
  }, [connectionState, options.components, options.connections]);

  // Complete connection creation
  const endConnection = useCallback((componentId: string, pointId: string) => {
    if (!connectionState.isConnecting || 
        !connectionState.fromComponentId || 
        !connectionState.fromPointId) {
      return;
    }

    const fromComponent = options.components.find(c => c.id === connectionState.fromComponentId);
    const toComponent = options.components.find(c => c.id === componentId);

    if (!fromComponent || !toComponent) {
      cancelConnection();
      return;
    }

    // Validate connection
    const validation = validateConnection(
      fromComponent,
      connectionState.fromPointId,
      toComponent,
      pointId
    );

    if (!validation.isValid) {
      console.warn('Invalid connection:', validation.reason);
      cancelConnection();
      return;
    }

    // Check if connection already exists
    if (connectionExists(
      connectionState.fromComponentId,
      connectionState.fromPointId,
      componentId,
      pointId,
      options.connections
    )) {
      console.warn('Connection already exists');
      cancelConnection();
      return;
    }

    // Create new connection
    const newConnection = createConnection(
      connectionState.fromComponentId,
      connectionState.fromPointId,
      componentId,
      pointId
    );

    // Update connection path
    const updatedConnection = updateConnectionPath(newConnection, options.components);

    // Add to connections list
    const updatedConnections = [...options.connections, updatedConnection];
    options.onConnectionsChange(updatedConnections);

    // Clear connection state
    setConnectionState({
      isConnecting: false,
      fromComponentId: null,
      fromPointId: null,
      tempToPoint: null,
      isValidConnection: false,
    });

    options.onConnectionEnd?.(componentId, pointId);
  }, [connectionState, options.onConnectionEnd, options.components, options.connections, options.onConnectionsChange]);

  // Cancel connection creation
  const cancelConnection = useCallback(() => {
    setConnectionState({
      isConnecting: false,
      fromComponentId: null,
      fromPointId: null,
      tempToPoint: null,
      isValidConnection: false,
    });
    
    options.onConnectionCancel?.();
  }, [options.onConnectionCancel]);

  // Select connections
  const selectConnection = useCallback((connectionId: string, multiSelect = false) => {
    setSelectedConnectionIds(prev => {
      if (multiSelect) {
        return prev.includes(connectionId)
          ? prev.filter(id => id !== connectionId)
          : [...prev, connectionId];
      } else {
        return [connectionId];
      }
    });
  }, []);

  // Clear connection selection
  const clearConnectionSelection = useCallback(() => {
    setSelectedConnectionIds([]);
  }, []);

  // Delete selected connections
  const deleteSelectedConnections = useCallback(() => {
    if (selectedConnectionIds.length === 0) return;
    
    const remainingConnections = options.connections.filter(
      conn => !selectedConnectionIds.includes(conn.id)
    );
    
    options.onConnectionsChange(remainingConnections);
    setSelectedConnectionIds([]);
  }, [selectedConnectionIds, options.connections, options.onConnectionsChange]);

  // Update all connection paths when components move
  const updateAllConnectionPaths = useCallback(() => {
    const updatedConnections = options.connections.map(connection =>
      updateConnectionPath(connection, options.components)
    );
    
    options.onConnectionsChange(updatedConnections);
  }, [options.connections, options.components, options.onConnectionsChange]);

  // Get connections for a specific component
  const getComponentConnections = useCallback((componentId: string) => {
    return options.connections.filter(
      conn => conn.from.componentId === componentId || conn.to.componentId === componentId
    );
  }, [options.connections]);

  // Get connection endpoints
  const getConnectionEndpoints = useCallback((connection: Connection) => {
    const fromComponent = options.components.find(c => c.id === connection.from.componentId);
    const toComponent = options.components.find(c => c.id === connection.to.componentId);
    
    if (!fromComponent || !toComponent) return null;

    // Pick best connection points for each end relative to the other component center
    const toCenter = { x: toComponent.position.x + toComponent.size.width / 2, y: toComponent.position.y + toComponent.size.height / 2 };
    const fromCenter = { x: fromComponent.position.x + fromComponent.size.width / 2, y: fromComponent.position.y + fromComponent.size.height / 2 };

    // Determine best from-point
    let fromPos: Point | null = null;
    if (connection.from.pointId) {
      const explicit = getConnectionPointPosition(fromComponent, connection.from.pointId);
      if (explicit) {
        const cp = fromComponent.connectionPoints.find(p => p.id === connection.from.pointId);
        if (cp) {
          const dx = toCenter.x - explicit.x;
          const dy = toCenter.y - explicit.y;
          const outward = (cp.position === 'top' && dy < 0) || (cp.position === 'bottom' && dy > 0) || (cp.position === 'left' && dx < 0) || (cp.position === 'right' && dx > 0);
          if (outward) fromPos = explicit;
        }
      }
    }

    if (!fromPos) {
      const best = findBestConnectionPoint(fromComponent, toCenter);
      fromPos = best ? best.position : getConnectionPointPosition(fromComponent, connection.from.pointId);
    }

    // Determine best to-point
    let toPos: Point | null = null;
    if (connection.to.pointId) {
      const explicit = getConnectionPointPosition(toComponent, connection.to.pointId);
      if (explicit) {
        const cp = toComponent.connectionPoints.find(p => p.id === connection.to.pointId);
        if (cp) {
          const dx = fromCenter.x - explicit.x;
          const dy = fromCenter.y - explicit.y;
          const outward = (cp.position === 'top' && dy < 0) || (cp.position === 'bottom' && dy > 0) || (cp.position === 'left' && dx < 0) || (cp.position === 'right' && dx > 0);
          if (outward) toPos = explicit;
        }
      }
    }

    if (!toPos) {
      const best = findBestConnectionPoint(toComponent, fromCenter);
      toPos = best ? best.position : getConnectionPointPosition(toComponent, connection.to.pointId);
    }

    if (!fromPos || !toPos) return null;

    // Offset endpoints slightly outward so they don't overlap stroke
    const fromEndpoint = offsetPointOutward(fromComponent, fromPos, 6);
    const toEndpoint = offsetPointOutward(toComponent, toPos, 6);

    // Shorten endpoints a little so auto-generated connections look tighter
    const SHORTEN_AMOUNT = 12;
    const { from: shortFrom, to: shortTo } = shortenEndpoints(fromEndpoint, toEndpoint, SHORTEN_AMOUNT);

    return { fromPoint: shortFrom, toPoint: shortTo };
  }, [options.components]);

  // Check if a connection is selected
  const isConnectionSelected = useCallback((connectionId: string) => {
    return selectedConnectionIds.includes(connectionId);
  }, [selectedConnectionIds]);

  // Set hovered connection
  const setHoveredConnection = useCallback((connectionId: string | null) => {
    setHoveredConnectionId(connectionId);
  }, []);

  // Edit connection label
  const startEditingConnection = useCallback((connectionId: string) => {
    setEditingConnectionId(connectionId);
  }, []);

  const updateConnectionLabel = useCallback((connectionId: string, label: string) => {
    const updatedConnections = options.connections.map(connection =>
      connection.id === connectionId
        ? { ...connection, label: label.trim() || undefined }
        : connection
    );
    
    options.onConnectionsChange(updatedConnections);
    setEditingConnectionId(null);
  }, [options.connections, options.onConnectionsChange]);

  // Context menu management
  const showContextMenu = useCallback((connectionId: string, position: Point) => {
    setContextMenu({ connectionId, position });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Duplicate connection
  const duplicateConnection = useCallback((connectionId: string) => {
    const connection = options.connections.find(c => c.id === connectionId);
    if (!connection) return;

    const newConnection = createConnection(
      connection.from.componentId,
      connection.from.pointId,
      connection.to.componentId,
      connection.to.pointId,
      connection.label ? `${connection.label} (コピー)` : undefined
    );

    const updatedConnection = updateConnectionPath(newConnection, options.components);
    const updatedConnections = [...options.connections, updatedConnection];
    
    options.onConnectionsChange(updatedConnections);
  }, [options.connections, options.components, options.onConnectionsChange]);

  // Change connection style
  const changeConnectionStyle = useCallback((connectionId: string, style: 'straight' | 'curved' | 'orthogonal') => {
    const updatedConnections = options.connections.map(connection => {
      if (connection.id === connectionId) {
        const updatedConnection = updateConnectionPath(connection, options.components, style);
        return updatedConnection;
      }
      return connection;
    });
    
    options.onConnectionsChange(updatedConnections);
  }, [options.connections, options.components, options.onConnectionsChange]);

  // Check if a connection is being edited
  const isConnectionEditing = useCallback((connectionId: string) => {
    return editingConnectionId === connectionId;
  }, [editingConnectionId]);

  return {
    // State
    connectionState,
    selectedConnectionIds,
    hoveredConnectionId,
    editingConnectionId,
    contextMenu,
    
    // Connection creation
    startConnection,
    updateTempConnection,
    endConnection,
    cancelConnection,
    
    // Connection selection
    selectConnection,
    clearConnectionSelection,
    isConnectionSelected,
    
    // Connection management
    deleteSelectedConnections,
    updateAllConnectionPaths,
    getComponentConnections,
    getConnectionEndpoints,
    
    // Connection editing
    startEditingConnection,
    updateConnectionLabel,
    isConnectionEditing,
    duplicateConnection,
    changeConnectionStyle,
    
    // Context menu
    showContextMenu,
    hideContextMenu,
    
    // Hover state
    setHoveredConnection,
  };
}