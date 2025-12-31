/**
 * FlowCanvas Component
 * Main canvas component with pan/zoom functionality, grid background, and component management
 */

'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasState } from '@/hooks/useCanvasState';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useSelection } from '@/hooks/useSelection';
import { useComponentDrag } from '@/hooks/useComponentDrag';
import { useConnections } from '@/hooks/useConnections';
import { FlowComponentData, DraggedComponent, Connection } from '@/types/flowComponents';
import { Point } from '@/types/canvas';
import { snapToGrid } from '@/utils/gridUtils';
import { getCanvasMousePosition } from '@/utils/dragUtils';
import { ComponentFactory } from '@/utils/componentRegistry';
import { exportCanvas, ExportOptions } from '@/utils/exportUtils';
import { createConnection, updateConnectionPath, connectionExists } from '@/utils/connectionUtils';
import { useKeyboardShortcuts, KeyboardShortcut, getPlatformModifierKey } from '@/hooks/useKeyboardShortcuts';
import GridBackground from './GridBackground';
import FlowComponentRenderer from './FlowComponentRenderer';
import SelectionBox, { SelectionBounds } from './SelectionBox';
import { AutoConnectionManager } from './ConnectionManager';
import PropertiesPanel from './PropertiesPanel';
import ExportDialog from './ExportDialog';
import ShortcutHelp, { ShortcutHelpButton } from './ShortcutHelp';

export interface FlowCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  components?: FlowComponentData[];
  connections?: Connection[];
  selectedComponentIds?: string[];
  selectedConnectionIds?: string[];
  showPropertiesPanel?: boolean;
  projectName?: string;
  onCanvasReady?: (canvas: SVGSVGElement) => void;
  onComponentsChange?: (components: FlowComponentData[]) => void;
  onConnectionsChange?: (connections: Connection[]) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onConnectionSelectionChange?: (selectedIds: string[]) => void;
  onPropertiesPanelToggle?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onFitToContent?: (fitToContentFn: (components?: FlowComponentData[] | null) => void) => void;
  children?: React.ReactNode;
}

