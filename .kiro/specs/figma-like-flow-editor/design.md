# Figma-like Flow Editor Design Document

## Architecture Overview

### Component Hierarchy
```
FlowEditorPage
├── FlowEditorToolbar (top)
├── FlowEditorLayout
│   ├── ComponentSidebar (left)
│   ├── FlowCanvas (center)
│   └── PropertiesPanel (right)
└── FlowEditorStatusBar (bottom)
```

### Core Components

#### FlowCanvas
- **Purpose**: Main drawing area with pan/zoom capabilities
- **Technology**: SVG-based rendering for scalability
- **Features**: Grid background, viewport transformation, component rendering
- **State**: Canvas transform, zoom level, grid settings

#### ComponentSidebar
- **Purpose**: Draggable component library
- **Components**: Process steps, decisions, start/end, connectors
- **Features**: Collapsible, search, drag handles
- **State**: Collapsed state, selected component type

#### FlowComponent (Base Class)
- **Purpose**: Abstract base for all flow components
- **Properties**: Position, size, text, connections, style
- **Methods**: Render, update, serialize, deserialize
- **Events**: Select, edit, move, connect

#### ConnectionManager
- **Purpose**: Manages connections between components
- **Features**: Auto-routing, collision detection, arrow rendering
- **State**: Connection list, routing cache

## Data Models

### Canvas State
```typescript
interface CanvasState {
  transform: {
    x: number;
    y: number;
    scale: number;
  };
  grid: {
    size: number;
    visible: boolean;
    snapEnabled: boolean;
  };
  selection: {
    componentIds: number[];
    selectionBox?: Rectangle;
  };
}
```

### Component Data
```typescript
interface FlowComponent {
  id: number;
  type: 'process' | 'decision' | 'start' | 'end';
  position: { x: number; y: number };
  size: { width: number; height: number };
  text: string;
  style: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
  connections: {
    inputs: ConnectionPoint[];
    outputs: ConnectionPoint[];
  };
}

interface ConnectionPoint {
  id: string;
  position: 'top' | 'right' | 'bottom' | 'left';
  offset: number; // 0-1 along the edge
}

interface Connection {
  id: number;
  from: { componentId: number; pointId: string };
  to: { componentId: number; pointId: string };
  path: string; // SVG path data
  label?: string;
}
```

