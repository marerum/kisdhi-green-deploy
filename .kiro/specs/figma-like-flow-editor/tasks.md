# Figma-like Flow Editor Implementation Tasks

## Phase 1: Canvas Foundation (Priority: High)

### Task 1.1: Create Canvas Infrastructure
**Requirement**: US-1, TR-1  
**Description**: Implement the basic canvas component with SVG rendering and viewport controls

**Implementation Steps**:
1. Create `FlowCanvas.tsx` component with SVG container
2. Implement viewport transformation (pan, zoom)
3. Add mouse/touch event handlers for pan and zoom
4. Create `useCanvasState` hook for state management
5. Add canvas bounds and scroll limits

**Files to Create/Modify**:
- `frontend/src/components/flow/FlowCanvas.tsx`
- `frontend/src/hooks/useCanvasState.ts`
- `frontend/src/types/canvas.ts`

**Acceptance Criteria**:
- Canvas renders as SVG with proper dimensions
- Mouse wheel zooms in/out smoothly
- Drag to pan functionality works
- Zoom limits prevent excessive zoom in/out
- Canvas state persists during component re-renders

### Task 1.2: Implement Grid System
**Requirement**: US-3, TR-1  
**Description**: Add grid background with snap-to-grid functionality

**Implementation Steps**:
1. Create `GridBackground.tsx` component
2. Implement grid pattern rendering (dots or lines)
3. Add grid size configuration
4. Implement snap-to-grid utility functions
5. Add grid visibility toggle

**Files to Create/Modify**:
- `frontend/src/components/flow/GridBackground.tsx`
- `frontend/src/utils/gridUtils.ts`
- `frontend/src/components/flow/FlowCanvas.tsx`

**Acceptance Criteria**:
- Grid renders with configurable size (default 20px)
- Grid scales properly with zoom level
- Snap-to-grid function rounds positions to grid
- Grid can be toggled on/off
- Grid appearance is subtle and non-distracting

### Task 1.3: Update Flow Editor Page Layout
**Requirement**: US-8, TR-3  
**Description**: Restructure the flow page to accommodate new canvas-based layout

**Implementation Steps**:
1. Modify `frontend/src/app/projects/[id]/flow/page.tsx`
2. Create new layout with sidebar and canvas areas
3. Move existing toolbar to top of page
4. Add canvas container with proper sizing
5. Update responsive design for mobile

**Files to Create/Modify**:
- `frontend/src/app/projects/[id]/flow/page.tsx`
- `frontend/src/components/flow/FlowEditorLayout.tsx`

**Acceptance Criteria**:
- Page layout matches Figma-style design
- Canvas takes up majority of screen space
- Layout is responsive on different screen sizes
- Existing functionality (generate flow, undo) still works
- Clean, modern visual design

## Phase 2: Component System (Priority: High)

### Task 2.1: Create Component Sidebar
**Requirement**: US-2, US-8  
**Description**: Build the left sidebar with draggable component library

**Implementation Steps**:
1. Create `ComponentSidebar.tsx` with component library
2. Implement component type definitions and icons
3. Add drag handles for each component type
4. Create collapsible sidebar functionality
5. Style with Figma-inspired dark theme

**Files to Create/Modify**:
- `frontend/src/components/flow/ComponentSidebar.tsx`
- `frontend/src/components/flow/ComponentLibrary.tsx`
- `frontend/src/types/flowComponents.ts`

**Acceptance Criteria**:
- Sidebar shows all component types with Japanese labels
- Components are draggable from sidebar
- Sidebar can collapse/expand
- Dark theme matches Figma aesthetic
- Component icons are clear and recognizable

### Task 2.2: Implement Base Flow Component System ✅
**Requirement**: US-4, TR-2  
**Description**: Create the base component architecture for flow elements