export default function FlowCanvas({
  width = 800,
  height = 600,
  className = '',
  components = [],
  connections = [],
  selectedComponentIds = [],
  selectedConnectionIds = [],
  showPropertiesPanel = false,
  projectName,
  onCanvasReady,
  onComponentsChange,
  onConnectionsChange,
  onSelectionChange,
  onConnectionSelectionChange,
  onPropertiesPanelToggle,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onFitToContent,
  children,
}: FlowCanvasProps) {
  const canvasRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState({ x: 0, y: 0 });
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hoveredConnectionPointId, setHoveredConnectionPointId] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [copiedComponents, setCopiedComponents] = useState<FlowComponentData[]>([]);

  // Connection system
  const {
    connectionState,
    selectedConnectionIds: connectionSelectedIds,
    hoveredConnectionId,
    editingConnectionId,
    contextMenu,
    startConnection,
    updateTempConnection,
    endConnection,
    cancelConnection,
    selectConnection,
    clearConnectionSelection,
    isConnectionSelected,
    deleteSelectedConnections,
    updateAllConnectionPaths,
    getConnectionEndpoints,
    setHoveredConnection,
    startEditingConnection,
    updateConnectionLabel,
    duplicateConnection,
    changeConnectionStyle,
    showContextMenu,
    hideContextMenu,
  } = useConnections({
    components,
    connections,
    onConnectionsChange: onConnectionsChange || (() => {}),
    onConnectionStart: (componentId, pointId) => {
      console.log('Connection started:', componentId, pointId);
    },
    onConnectionEnd: (componentId, pointId) => {
      console.log('Connection ended:', componentId, pointId);
    },
    onConnectionCancel: () => {
      console.log('Connection cancelled');
    },
  });

  // Canvas state hook
  const {
    canvasState,
    pan,
    updateViewport,
    handleMouseDown: canvasHandleMouseDown,
    handleMouseMove: canvasHandleMouseMove,
    handleMouseUp: canvasHandleMouseUp,
    handleWheel,
    resetCanvas,
    setZoom,
    toggleGrid,
    toggleSnapToGrid,
    setGridSize,
    canZoomIn,
    canZoomOut,
    fitToContent,
  } = useCanvasState();

  // Selection system
  const {
    selectedIds,
    selectionBox,
    isSelecting,
    selectComponent,
    clearSelection,
    selectAll,
    isSelected,
    startSelectionBox,
    updateSelectionBox,
    endSelectionBox,
    cancelSelectionBox,
    getSelectionBounds,
    deleteSelected,
    duplicateSelected,
  } = useSelection({
    onSelectionChange: (newSelectedIds) => {
      onSelectionChange?.(newSelectedIds);
    },
  });

  // Component dragging system (after selection to use selectedIds)
  const {
    dragState: componentDragState,
    startDrag: startComponentDrag,
    updateDrag: updateComponentDrag,
    endDrag: endComponentDrag,
    isDragging: isComponentDraggingFn,
  } = useComponentDrag({
    components,
    selectedIds,
    gridSize: canvasState.grid.size,
    snapToGrid: canvasState.grid.snapEnabled,
    onComponentsUpdate: (updates) => {
      const updatedComponents = components.map(component => {
        const update = updates.find(u => u.id === component.id);
        return update ? { ...component, position: update.position } : component;
      });
      onComponentsChange?.(updatedComponents);
    },
    onDragStart: (componentIds) => {
      // Component drag started
    },
    onDragEnd: (componentIds) => {
      // Component drag ended
    },
  });

  // Notify parent when canvas is ready
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  // Expose fitToContent function to parent
  useEffect(() => {
    if (onFitToContent) {
      // Create a wrapper function that also provides direct scale setting
      const fitToContentWrapper = (components?: any[] | null) => {
        console.log('=== WRAPPER CALLED ===');
        console.log('Components passed to wrapper:', components);
        
        if (components && components.length > 0) {
          console.log('Calling internal fitToContent function');
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            fitToContent(components);
          }, 0);
        } else {
          console.log('No components provided to wrapper');
        }
      };
      
      // Add a direct scale setter using the proper setZoom function
      (fitToContentWrapper as any).setScale = (scale: number, centerX?: number, centerY?: number) => {
        console.log('=== DIRECT SCALE SETTING ===');
        console.log('Scale:', scale, 'Center:', { x: centerX, y: centerY });
        
        // Use the setZoom function from the hook with center point
        const center = centerX !== undefined && centerY !== undefined 
          ? { x: centerX, y: centerY } 
          : undefined;
        
        console.log('Calling setZoom with:', { scale, center });
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          setZoom(scale, center);
        }, 0);
      };
      
      console.log('Exposing fitToContent wrapper to parent');
      onFitToContent(fitToContentWrapper);
    }
  }, [onFitToContent, fitToContent, setZoom]);

  // Update viewport size when container size changes
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        updateViewport(rect.width, rect.height);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [updateViewport]);

  // Copy and paste functionality
  const handleCopy = useCallback(() => {
    if (selectedIds.length > 0) {
      const selectedComponents = components.filter(component => 
        selectedIds.includes(component.id)
      );
      setCopiedComponents(selectedComponents);
    }
  }, [selectedIds, components]);

  const handlePaste = useCallback(() => {
    if (copiedComponents.length > 0) {
      const pastedComponents = copiedComponents.map(component => ({
        ...component,
        id: `${component.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          x: component.position.x + 20,
          y: component.position.y + 20,
        },
        connectionPoints: component.connectionPoints.map((cp, index) => ({
          ...cp,
          id: `${component.type}-${Date.now()}-${index}`,
        })),
      }));
      
      const updatedComponents = [...components, ...pastedComponents];
      onComponentsChange?.(updatedComponents);
      
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        onSelectionChange?.(pastedComponents.map(c => c.id));
      }, 0);
    }
  }, [copiedComponents, components, onComponentsChange, onSelectionChange]);

  // Arrow key movement
  const handleArrowKeyMove = useCallback((direction: 'up' | 'down' | 'left' | 'right', large = false) => {
    if (selectedIds.length === 0) return;
    
    const moveDistance = large ? 40 : (canvasState.grid.snapEnabled ? canvasState.grid.size : 10);
    const deltaX = direction === 'left' ? -moveDistance : direction === 'right' ? moveDistance : 0;
    const deltaY = direction === 'up' ? -moveDistance : direction === 'down' ? moveDistance : 0;
    
    const updatedComponents = components.map(component => {
      if (selectedIds.includes(component.id)) {
        let newPosition = {
          x: component.position.x + deltaX,
          y: component.position.y + deltaY,
        };
        
        // Apply grid snapping if enabled
        if (canvasState.grid.snapEnabled) {
          newPosition = snapToGrid(newPosition, canvasState.grid.size);
        }
        
        return { ...component, position: newPosition };
      }
      return component;
    });
    
    onComponentsChange?.(updatedComponents);
  }, [selectedIds, components, canvasState.grid, onComponentsChange]);

  // Define keyboard shortcuts
  const platformModifier = getPlatformModifierKey();
  const shortcuts: KeyboardShortcut[] = [
    // Selection shortcuts
    {
      key: 'a',
      [platformModifier]: true,
      description: '全て選択',
      category: '選択',
      action: () => selectAll(components),
    },
    {
      key: 'Escape',
      description: '選択解除 / 編集キャンセル / 接続キャンセル',
      category: '選択',
      action: () => {
        if (connectionState.isConnecting) {
          cancelConnection();
        } else if (editingComponentId) {
          setEditingComponentId(null);
        } else {
          clearSelection();
          clearConnectionSelection();
          cancelSelectionBox();
        }
      },
    },

    // Edit shortcuts
    {
      key: 'F2',
      description: '選択したコンポーネントを編集',
      category: '編集',
      action: () => {
        if (selectedIds.length === 1) {
          setEditingComponentId(selectedIds[0]);
        }
      },
      disabled: selectedIds.length !== 1,
    },
    {
      key: 'Delete',
      description: '選択したアイテムを削除',
      category: '編集',
      action: () => {
        if (selectedIds.length > 0) {
          deleteSelected(components, onComponentsChange || (() => {}));
        } else if (connectionSelectedIds.length > 0) {
          deleteSelectedConnections();
        }
      },
      disabled: selectedIds.length === 0 && connectionSelectedIds.length === 0,
    },
    {
      key: 'Backspace',
      description: '選択したアイテムを削除',
      category: '編集',
      action: () => {
        if (selectedIds.length > 0) {
          deleteSelected(components, onComponentsChange || (() => {}));
        } else if (connectionSelectedIds.length > 0) {
          deleteSelectedConnections();
        }
      },
      disabled: selectedIds.length === 0 && connectionSelectedIds.length === 0,
    },
    {
      key: 'd',
      [platformModifier]: true,
      description: '選択したコンポーネントを複製',
      category: '編集',
      action: () => {
        if (selectedIds.length > 0) {
          duplicateSelected(components, onComponentsChange || (() => {}));
        }
      },
      disabled: selectedIds.length === 0,
    },

    // Copy/Paste shortcuts
    {
      key: 'c',
      [platformModifier]: true,
      description: '選択したコンポーネントをコピー',
      category: 'コピー&ペースト',
      action: handleCopy,
      disabled: selectedIds.length === 0,
    },
    {
      key: 'v',
      [platformModifier]: true,
      description: 'コピーしたコンポーネントをペースト',
      category: 'コピー&ペースト',
      action: handlePaste,
      disabled: copiedComponents.length === 0,
    },

    // Undo/Redo shortcuts
    {
      key: 'z',
      [platformModifier]: true,
      description: '元に戻す',
      category: '履歴',
      action: () => onUndo?.(),
      disabled: !canUndo,
    },
    {
      key: 'y',
      [platformModifier]: true,
      description: 'やり直し',
      category: '履歴',
      action: () => onRedo?.(),
      disabled: !canRedo,
    },
    {
      key: 'z',
      [platformModifier]: true,
      shiftKey: true,
      description: 'やり直し',
      category: '履歴',
      action: () => onRedo?.(),
      disabled: !canRedo,
    },

    // Movement shortcuts
    {
      key: 'ArrowUp',
      description: '選択したコンポーネントを上に移動',
      category: '移動',
      action: () => handleArrowKeyMove('up'),
      disabled: selectedIds.length === 0,
    },
    {
      key: 'ArrowDown',
      description: '選択したコンポーネントを下に移動',
      category: '移動',
      action: () => handleArrowKeyMove('down'),
      disabled: selectedIds.length === 0,
    },
    {
      key: 'ArrowLeft',
      description: '選択したコンポーネントを左に移動',
      category: '移動',
      action: () => handleArrowKeyMove('left'),
      disabled: selectedIds.length === 0,
    },
    {
      key: 'ArrowRight',
      description: '選択したコンポーネントを右に移動',
      category: '移動',
      action: () => handleArrowKeyMove('right'),
      disabled: selectedIds.length === 0,
    },
    {
      key: 'ArrowUp',
      shiftKey: true,
      description: '選択したコンポーネントを大きく上に移動',
      category: '移動',
      action: () => handleArrowKeyMove('up', true),
      disabled: selectedIds.length === 0,
    },
    {
      key: 'ArrowDown',
      shiftKey: true,
      description: '選択したコンポーネントを大きく下に移動',
      category: '移動',
      action: () => handleArrowKeyMove('down', true),
      disabled: selectedIds.length === 0,
    },
    {
      key: 'ArrowLeft',
      shiftKey: true,
      description: '選択したコンポーネントを大きく左に移動',
      category: '移動',
      action: () => handleArrowKeyMove('left', true),
      disabled: selectedIds.length === 0,
    },
    {
      key: 'ArrowRight',
      shiftKey: true,
      description: '選択したコンポーネントを大きく右に移動',
      category: '移動',
      action: () => handleArrowKeyMove('right', true),
      disabled: selectedIds.length === 0,
    },

    // View shortcuts
    {
      key: '0',
      [platformModifier]: true,
      description: 'キャンバスをリセット',
      category: '表示',
      action: resetCanvas,
    },
    {
      key: '=',
      [platformModifier]: true,
      description: 'ズームイン',
      category: '表示',
      action: () => canZoomIn && setZoom(canvasState.transform.scale + 0.1),
      disabled: !canZoomIn,
    },
    {
      key: '-',
      [platformModifier]: true,
      description: 'ズームアウト',
      category: '表示',
      action: () => canZoomOut && setZoom(canvasState.transform.scale - 0.1),
      disabled: !canZoomOut,
    },
    {
      key: 'g',
      description: 'グリッド表示切り替え',
      category: '表示',
      action: toggleGrid,
    },
    {
      key: 'g',
      shiftKey: true,
      description: 'グリッドスナップ切り替え',
      category: '表示',
      action: toggleSnapToGrid,
      disabled: !canvasState.grid.visible,
    },

    // Export shortcuts
    {
      key: 'e',
      [platformModifier]: true,
      description: 'エクスポートダイアログを開く',
      category: 'エクスポート',
      action: () => setShowExportDialog(true),
    },

    // Help shortcuts
    {
      key: '?',
      description: 'キーボードショートカットヘルプを表示',
      category: 'ヘルプ',
      action: () => setShowShortcutHelp(true),
    },
    {
      key: '/',
      description: 'キーボードショートカットヘルプを表示',
      category: 'ヘルプ',
      action: () => setShowShortcutHelp(true),
    },
  ];

  // Use keyboard shortcuts hook
  const { shortcuts: activeShortcuts, getAllCategories } = useKeyboardShortcuts({
    shortcuts,
    enabled: true,
    ignoreWhenEditing: true,
  });

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return; // Only left mouse button
    
    // Check if we clicked on empty canvas
    const target = event.target as Element;
    const isEmptyCanvas = target === canvasRef.current || 
                         target.tagName === 'svg' || 
                         target.classList?.contains('grid-background');
    
    if (isEmptyCanvas) {
      const multiSelect = event.ctrlKey || event.metaKey;
      
      // Clear selection if not multi-selecting
      if (!multiSelect) {
        clearSelection();
      }
      
      // Start panning on empty canvas
      setIsPanning(true);
      setPanStart({ x: event.clientX, y: event.clientY });
      setInitialTransform({ x: canvasState.transform.x, y: canvasState.transform.y });
      
      // Prevent default to avoid text selection
      event.preventDefault();
      return;
    }
    
    canvasHandleMouseDown(event as any);
  }, [clearSelection, canvasHandleMouseDown]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent) => {
    // Handle panning
    if (isPanning) {
      const deltaX = event.clientX - panStart.x;
      const deltaY = event.clientY - panStart.y;
      
      // Calculate the delta from the last position and apply it
      const currentTransform = canvasState.transform;
      const targetX = initialTransform.x + deltaX;
      const targetY = initialTransform.y + deltaY;
      
      // Use the pan function to update the transform
      const panDeltaX = targetX - currentTransform.x;
      const panDeltaY = targetY - currentTransform.y;
      
      if (Math.abs(panDeltaX) > 0.1 || Math.abs(panDeltaY) > 0.1) {
        pan({ x: panDeltaX, y: panDeltaY });
      }
      
      return;
    }
    
    // Update temporary connection if we're connecting
    if (connectionState.isConnecting) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        // Convert screen coordinates to canvas coordinates
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        const canvasX = (screenX - canvasState.transform.x) / canvasState.transform.scale;
        const canvasY = (screenY - canvasState.transform.y) / canvasState.transform.scale;
        
        updateTempConnection({ x: canvasX, y: canvasY });
      }
      return;
    }
    
    // Update selection box if we're selecting
    if (isSelecting) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        // Convert screen coordinates to canvas coordinates
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        const canvasX = (screenX - canvasState.transform.x) / canvasState.transform.scale;
        const canvasY = (screenY - canvasState.transform.y) / canvasState.transform.scale;
        
        updateSelectionBox({ x: canvasX, y: canvasY });
      }
      return;
    }
    
    // Update component dragging if active
    if (isComponentDraggingFn() && containerRef.current) {
      const canvasPoint = getCanvasMousePosition(
        event as any,
        containerRef.current,
        canvasState.transform
      );
      updateComponentDrag(canvasPoint);
      return;
    }
    
    canvasHandleMouseMove(event as any);
  }, [isPanning, panStart, initialTransform, canvasState, connectionState.isConnecting, isSelecting, updateTempConnection, updateSelectionBox, isComponentDraggingFn, updateComponentDrag, canvasHandleMouseMove, pan]);

  const handleCanvasMouseUp = useCallback(() => {
    // End panning
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    // Cancel connection if we're connecting and clicked on empty space
    if (connectionState.isConnecting) {
      cancelConnection();
      return;
    }
    
    // End selection box if we were selecting
    if (isSelecting) {
      endSelectionBox(components, false); // TODO: Add multiSelect support
    }
    
    // End component dragging if active
    if (isComponentDraggingFn()) {
      endComponentDrag();
    }
    
    canvasHandleMouseUp();
  }, [isPanning, connectionState.isConnecting, isSelecting, components, endSelectionBox, isComponentDraggingFn, endComponentDrag, cancelConnection, canvasHandleMouseUp]);

  // Component event handlers
  const handleComponentUpdate = useCallback((id: string, updates: Partial<FlowComponentData>) => {
    const updatedComponents = components.map(component =>
      component.id === id ? { ...component, ...updates } : component
    );
    onComponentsChange?.(updatedComponents);
  }, [components, onComponentsChange]);

  const handleComponentSelect = useCallback((id: string, multiSelect = false) => {
    selectComponent(id, multiSelect);
  }, [selectComponent]);

  const handleComponentStartDrag = useCallback((id: string, startPoint: Point) => {
    if (!containerRef.current) return;
    
    const canvasPoint = getCanvasMousePosition(
      { clientX: startPoint.x, clientY: startPoint.y } as MouseEvent,
      containerRef.current,
      canvasState.transform
    );
    
    startComponentDrag(id, canvasPoint);
  }, [startComponentDrag]);

  const handleComponentDrag = useCallback((id: string, delta: Point) => {
    // Component dragging is now handled by the useComponentDrag hook
    // This callback is kept for compatibility but the actual dragging
    // is managed through mouse events on the canvas
  }, []);

  const handleComponentEndDrag = useCallback((id: string) => {
    endComponentDrag();
  }, [endComponentDrag]);

  const handleComponentDoubleClick = useCallback((id: string) => {
    setEditingComponentId(id);
  }, []);

  const handleComponentStartEdit = useCallback((id: string) => {
    setEditingComponentId(id);
  }, []);

  const handleComponentEndEdit = useCallback((id: string) => {
    setEditingComponentId(null);
  }, []);

  const handleConnectionPointHover = useCallback((componentId: string, pointId: string | null) => {
    setHoveredConnectionPointId(pointId);
  }, []);

  const handleConnectionStart = useCallback((componentId: string, pointId: string, position: Point) => {
    startConnection(componentId, pointId, position);
  }, [startConnection]);

  const handleConnectionEnd = useCallback((componentId: string, pointId: string, position: Point) => {
    endConnection(componentId, pointId);
  }, [endConnection]);

  // Note: Connection paths are updated automatically by the useConnections hook
  // when components change, so we don't need a separate useEffect here

  // Connection event handlers
  const handleConnectionSelect = useCallback((connectionId: string, multiSelect = false) => {
    selectConnection(connectionId, multiSelect);
    onConnectionSelectionChange?.(multiSelect ? [...connectionSelectedIds, connectionId] : [connectionId]);
  }, [selectConnection, connectionSelectedIds, onConnectionSelectionChange]);

  const handleConnectionHover = useCallback((connectionId: string | null) => {
    setHoveredConnection(connectionId);
  }, [setHoveredConnection]);

  const handleConnectionDoubleClick = useCallback((connectionId: string) => {
    startEditingConnection(connectionId);
  }, [startEditingConnection]);

  const handleConnectionRightClick = useCallback((connectionId: string, position: Point) => {
    showContextMenu(connectionId, position);
  }, [showContextMenu]);

  const handleConnectionLabelChange = useCallback((connectionId: string, label: string) => {
    updateConnectionLabel(connectionId, label);
  }, [updateConnectionLabel]);

  // Drag and drop from sidebar
  const { handleDrop, handleDragOver } = useDragAndDrop({
    onDrop: (template, position) => {
      console.log('=== FLOW CANVAS ON DROP ===');
      console.log('Template:', template);
      console.log('Position:', position);
      
      // Apply grid snapping if enabled
      let dropPosition = position;
      if (canvasState.grid.snapEnabled) {
        dropPosition = snapToGrid(position, canvasState.grid.size);
        console.log('Snapped position:', dropPosition);
      }
      
      // Create new component (treat connector the same as other templates)
      console.log('Creating component from template...');

      // If connector, attempt to snap endpoints to nearby connection points
      let createPosition = dropPosition;
      let createSize = template.defaultSize;

      if (template.type === 'connector') {
        try {
          const SNAP_DISTANCE = 24; // pixels
          const midY = dropPosition.y + (template.defaultSize.height / 2);
          const leftX = dropPosition.x;
          const rightX = dropPosition.x + template.defaultSize.width;

          // Build list of all connection points from existing components
          const allPoints: { componentId: string; pointId: string; x: number; y: number }[] = [];
          components.forEach((c) => {
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

          // Helper to find nearest point to a given coordinate
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
            // Snap both endpoints: set position.x to left.x, width to span between points
            const newWidth = Math.max(40, Math.abs(rightSnap.x - leftSnap.x));
            const newY = (leftSnap.y + rightSnap.y) / 2 - (template.defaultSize.height / 2);
            createPosition = { x: Math.min(leftSnap.x, rightSnap.x), y: newY };
            createSize = { width: newWidth, height: template.defaultSize.height };
            console.log('Connector snapped both endpoints to', leftSnap, rightSnap);
          } else if (leftSnap) {
            // Snap left endpoint
            createPosition = { x: leftSnap.x, y: leftSnap.y - (template.defaultSize.height / 2) };
            console.log('Connector snapped left endpoint to', leftSnap);
          } else if (rightSnap) {
            // Snap right endpoint
            createPosition = { x: rightSnap.x - template.defaultSize.width, y: rightSnap.y - (template.defaultSize.height / 2) };
            console.log('Connector snapped right endpoint to', rightSnap);
          }
        } catch (err) {
          console.error('Failed to compute connector snap:', err);
        }
      }

      const newComponent = ComponentFactory.createFromTemplate(template, createPosition, { size: createSize });
      
      if (newComponent) {
        console.log('Created component:', newComponent);
        const updatedComponents = [...components, newComponent];
        console.log('Updated components array length:', updatedComponents.length);
        console.log('Calling onComponentsChange with:', updatedComponents);
        onComponentsChange?.(updatedComponents);
        console.log('onComponentsChange called');
        
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          onSelectionChange?.([newComponent.id]);
        }, 0);
        
        console.log('Component added successfully');
      } else {
        console.error('Failed to create component from template');
      }
      
      // If the created component is a connector and it snapped to component points,
      // try to create logical Connection entries linking the snapped points.
      try {
        if (template.type === 'connector' && newComponent) {
          // Recompute endpoints similar to connectionUtils.getConnectionPointPosition logic
          const leftX = createPosition.x;
          const rightX = createPosition.x + createSize.width;
          const midY = createPosition.y + createSize.height / 2;

          // Build list of all connection points
          const allPoints: { componentId: string; pointId: string; x: number; y: number }[] = [];
          components.forEach((c) => {
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

          // If snapped to two different components, create a connection between them
          if (leftSnap && rightSnap && leftSnap.componentId !== rightSnap.componentId) {
            // Create connection from left -> right
            if (!connectionExists(leftSnap.componentId, leftSnap.pointId, rightSnap.componentId, rightSnap.pointId, connections)) {
              const conn = createConnection(leftSnap.componentId, leftSnap.pointId, rightSnap.componentId, rightSnap.pointId);
              const updatedConn = updateConnectionPath(conn, [...components, newComponent]);
              onConnectionsChange?.([...(connections || []), updatedConn]);
            }
          } else if (leftSnap) {
            // If snapped only on left, try to find a component on the right side of connector (by proximity)
            // We'll not auto-create a single-ended connection; leave as visual connector component
          } else if (rightSnap) {
            // same as above for right-only
          }
        }
      } catch (err) {
        console.error('Failed to auto-create connection for dropped connector:', err);
      }
    },
  });

  const handleCanvasDrop = useCallback((event: React.DragEvent) => {
    console.log('=== CANVAS DROP EVENT ===');
    console.log('Event:', event);
    console.log('Event type:', event.type);
    console.log('DataTransfer:', event.dataTransfer);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      console.log('No container rect available');
      return;
    }
    
    // Calculate drop position relative to canvas, accounting for transform
    const canvasX = (event.clientX - rect.left - canvasState.transform.x) / canvasState.transform.scale;
    const canvasY = (event.clientY - rect.top - canvasState.transform.y) / canvasState.transform.scale;
    
    console.log('Drop position:', { canvasX, canvasY });
    console.log('Transform:', canvasState.transform);
    console.log('Components before drop:', components.length);
    
    handleDrop(event, { x: canvasX, y: canvasY });
    setIsDragOver(false);
    
    console.log('Drop handled');
  }, [handleDrop, components.length, canvasState.transform]);

  const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
    console.log('=== CANVAS DRAG OVER ===');
    event.preventDefault(); // This is crucial for allowing drop
    event.dataTransfer.dropEffect = 'copy';
    handleDragOver(event);
    setIsDragOver(true);
  }, [handleDragOver]);

  const handleCanvasDragLeave = useCallback((event: React.DragEvent) => {
    // Only set drag over to false if we're leaving the canvas container
    if (!containerRef.current?.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  // Export functionality
  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!canvasRef.current) {
      throw new Error('Canvas not available for export');
    }

    await exportCanvas(canvasRef.current, options);
  }, []);

  // Memoize selected components to prevent infinite re-renders
  const selectedComponents = React.useMemo(() => {
    return selectedIds.map(id => components.find(c => c.id === id)).filter(Boolean) as FlowComponentData[];
  }, [selectedIds, components]);

  // Calculate simple fixed viewBox instead of dynamic infinite canvas
  // This fixes the issue where components appear too small
  const viewBox = `0 0 ${width} ${height}`;
  
  // Transform string for the main content group - use actual canvas transform
  const transformString = `translate(${canvasState.transform.x}, ${canvasState.transform.y}) scale(${canvasState.transform.scale})`;

  console.log('Canvas render - Transform:', canvasState.transform, 'ViewBox:', viewBox);

  const canvasStyle: React.CSSProperties = {
    cursor: isPanning ? 'grabbing' : 'grab',
    userSelect: 'none',
  };

  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      {/* Drop zone overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-50 border-2 border-dashed border-blue-300 z-10 flex items-center justify-center pointer-events-none">
          <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2 text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm font-medium">コンポーネントをここにドロップ</span>
            </div>
          </div>
        </div>
      )}
      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ width, height }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onWheel={handleWheel}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
      >
        <svg
          ref={canvasRef}
          width={width}
          height={height}
          viewBox={viewBox}
          style={canvasStyle}
          className="w-full h-full"
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
        >
          {/* Grid Background */}
          <GridBackground
            width={width}
            height={height}
            transform={{ x: 0, y: 0, scale: 1 }}
            gridSettings={canvasState.grid}
          />

          {/* Main content group with transform */}
          <g transform={transformString}>
            {/* Render connections first (behind components) */}
            <AutoConnectionManager
              components={components}
              connections={connections}
              scale={canvasState.transform.scale}
              selectedConnectionIds={connectionSelectedIds}
              hoveredConnectionId={hoveredConnectionId}
              onConnectionsChange={onConnectionsChange || (() => {})}
              onConnectionSelect={handleConnectionSelect}
              onConnectionHover={handleConnectionHover}
            />

            {/* Render flow components */}
            {components.map((component) => (
              <FlowComponentRenderer
                key={component.id}
                component={component}
                allComponents={components}
                isSelected={isSelected(component.id)}
                isHovered={hoveredComponentId === component.id}
                isDragging={isComponentDraggingFn(component.id)}
                isEditing={editingComponentId === component.id}
                connectingFromPointId={connectionState.isConnecting ? `${connectionState.fromComponentId}:${connectionState.fromPointId}` : null}
                scale={canvasState.transform.scale}
                onUpdate={handleComponentUpdate}
                onSelect={handleComponentSelect}
                onStartDrag={handleComponentStartDrag}
                onDrag={handleComponentDrag}
                onEndDrag={handleComponentEndDrag}
                onDoubleClick={handleComponentDoubleClick}
                onStartEdit={handleComponentStartEdit}
                onEndEdit={handleComponentEndEdit}
                onConnectionPointHover={handleConnectionPointHover}
                onConnectionStart={handleConnectionStart}
                onConnectionEnd={handleConnectionEnd}
              />
            ))}
            
            {/* Selection box */}
            <SelectionBox selectionBox={selectionBox} />
            
            {/* Selection bounds */}
            <SelectionBounds bounds={getSelectionBounds(components)} />
            
            {/* Custom children content */}
            {children}
          </g>
        </svg>
      </div>

      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        {/* Export Button */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2">
          <button
            onClick={() => setShowExportDialog(true)}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="フロー図をエクスポート"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>

        {/* Help Button */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2">
          <button
            onClick={() => setShowShortcutHelp(true)}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="キーボードショートカットヘルプ (?)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Grid Controls */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2 flex flex-col space-y-1">
          <button
            onClick={toggleGrid}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              canvasState.grid.visible
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            title={`グリッド${canvasState.grid.visible ? '非表示' : '表示'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          
          <button
            onClick={toggleSnapToGrid}
            disabled={!canvasState.grid.visible}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              canvasState.grid.snapEnabled && canvasState.grid.visible
                ? 'text-green-600 bg-green-50 hover:bg-green-100'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            } ${
              !canvasState.grid.visible ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={`スナップ${canvasState.grid.snapEnabled ? 'オフ' : 'オン'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2 flex flex-col space-y-1">
          <button
            onClick={() => canZoomIn && setZoom(canvasState.transform.scale + 0.1)}
            disabled={!canZoomIn}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="ズームイン (Ctrl/Cmd + +)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          
          <div className="text-xs text-center text-gray-500 py-1 min-w-12">
            {Math.round(canvasState.transform.scale * 100)}%
          </div>
          
          <button
            onClick={() => canZoomOut && setZoom(canvasState.transform.scale - 0.1)}
            disabled={!canZoomOut}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="ズームアウト (Ctrl/Cmd + -)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          </button>
          
          <button
            onClick={resetCanvas}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="リセット (Ctrl/Cmd + 0)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Canvas Info */}
      <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2">
        <div className="text-xs text-gray-500 space-y-1">
          <div>ズーム: {Math.round(canvasState.transform.scale * 100)}%</div>
          <div>位置: ({Math.round(canvasState.transform.x)}, {Math.round(canvasState.transform.y)})</div>
          <div>グリッド: {canvasState.grid.size}px {canvasState.grid.visible ? '表示' : '非表示'}</div>
          <div>スナップ: {canvasState.grid.snapEnabled ? 'オン' : 'オフ'}</div>
          <div>コンポーネント: {components.length}個</div>
          <div>選択中: {selectedIds.length}個</div>
          <div className="text-gray-400">
            空白エリアをドラッグでパン • Ctrl+ホイールでズーム • Ctrl+A全選択 • Delete削除
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      <PropertiesPanel
        selectedComponents={selectedComponents}
        canvasSettings={{
          gridSize: canvasState.grid.size,
          gridVisible: canvasState.grid.visible,
          snapToGrid: canvasState.grid.snapEnabled,
          backgroundColor: '#ffffff', // TODO: Add background color to canvas state
        }}
        isVisible={showPropertiesPanel}
        onComponentUpdate={handleComponentUpdate}
        onCanvasSettingsUpdate={(settings) => {
          if (settings.gridSize !== undefined) {
            setGridSize(settings.gridSize);
          }
          if (settings.gridVisible !== undefined) {
            toggleGrid();
          }
          if (settings.snapToGrid !== undefined) {
            toggleSnapToGrid();
          }
          // TODO: Add background color update
        }}
        onToggle={onPropertiesPanelToggle || (() => {})}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        projectName={projectName}
      />

      {/* Shortcut Help Dialog */}
      <ShortcutHelp
        isOpen={showShortcutHelp}
        onClose={() => setShowShortcutHelp(false)}
        shortcuts={activeShortcuts}
        categories={getAllCategories()}
      />
    </div>
  );
}