### Project Flow Data
```typescript
interface ProjectFlowData {
  id: number;
  projectId: number;
  canvasState: CanvasState;
  components: FlowComponent[];
  connections: Connection[];
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

## UI Design Specifications

### Color Palette (Figma-inspired)
```css
:root {
  /* Canvas */
  --canvas-bg: #ffffff;
  --grid-color: #e5e5e5;
  --grid-color-major: #d1d1d1;
  
  /* Sidebar */
  --sidebar-bg: #2c2c2c;
  --sidebar-text: #ffffff;
  --sidebar-hover: #3c3c3c;
  
  /* Components */
  --component-process: #4f46e5;
  --component-decision: #f59e0b;
  --component-start: #10b981;
  --component-end: #ef4444;
  --component-selected: #3b82f6;
  
  /* UI Elements */
  --toolbar-bg: #f8f9fa;
  --panel-bg: #ffffff;
  --border-color: #e5e7eb;
}
```

### Layout Dimensions
- **Sidebar Width**: 280px (collapsible to 60px)
- **Properties Panel Width**: 320px (collapsible)
- **Toolbar Height**: 48px
- **Status Bar Height**: 32px
- **Grid Size**: 20px (configurable)
- **Component Min Size**: 120x60px
- **Connection Point Size**: 8px

### Typography
- **Primary Font**: Inter, system-ui, sans-serif
- **Component Text**: 14px, medium weight
- **UI Text**: 13px, regular weight
- **Labels**: 12px, medium weight

## Component Specifications

### Process Step Component
```typescript
class ProcessStepComponent extends FlowComponent {
  type = 'process';
  defaultSize = { width: 160, height: 80 };
  shape = 'rounded-rectangle';
  connectionPoints = [
    { id: 'top', position: 'top', offset: 0.5 },
    { id: 'right', position: 'right', offset: 0.5 },
    { id: 'bottom', position: 'bottom', offset: 0.5 },
    { id: 'left', position: 'left', offset: 0.5 }
  ];
}
```

### Decision Component
```typescript
class DecisionComponent extends FlowComponent {
  type = 'decision';
  defaultSize = { width: 120, height: 120 };
  shape = 'diamond';
  connectionPoints = [
    { id: 'top', position: 'top', offset: 0.5 },
    { id: 'right', position: 'right', offset: 0.5 },
    { id: 'bottom', position: 'bottom', offset: 0.5 },
    { id: 'left', position: 'left', offset: 0.5 }
  ];
}
```

## Interaction Design

### Drag and Drop Flow
1. **Toolbar to Canvas**: Create new component
2. **Canvas to Canvas**: Move existing component
3. **Component to Component**: Create connection
4. **Selection Box**: Multi-select components

### Keyboard Shortcuts
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Delete**: Delete selected components
- **Ctrl+A**: Select all
- **Ctrl+C**: Copy
- **Ctrl+V**: Paste
- **Space+Drag**: Pan canvas
- **Ctrl+Scroll**: Zoom

### Mouse Interactions
- **Click**: Select component
- **Double-click**: Edit component text
- **Drag**: Move component or pan canvas
- **Ctrl+Click**: Multi-select
- **Right-click**: Context menu
- **Scroll**: Zoom (with modifier key)

## State Management

### Canvas State
- Managed by `useCanvasState` hook
- Persisted to localStorage for session recovery
- Synchronized with backend on save

### Component State
- Each component manages its own state
- Global component registry for lookups
- Undo/redo system tracks all changes

### Connection State
- Managed by ConnectionManager
- Auto-updates when components move
- Validates connection rules

## Performance Considerations

### Rendering Optimization
- **Viewport Culling**: Only render visible components
- **Dirty Rectangles**: Only redraw changed areas
- **Component Pooling**: Reuse component instances
- **Connection Caching**: Cache connection paths

### Memory Management
- **Lazy Loading**: Load components on demand
- **Garbage Collection**: Clean up unused components
- **Event Cleanup**: Remove event listeners properly

### Interaction Performance
- **Debounced Updates**: Batch state updates
- **RAF Rendering**: Use requestAnimationFrame
- **Touch Optimization**: Optimize for touch devices

## API Integration

### Backend Endpoints
```typescript
// Save canvas data
PUT /api/projects/{id}/flow-canvas
{
  canvasState: CanvasState;
  components: FlowComponent[];
  connections: Connection[];
}

// Load canvas data
GET /api/projects/{id}/flow-canvas
Response: ProjectFlowData

// Export canvas
POST /api/projects/{id}/flow-canvas/export
{
  format: 'png' | 'svg' | 'pdf';
  options: ExportOptions;
}
```

### Migration Strategy
1. **Detect Legacy Data**: Check for old vertical flow format
2. **Auto-Convert**: Convert to new canvas format
3. **Preserve Data**: Keep original data as backup
4. **User Notification**: Inform user of upgrade

## Testing Strategy

### Unit Tests
- Component rendering and behavior
- State management functions
- Utility functions and helpers

### Integration Tests
- Canvas interactions
- Drag and drop operations
- Save/load functionality

### E2E Tests
- Complete flow creation workflow
- Export functionality
- Migration from legacy format

### Performance Tests
- Large diagram rendering
- Memory usage monitoring
- Interaction responsiveness

## Accessibility

### Keyboard Navigation
- Tab order for all interactive elements
- Keyboard shortcuts for all actions
- Focus indicators for selected components

### Screen Reader Support
- ARIA labels for all components
- Semantic markup for flow structure
- Alternative text for visual elements

### Visual Accessibility
- High contrast mode support
- Scalable text and UI elements
- Color-blind friendly palette

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Feature Detection
- SVG support required
- Touch event support for mobile
- Pointer events for better interaction

## Security Considerations

### Data Validation
- Sanitize all user input
- Validate component properties
- Prevent XSS in text content

### File Operations
- Validate export formats
- Limit file sizes
- Secure file handling