**Implementation Steps**:
1. ✅ Create `FlowComponentBase.tsx` abstract component
2. ✅ Implement component positioning and sizing
3. ✅ Add component selection and hover states
4. ✅ Create component registry system
5. ✅ Implement component serialization/deserialization

**Files Created/Modified**:
- ✅ `frontend/src/components/flow/FlowComponentBase.tsx`
- ✅ `frontend/src/components/flow/ProcessStepComponent.tsx`
- ✅ `frontend/src/components/flow/DecisionComponent.tsx`
- ✅ `frontend/src/components/flow/StartEndComponent.tsx`
- ✅ `frontend/src/utils/componentRegistry.ts`
- ✅ `frontend/src/components/flow/FlowComponentRenderer.tsx`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`
- ✅ Updated `frontend/src/components/flow/CanvasTest.tsx`

**Acceptance Criteria**:
- ✅ All component types inherit from base component
- ✅ Components render at correct positions on canvas
- ✅ Selection states are visually clear
- ✅ Components can be serialized to/from JSON
- ✅ Component registry manages all instances

### Task 2.3: Implement Drag and Drop from Sidebar ✅
**Requirement**: US-4, TR-1  
**Description**: Enable dragging components from sidebar to canvas

**Implementation Steps**:
1. ✅ Add drag event handlers to sidebar components
2. ✅ Implement drop zones on canvas
3. ✅ Create visual feedback during drag operations
4. ✅ Handle component creation on drop
5. ✅ Integrate with grid snapping

**Files Created/Modified**:
- ✅ `frontend/src/hooks/useDragAndDrop.ts`
- ✅ Updated `frontend/src/components/flow/ComponentSidebar.tsx`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`

**Acceptance Criteria**:
- ✅ Components can be dragged from sidebar to canvas
- ✅ Visual feedback shows drag state and drop zones
- ✅ New components are created at drop position
- ✅ Components snap to grid when dropped
- ✅ Drag operations are smooth and responsive

## Phase 3: Component Editing and Interaction (Priority: Medium)

### Task 3.1: Implement Component Selection System ✅
**Requirement**: US-7, TR-3  
**Description**: Add single and multi-selection functionality

**Implementation Steps**:
1. ✅ Create selection state management
2. ✅ Implement click-to-select functionality
3. ✅ Add Ctrl+click for multi-selection
4. ✅ Create selection box for area selection
5. ✅ Add visual selection indicators

**Files Created/Modified**:
- ✅ `frontend/src/hooks/useSelection.ts`
- ✅ `frontend/src/components/flow/SelectionBox.tsx`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`
- ✅ Updated `frontend/src/components/flow/CanvasTest.tsx`
- ✅ Updated `frontend/src/app/globals.css`

**Acceptance Criteria**:
- ✅ Single click selects individual components
- ✅ Ctrl+click adds/removes from selection
- ✅ Drag selection box selects multiple components
- ✅ Selected components show clear visual indicators
- ✅ Selection state is properly managed

### Task 3.2: Add Component Editing Functionality ✅
**Requirement**: US-5, TR-3  
**Description**: Enable inline editing of component text and properties

**Implementation Steps**:
1. ✅ Add double-click to edit functionality
2. ✅ Create inline text editor component
3. ✅ Implement component property editing
4. ✅ Add auto-save for component changes
5. ✅ Integrate with keyboard shortcuts (F2, Enter, Escape)

**Files Created/Modified**:
- ✅ `frontend/src/components/flow/ComponentEditor.tsx`
- ✅ Updated `frontend/src/components/flow/FlowComponentBase.tsx`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`
- ✅ Updated `frontend/src/components/flow/CanvasTest.tsx`

**Acceptance Criteria**:
- ✅ Double-click enters edit mode
- ✅ F2 key enters edit mode for selected component
- ✅ Text editing is smooth and intuitive
- ✅ Changes are saved with Enter key
- ✅ Escape key cancels editing
- ✅ Edit mode has clear visual feedback

