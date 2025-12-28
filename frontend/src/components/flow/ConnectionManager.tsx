/**
 * ConnectionManager Component
 * Manages and renders all connections in the flow diagram
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { Connection as ConnectionData, FlowComponentData } from '@/types/flowComponents';
import { Point } from '@/types/canvas';
import Connection, { TempConnection } from './Connection';
import { findBestConnectionPoint, offsetPointOutward } from '@/utils/connectionUtils';
import ConnectionContextMenu from './ConnectionContextMenu';
import { useConnections, ConnectionState } from '@/hooks/useConnections';

export interface ConnectionManagerProps {
  components: FlowComponentData[];
  connections: ConnectionData[];
  connectionState: ConnectionState;
  selectedConnectionIds: string[];
  hoveredConnectionId: string | null;
  editingConnectionId: string | null;
  contextMenu: { connectionId: string; position: Point } | null;
  scale: number;
  onConnectionSelect: (connectionId: string, multiSelect?: boolean) => void;
  onConnectionHover: (connectionId: string | null) => void;
  onConnectionDoubleClick: (connectionId: string) => void;
  onConnectionRightClick: (connectionId: string, position: Point) => void;
  onConnectionLabelChange: (connectionId: string, label: string) => void;
  onConnectionDelete: (connectionId: string) => void;
  onConnectionDuplicate: (connectionId: string) => void;
  onConnectionStyleChange: (connectionId: string, style: 'straight' | 'curved' | 'orthogonal') => void;
  onContextMenuClose: () => void;
  getConnectionEndpoints: (connection: ConnectionData) => { fromPoint: Point; toPoint: Point } | null;
  className?: string;
}

export default function ConnectionManager({
  components,
  connections,
  connectionState,
  selectedConnectionIds,
  hoveredConnectionId,
  editingConnectionId,
  contextMenu,
  scale,
  onConnectionSelect,
  onConnectionHover,
  onConnectionDoubleClick,
  onConnectionRightClick,
  onConnectionLabelChange,
  onConnectionDelete,
  onConnectionDuplicate,
  onConnectionStyleChange,
  onContextMenuClose,
  getConnectionEndpoints,
  className = '',
}: ConnectionManagerProps) {
  // Get temporary connection endpoints
  const tempConnectionEndpoints = useMemo(() => {
    if (!connectionState.isConnecting || 
        !connectionState.fromComponentId || 
        !connectionState.fromPointId || 
        !connectionState.tempToPoint) {
      return null;
    }

    const fromComponent = components.find(c => c.id === connectionState.fromComponentId);
    if (!fromComponent) return null;

    // Choose the best connection point on the from-component towards the temporary target
    const best = findBestConnectionPoint(fromComponent, connectionState.tempToPoint as any);
    if (!best) return null;
    const fromEndpoint = offsetPointOutward(fromComponent, best.position, 6);

    return {
      fromPoint: fromEndpoint,
      toPoint: connectionState.tempToPoint,
      isValid: connectionState.isValidConnection,
    };
  }, [connectionState, components]);

  const handleConnectionSelect = useCallback((connectionId: string, event?: React.MouseEvent) => {
    const multiSelect = event?.ctrlKey || event?.metaKey || false;
    onConnectionSelect(connectionId, multiSelect);
  }, [onConnectionSelect]);

  const handleConnectionRightClick = useCallback((connectionId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const position = {
      x: event.clientX,
      y: event.clientY,
    };
    
    onConnectionRightClick(connectionId, position);
  }, [onConnectionRightClick]);

  return (
    <g className={`connection-manager ${className}`}>
      {/* Render all connections */}
      {connections.map((connection) => {
        const endpoints = getConnectionEndpoints(connection);
        if (!endpoints) return null;

        const isSelected = selectedConnectionIds.includes(connection.id);
        const isHovered = hoveredConnectionId === connection.id;
        const isEditing = editingConnectionId === connection.id;

        return (
          <Connection
            key={connection.id}
            connection={connection}
            fromPoint={endpoints.fromPoint}
            toPoint={endpoints.toPoint}
            isSelected={isSelected}
            isHovered={isHovered}
            isEditing={isEditing}
            scale={scale}
            onSelect={(id) => handleConnectionSelect(id)}
            onHover={onConnectionHover}
            onDoubleClick={onConnectionDoubleClick}
            onRightClick={handleConnectionRightClick}
            onLabelChange={onConnectionLabelChange}
          />
        );
      })}

      {/* Render temporary connection being created */}
      {tempConnectionEndpoints && (
        <TempConnection
          fromPoint={tempConnectionEndpoints.fromPoint}
          toPoint={tempConnectionEndpoints.toPoint}
          isValid={tempConnectionEndpoints.isValid}
          scale={scale}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <foreignObject
          x={0}
          y={0}
          width="100%"
          height="100%"
          className="pointer-events-none"
        >
          <div className="pointer-events-auto">
            <ConnectionContextMenu
              position={contextMenu.position}
              connectionId={contextMenu.connectionId}
              hasLabel={!!connections.find(c => c.id === contextMenu.connectionId)?.label}
              onEditLabel={onConnectionDoubleClick}
              onDeleteConnection={onConnectionDelete}
              onDuplicateConnection={onConnectionDuplicate}
              onChangeStyle={onConnectionStyleChange}
              onClose={onContextMenuClose}
            />
          </div>
        </foreignObject>
      )}
    </g>
  );
}

