/**
 * Component Registry - Manages flow component instances and types
 * Provides centralized component management and factory functions
 */

import { FlowComponentData, FlowComponentType, ComponentTemplate } from '@/types/flowComponents';
import { Point } from '@/types/canvas';
import { COMPONENT_TEMPLATES } from '@/components/flow/ComponentLibrary';

// Component registry for managing instances
export class ComponentRegistry {
  private components: Map<string, FlowComponentData> = new Map();
  private nextZIndex: number = 0;

  /**
   * Add a component to the registry
   */
  addComponent(component: FlowComponentData): void {
    this.components.set(component.id, component);
    if (component.zIndex >= this.nextZIndex) {
      this.nextZIndex = component.zIndex + 1;
    }
  }

  /**
   * Remove a component from the registry
   */
  removeComponent(id: string): boolean {
    return this.components.delete(id);
  }

  /**
   * Get a component by ID
   */
  getComponent(id: string): FlowComponentData | undefined {
    return this.components.get(id);
  }

  /**
   * Get all components
   */
  getAllComponents(): FlowComponentData[] {
    return Array.from(this.components.values());
  }

  /**
   * Update a component
   */
  updateComponent(id: string, updates: Partial<FlowComponentData>): boolean {
    const component = this.components.get(id);
    if (!component) return false;

    const updatedComponent = { ...component, ...updates };
    this.components.set(id, updatedComponent);
    return true;
  }

  /**
   * Get components by type
   */
  getComponentsByType(type: FlowComponentType): FlowComponentData[] {
    return this.getAllComponents().filter(component => component.type === type);
  }

  /**
   * Get components in a rectangular area
   */
  getComponentsInArea(topLeft: Point, bottomRight: Point): FlowComponentData[] {
    return this.getAllComponents().filter(component => {
      const { position, size } = component;
      const componentRight = position.x + size.width;
      const componentBottom = position.y + size.height;

      return (
        position.x < bottomRight.x &&
        componentRight > topLeft.x &&
        position.y < bottomRight.y &&
        componentBottom > topLeft.y
      );
    });
  }

  /**
   * Get component at specific point
   */
  getComponentAtPoint(point: Point): FlowComponentData | undefined {
    // Sort by z-index (highest first) to get topmost component
    const sortedComponents = this.getAllComponents()
      .sort((a, b) => b.zIndex - a.zIndex);

    return sortedComponents.find(component => {
      const { position, size } = component;
      return (
        point.x >= position.x &&
        point.x <= position.x + size.width &&
        point.y >= position.y &&
        point.y <= position.y + size.height
      );
    });
  }

  /**
   * Bring component to front
   */
  bringToFront(id: string): boolean {
    const component = this.components.get(id);
    if (!component) return false;

    component.zIndex = this.nextZIndex++;
    return true;
  }

  /**
   * Send component to back
   */
  sendToBack(id: string): boolean {
    const component = this.components.get(id);
    if (!component) return false;

    // Find minimum z-index
    const minZIndex = Math.min(...this.getAllComponents().map(c => c.zIndex));
    component.zIndex = minZIndex - 1;
    return true;
  }

  /**
   * Clear all components
   */
  clear(): void {
    this.components.clear();
    this.nextZIndex = 0;
  }

  /**
   * Get next available z-index
   */
  getNextZIndex(): number {
    return this.nextZIndex++;
  }

  /**
   * Serialize components to JSON
   */
  serialize(): string {
    return JSON.stringify({
      components: Array.from(this.components.values()),
      nextZIndex: this.nextZIndex,
    });
  }

  /**
   * Deserialize components from JSON
   */
  deserialize(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      this.components.clear();
      
      if (parsed.components && Array.isArray(parsed.components)) {
        parsed.components.forEach((component: FlowComponentData) => {
          this.components.set(component.id, component);
        });
      }
      
      this.nextZIndex = parsed.nextZIndex || 0;
      return true;
    } catch (error) {
      console.error('Failed to deserialize components:', error);
      return false;
    }
  }
}

// Factory functions for creating components
export class ComponentFactory {
  /**
   * Create a component from a template
   */
  static createFromTemplate(
    template: ComponentTemplate,
    position: Point,
    overrides?: Partial<FlowComponentData>
  ): FlowComponentData {
    console.log('=== ComponentFactory.createFromTemplate called ===');
    console.log('Template:', template);
    console.log('Position:', position);
    console.log('Overrides:', overrides);
    
    const id = overrides?.id || `${template.type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    console.log('Generated ID:', id);
    
    const result = {
      id,
      type: template.type,
      position,
      size: overrides?.size || template.defaultSize,
      text: overrides?.text || template.name,
      style: overrides?.style || template.defaultStyle,
      connectionPoints: template.defaultConnectionPoints.map((cp, index) => ({
        ...cp,
        id: `${id}-${cp.position}-${index}`,
      })),
      zIndex: overrides?.zIndex || 0,
      locked: overrides?.locked || false,
      visible: overrides?.visible !== false,
      metadata: overrides?.metadata || {},
    };
    
    console.log('Created component result:', result);
    console.log('Component visible:', result.visible);
    console.log('Component position:', result.position);
    console.log('Component size:', result.size);
    console.log('Component style:', result.style);
    return result;
  }

  /**
   * Create a component by type
   */
  static createByType(
    type: FlowComponentType,
    position: Point,
    overrides?: Partial<FlowComponentData>
  ): FlowComponentData | null {
    console.log('=== ComponentFactory.createByType called ===');
    console.log('Type:', type);
    console.log('Position:', position);
    console.log('Overrides:', overrides);
    console.log('Available templates:', COMPONENT_TEMPLATES.map(t => ({ type: t.type, name: t.name })));
    
    const template = COMPONENT_TEMPLATES.find(t => t.type === type);
    console.log('Found template:', template ? { type: template.type, name: template.name } : null);
    
    if (!template) {
      console.error(`Unknown component type: ${type}`);
      console.error('Available types:', COMPONENT_TEMPLATES.map(t => t.type));
      return null;
    }

    const result = ComponentFactory.createFromTemplate(template, position, overrides);
    console.log('Created component:', result);
    return result;
  }

  /**
   * Clone an existing component
   */
  static clone(
    component: FlowComponentData,
    newPosition?: Point,
    overrides?: Partial<FlowComponentData>
  ): FlowComponentData {
    const id = overrides?.id || `${component.type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    return {
      ...component,
      id,
      position: newPosition || { 
        x: component.position.x + 20, 
        y: component.position.y + 20 
      },
      connectionPoints: component.connectionPoints.map((cp, index) => ({
        ...cp,
        id: `${id}-${cp.position}-${index}`,
      })),
      ...overrides,
    };
  }
}

// Global component registry instance
export const globalComponentRegistry = new ComponentRegistry();

// Helper functions
export function generateComponentId(type: FlowComponentType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function validateComponent(component: FlowComponentData): boolean {
  return !!(
    component.id &&
    component.type &&
    component.position &&
    component.size &&
    component.size.width > 0 &&
    component.size.height > 0 &&
    component.style &&
    Array.isArray(component.connectionPoints)
  );
}

export function getComponentBounds(component: FlowComponentData) {
  return {
    left: component.position.x,
    top: component.position.y,
    right: component.position.x + component.size.width,
    bottom: component.position.y + component.size.height,
    width: component.size.width,
    height: component.size.height,
  };
}

export function isPointInComponent(point: Point, component: FlowComponentData): boolean {
  const bounds = getComponentBounds(component);
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  );
}