### Task 3.3: Implement Component Movement on Canvas ✅
**Requirement**: US-4, TR-1  
**Description**: Allow repositioning of components on canvas

**Implementation Steps**:
1. ✅ Add drag handlers to components
2. ✅ Implement smooth dragging with visual feedback
3. ✅ Add multi-component drag support
4. ✅ Integrate with grid snapping
5. ✅ Update component positions during movement

**Files Created/Modified**:
- ✅ `frontend/src/hooks/useComponentDrag.ts`
- ✅ `frontend/src/utils/dragUtils.ts`
- ✅ Updated `frontend/src/components/flow/FlowComponentBase.tsx`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`

**Acceptance Criteria**:
- ✅ Components can be dragged smoothly on canvas
- ✅ Multiple selected components move together
- ✅ Grid snapping works during drag
- ✅ Visual feedback shows drag state
- ✅ Performance remains smooth with many components

## Phase 4: Connection System (Priority: Medium)

### Task 4.1: Create Connection Points System ✅
**Requirement**: US-6, TR-2  
**Description**: Add connection points to components for linking

**Implementation Steps**:
1. ✅ Create `ConnectionPoint.tsx` component
2. ✅ Add connection points to all component types
3. ✅ Implement connection point visibility on hover
4. ✅ Create connection point positioning logic
5. ✅ Add connection validation rules

**Files Created/Modified**:
- ✅ `frontend/src/components/flow/ConnectionPoint.tsx`
- ✅ `frontend/src/utils/connectionUtils.ts`
- ✅ Updated `frontend/src/components/flow/FlowComponentBase.tsx`
- ✅ Updated `frontend/src/components/flow/FlowComponentRenderer.tsx`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`
- ✅ Updated `frontend/src/components/flow/CanvasTest.tsx`

**Acceptance Criteria**:
- ✅ Connection points appear on component hover
- ✅ Points are positioned correctly on component edges
- ✅ Visual feedback shows valid connection targets
- ✅ Connection rules prevent invalid connections
- ✅ Points scale properly with component size

### Task 4.2: Implement Connection Creation ✅
**Requirement**: US-6, TR-2  
**Description**: Enable creating connections between components

**Implementation Steps**:
1. ✅ Create `Connection.tsx` component for rendering arrows
2. ✅ Implement drag-to-connect functionality
3. ✅ Add automatic arrow routing and pathfinding
4. ✅ Create connection state management
5. ✅ Add connection labels and styling

**Files Created/Modified**:
- ✅ `frontend/src/components/flow/Connection.tsx`
- ✅ `frontend/src/components/flow/ConnectionManager.tsx`
- ✅ `frontend/src/hooks/useConnections.ts`
- ✅ `frontend/src/utils/connectionUtils.ts`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`
- ✅ Updated `frontend/src/components/flow/CanvasTest.tsx`
- ✅ Updated `frontend/src/app/globals.css`

**Acceptance Criteria**:
- ✅ Drag from connection point creates new connection
- ✅ Arrows route automatically around components
- ✅ Connections update when components move
- ✅ Connection styling is clear and professional
- ✅ Connection creation is intuitive

### Task 4.3: Add Connection Management ✅
**Requirement**: US-6, TR-3  
**Description**: Implement connection editing, deletion, and management

**Implementation Steps**:
1. ✅ Add connection selection and deletion
2. ✅ Implement connection label editing
3. ✅ Create connection context menu
4. ✅ Add connection validation and error handling
5. ✅ Integrate connections with undo/redo

**Files Created/Modified**:
- ✅ `frontend/src/components/flow/Connection.tsx`
- ✅ `frontend/src/components/flow/ConnectionContextMenu.tsx`
- ✅ `frontend/src/hooks/useConnections.ts`
- ✅ Updated `frontend/src/components/flow/ConnectionManager.tsx`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`
- ✅ Updated `frontend/src/components/flow/CanvasTest.tsx`