// Helper component for rendering connections with automatic endpoint calculation
export interface AutoConnectionManagerProps {
  components: FlowComponentData[];
  connections: ConnectionData[];
  scale: number;
  selectedConnectionIds?: string[];
  hoveredConnectionId?: string | null;
  onConnectionsChange: (connections: ConnectionData[]) => void;
  onConnectionSelect?: (connectionId: string, multiSelect?: boolean) => void;
  onConnectionHover?: (connectionId: string | null) => void;
  className?: string;
}

export function AutoConnectionManager({
  components,
  connections,
  scale,
  selectedConnectionIds = [],
  hoveredConnectionId = null,
  onConnectionsChange,
  onConnectionSelect,
  onConnectionHover,
  className = '',
}: AutoConnectionManagerProps) {
  const {
    connectionState,
    selectedConnectionIds: connectionSelectedIds,
    editingConnectionId,
    contextMenu,
    getConnectionEndpoints,
    selectConnection,
    setHoveredConnection,
    startEditingConnection,
    updateConnectionLabel,
    deleteSelectedConnections,
    duplicateConnection,
    changeConnectionStyle,
    showContextMenu,
    hideContextMenu,
  } = useConnections({
    components,
    connections,
    onConnectionsChange,
  });

  const handleConnectionSelect = useCallback((connectionId: string, multiSelect = false) => {
    selectConnection(connectionId, multiSelect);
    onConnectionSelect?.(connectionId, multiSelect);
  }, [selectConnection, onConnectionSelect]);

  const handleConnectionHover = useCallback((connectionId: string | null) => {
    setHoveredConnection(connectionId);
    onConnectionHover?.(connectionId);
  }, [setHoveredConnection, onConnectionHover]);

  const handleConnectionDoubleClick = useCallback((connectionId: string) => {
    startEditingConnection(connectionId);
  }, [startEditingConnection]);

  const handleConnectionRightClick = useCallback((connectionId: string, position: Point) => {
    showContextMenu(connectionId, position);
  }, [showContextMenu]);

  const handleConnectionLabelChange = useCallback((connectionId: string, label: string) => {
    updateConnectionLabel(connectionId, label);
  }, [updateConnectionLabel]);

  return (
    <ConnectionManager
      components={components}
      connections={connections}
      connectionState={connectionState}
      selectedConnectionIds={selectedConnectionIds}
      hoveredConnectionId={hoveredConnectionId}
      editingConnectionId={editingConnectionId}
      contextMenu={contextMenu}
      scale={scale}
      onConnectionSelect={handleConnectionSelect}
      onConnectionHover={handleConnectionHover}
      onConnectionDoubleClick={handleConnectionDoubleClick}
      onConnectionRightClick={handleConnectionRightClick}
      onConnectionLabelChange={handleConnectionLabelChange}
      onConnectionDelete={deleteSelectedConnections}
      onConnectionDuplicate={duplicateConnection}
      onConnectionStyleChange={changeConnectionStyle}
      onContextMenuClose={hideContextMenu}
      getConnectionEndpoints={getConnectionEndpoints}
      className={className}
    />
  );
}