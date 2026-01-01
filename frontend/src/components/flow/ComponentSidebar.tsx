/**
 * ComponentSidebar Component
 * Left sidebar with draggable component library for Figma-like flow editor
 */

'use client';

import React, { useState, useCallback } from 'react';
import { ComponentTemplate, DraggedComponent } from '@/types/flowComponents';
import { COMPONENT_CATEGORIES } from './ComponentLibrary';
import { ChevronDownIcon, ChevronRightIcon, DragIcon } from './ComponentIcons';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';

interface ComponentSidebarProps {
  collapsed?: boolean;
  onDragStart?: (component: DraggedComponent, event: React.DragEvent) => void;
  onDragEnd?: () => void;
  className?: string;
}

interface ComponentItemProps {
  template: ComponentTemplate;
  collapsed: boolean;
  onDragStart?: (template: ComponentTemplate, event: React.DragEvent) => void;
}

function ComponentItem({ template, collapsed, onDragStart }: ComponentItemProps) {
  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    console.log('=== COMPONENT ITEM DRAG START ===');
    console.log('Template:', template.name);
    onDragStart?.(template, event);
  }, [template, onDragStart]);

  const handleDragEnd = useCallback(() => {
    console.log('=== COMPONENT ITEM DRAG END ===');
    // Cleanup if needed
  }, []);

  if (collapsed) {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="w-10 h-10 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors group mb-2"
        title={`${template.name} - ${template.description}`}
      >
        <template.icon className="w-5 h-5 text-gray-700 group-hover:text-gray-900 transition-colors" />
      </div>
    );
  }
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="flex items-center space-x-3 p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-100 cursor-grab active:cursor-grabbing transition-colors group"
    >
      <div 
        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: template.defaultStyle.backgroundColor }}
      >
        <template.icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
          {template.name}
        </div>
        <div className="text-xs text-gray-500 group-hover:text-gray-600 truncate">
          {template.description}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <DragIcon className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: typeof COMPONENT_CATEGORIES[0];
  collapsed: boolean;
  sidebarCollapsed: boolean;
  onToggle: (categoryId: string) => void;
  onDragStart?: (template: ComponentTemplate, event: React.DragEvent) => void;
}

function CategorySection({ 
  category, 
  collapsed, 
  sidebarCollapsed, 
  onToggle, 
  onDragStart 
}: CategorySectionProps) {
  const handleToggle = useCallback(() => {
    onToggle(category.id);
  }, [category.id, onToggle]);

  if (sidebarCollapsed) {
    return (
      <div className="space-y-2">
        {category.templates.map((template) => (
          <ComponentItem
            key={template.type}
            template={template}
            collapsed={true}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Category Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 rounded-lg transition-colors group"
      >
        <div className="flex items-center space-x-2">
          {category.icon && (
            <category.icon className="w-4 h-4 text-gray-500 group-hover:text-gray-600" />
          )}
          <span className="text-xs text-gray-600 group-hover:text-gray-700 uppercase tracking-wide font-medium">
            {category.name}
          </span>
        </div>
        {collapsed ? (
          <ChevronRightIcon className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronDownIcon className="w-3 h-3 text-gray-500" />
        )}
      </button>

      {/* Category Content */}
      {!collapsed && (
        <div className="space-y-2 pl-2">
          {category.templates.map((template) => (
            <ComponentItem
              key={template.type}
              template={template}
              collapsed={false}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComponentSidebar({ 
  collapsed = false, 
  onDragStart, 
  onDragEnd,
  className = '' 
}: ComponentSidebarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Debug: Log available categories and templates
  console.log('=== COMPONENT SIDEBAR DEBUG ===');
  console.log('Available categories:', COMPONENT_CATEGORIES.length);
  COMPONENT_CATEGORIES.forEach(category => {
    console.log(`Category ${category.id}:`, category.templates.length, 'templates');
    category.templates.forEach(template => {
      console.log(`  - ${template.type}: ${template.name}`);
    });
  });

  const { startDrag, dragState } = useDragAndDrop({
    onDragStart: (template, offset) => {
      console.log('Drag started:', template.name, 'offset:', offset);
    },
    onDragEnd: () => {
      console.log('Drag ended');
      onDragEnd?.();
    },
  });

  const handleCategoryToggle = useCallback((categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const handleDragStart = useCallback((template: ComponentTemplate, event: React.DragEvent) => {
    console.log('=== SIDEBAR DRAG START ===');
    console.log('Template:', template.name);
    console.log('Event:', event);
    
    // Calculate offset from mouse position to component center
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };

    console.log('Calculated offset:', offset);

    startDrag(template, event, offset);

    // Also call the legacy callback for compatibility
    const draggedComponent: DraggedComponent = { template, offset };
    onDragStart?.(draggedComponent, event);
    
    console.log('Drag start completed');
  }, [startDrag, onDragStart]);

  return (
    <div className={`h-full overflow-y-auto ${className}`}>
      <div className={`${collapsed ? 'p-2' : 'p-4'} space-y-4`}>
        {COMPONENT_CATEGORIES.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            collapsed={collapsedCategories.has(category.id)}
            sidebarCollapsed={collapsed}
            onToggle={handleCategoryToggle}
            onDragStart={handleDragStart}
          />
        ))}

        {/* Instructions */}
        {!collapsed && (
          <div className="pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-600 space-y-2">
                <p>💡 使い方:</p>
                <ul className="space-y-1 text-gray-500">
                  <li>• コンポーネントをキャンバスにドラッグ</li>
                  <li>• 自動的にグリッドに配置</li>
                  <li>• ダブルクリックでテキスト編集</li>
                  <li>• 接続点をドラッグして線を作成</li>
                </ul>
                {dragState.isDragging && (
                  <div className="text-blue-600 font-medium">
                    🎯 ドラッグ中: {dragState.draggedTemplate?.name}
                  </div>
                )}
              </div>
            </div>
        )}
      </div>
    </div>
  );
}