**Acceptance Criteria**:
- ✅ Connections can be selected and deleted
- ✅ Connection labels can be edited inline
- ✅ Context menu provides connection options
- ✅ Invalid connections show error states
- ✅ Connection operations support undo/redo

## Phase 5: Properties and Advanced Features (Priority: Low)

### Task 5.1: Create Properties Panel ✅
**Requirement**: US-5, US-8  
**Description**: Add right sidebar for component and canvas properties

**Implementation Steps**:
1. ✅ Create `PropertiesPanel.tsx` component
2. ✅ Implement component property editors
3. ✅ Add canvas settings panel
4. ✅ Create color picker and style controls
5. ✅ Add collapsible panel sections

**Files Created/Modified**:
- ✅ `frontend/src/components/flow/PropertiesPanel.tsx`
- ✅ `frontend/src/components/flow/ComponentProperties.tsx`
- ✅ `frontend/src/components/flow/CanvasProperties.tsx`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`
- ✅ Updated `frontend/src/app/projects/[id]/flow/page.tsx`

**Acceptance Criteria**:
- ✅ Properties panel shows selected component properties
- ✅ All component properties can be edited
- ✅ Canvas settings are accessible
- ✅ Panel is collapsible and responsive
- ✅ Changes apply immediately with preview

### Task 5.2: Add Export Functionality ✅
**Requirement**: TR-5  
**Description**: Implement canvas export to various formats

**Implementation Steps**:
1. ✅ Create export utility functions
2. ✅ Implement PNG export from SVG
3. ✅ Add SVG export functionality
4. ✅ Create PDF export option
5. ✅ Add export options dialog

**Files Created/Modified**:
- ✅ `frontend/src/utils/exportUtils.ts`
- ✅ `frontend/src/components/flow/ExportDialog.tsx`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`
- ✅ Updated `frontend/src/components/flow/CanvasTest.tsx`
- ✅ Updated `frontend/src/app/projects/[id]/flow/page.tsx`
- ✅ Updated `frontend/package.json` (added jsPDF dependency)

**Acceptance Criteria**:
- ✅ Canvas can be exported as PNG, SVG, PDF
- ✅ Export quality is high and accurate
- ✅ Export options allow customization
- ✅ Large canvases export without issues
- ✅ Export progress is shown to user

### Task 5.3: Implement Keyboard Shortcuts ✅
**Requirement**: TR-3  
**Description**: Add comprehensive keyboard shortcuts for efficiency

**Implementation Steps**:
1. ✅ Create keyboard shortcut system
2. ✅ Implement standard shortcuts (Ctrl+Z, Ctrl+C, etc.)
3. ✅ Add canvas-specific shortcuts
4. ✅ Create shortcut help dialog
5. ✅ Handle shortcut conflicts

**Files Created/Modified**:
- ✅ `frontend/src/hooks/useKeyboardShortcuts.ts`
- ✅ `frontend/src/components/flow/ShortcutHelp.tsx`
- ✅ Updated `frontend/src/components/flow/FlowCanvas.tsx`
- ✅ Updated `frontend/src/app/projects/[id]/flow/page.tsx`
- ✅ Updated `frontend/src/components/flow/CanvasTest.tsx`

**Acceptance Criteria**:
- ✅ All major operations have keyboard shortcuts
- ✅ Shortcuts work consistently across the app
- ✅ Help dialog shows all available shortcuts
- ✅ Shortcuts don't conflict with browser defaults
- ✅ Shortcuts are intuitive and follow conventions

## Phase 6: Data Migration and Integration (Priority: High)

### Task 6.1: Create Data Migration System
**Requirement**: TR-5  
**Description**: Convert existing vertical flow data to new canvas format

**Implementation Steps**:
1. Create migration utility functions
2. Implement automatic layout algorithm for existing flows
3. Add data version detection
4. Create backup system for original data
5. Add migration progress feedback

**Files to Create/Modify**:
- `frontend/src/utils/migrationUtils.ts`
- `frontend/src/utils/autoLayout.ts`
- `backend/app/services/migration.py`

**Acceptance Criteria**:
- Existing flows are automatically converted
- Converted layouts are visually reasonable
- Original data is preserved as backup
- Migration process is transparent to user
- Migration errors are handled gracefully

### Task 6.2: Update Backend API
**Requirement**: TR-5  
**Description**: Modify backend to support new canvas data format

**Implementation Steps**:
1. Update flow data models for canvas format
2. Modify existing API endpoints
3. Add new canvas-specific endpoints
4. Implement data validation
5. Add backward compatibility

**Files to Create/Modify**:
- `backend/app/models.py`
- `backend/app/schemas.py`
- `backend/app/routers/flow.py`

**Acceptance Criteria**:
- Backend supports both old and new data formats
- API endpoints handle canvas data correctly
- Data validation prevents corruption
- Migration endpoints work reliably
- Performance is maintained with new data structure

### Task 6.3: Update Tests for New System
**Requirement**: TR-3  
**Description**: Create comprehensive tests for canvas-based flow editor

**Implementation Steps**:
1. Update existing flow component tests
2. Create canvas interaction tests
3. Add drag and drop tests
4. Implement connection system tests
5. Add migration tests

**Files to Create/Modify**:
- `frontend/src/components/flow/__tests__/FlowCanvas.test.tsx`
- `frontend/src/components/flow/__tests__/ComponentSidebar.test.tsx`
- `frontend/src/components/flow/__tests__/FlowComponentBase.test.tsx`
- `frontend/src/utils/__tests__/migrationUtils.test.ts`
- `backend/tests/test_flow_canvas.py`

**Acceptance Criteria**:
- All new components have comprehensive tests
- Interaction tests cover drag and drop scenarios
- Migration tests ensure data integrity
- Performance tests validate smooth operation
- Test coverage remains above 90%

## Implementation Priority

### Sprint 1 (Week 1-2): Foundation
- Task 1.1: Canvas Infrastructure
- Task 1.2: Grid System
- Task 1.3: Page Layout Update

### Sprint 2 (Week 3-4): Components
- Task 2.1: Component Sidebar
- Task 2.2: Base Component System
- Task 2.3: Drag and Drop

### Sprint 3 (Week 5-6): Interaction
- Task 3.1: Selection System
- Task 3.2: Component Editing
- Task 3.3: Component Movement

### Sprint 4 (Week 7-8): Connections
- Task 4.1: Connection Points
- Task 4.2: Connection Creation
- Task 4.3: Connection Management

### Sprint 5 (Week 9-10): Migration
- Task 6.1: Data Migration
- Task 6.2: Backend API Updates
- Task 6.3: Test Updates

### Sprint 6 (Week 11-12): Polish
- Task 5.1: Properties Panel
- Task 5.2: Export Functionality
- Task 5.3: Keyboard Shortcuts

## Success Criteria

### Functional Requirements
- ✅ All existing flow functionality is preserved
- ✅ New canvas-based interface is fully functional
- ✅ Drag and drop works smoothly
- ✅ Grid system provides proper alignment
- ✅ Component editing is intuitive
- ✅ Connection system is robust

### Performance Requirements
- ✅ Canvas handles 50+ components smoothly
- ✅ Drag operations are responsive (<16ms)
- ✅ Zoom and pan are smooth
- ✅ Memory usage remains reasonable

### User Experience Requirements
- ✅ Interface looks and feels like Figma
- ✅ Learning curve is minimal for existing users
- ✅ All operations are discoverable
- ✅ Error states are handled gracefully

### Technical Requirements
- ✅ Data migration is seamless
- ✅ Backward compatibility is maintained
- ✅ Code is maintainable and well-tested
- ✅ Performance meets requirements