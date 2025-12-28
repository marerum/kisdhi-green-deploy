/**
 * ComponentLibrary Component
 * Defines the library of available flow components with templates and categories
 */

import React from 'react';
import { 
  ComponentTemplate, 
  ComponentLibraryCategory, 
  DEFAULT_COMPONENT_STYLES, 
  DEFAULT_COMPONENT_SIZES,
  DEFAULT_CONNECTION_POINTS 
} from '@/types/flowComponents';
import { 
  ProcessIcon, 
  DecisionIcon, 
  StartIcon, 
  EndIcon, 
  ConnectorIcon,
  CategoryIcon 
} from './ComponentIcons';

// Component templates
export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  {
    type: 'process',
    name: 'プロセス',
    description: '処理ステップや作業を表現',
    icon: ProcessIcon,
    defaultSize: DEFAULT_COMPONENT_SIZES.process,
    defaultStyle: DEFAULT_COMPONENT_STYLES.process,
    defaultConnectionPoints: DEFAULT_CONNECTION_POINTS.process,
    category: 'basic',
  },
  {
    type: 'decision',
    name: '判断',
    description: '条件分岐や意思決定',
    icon: DecisionIcon,
    defaultSize: DEFAULT_COMPONENT_SIZES.decision,
    defaultStyle: DEFAULT_COMPONENT_STYLES.decision,
    defaultConnectionPoints: DEFAULT_CONNECTION_POINTS.decision,
    category: 'basic',
  },
  {
    type: 'start',
    name: '開始',
    description: 'フローの開始点',
    icon: StartIcon,
    defaultSize: DEFAULT_COMPONENT_SIZES.start,
    defaultStyle: DEFAULT_COMPONENT_STYLES.start,
    defaultConnectionPoints: DEFAULT_CONNECTION_POINTS.start,
    category: 'basic',
  },
  {
    type: 'end',
    name: '終了',
    description: 'フローの終了点',
    icon: EndIcon,
    defaultSize: DEFAULT_COMPONENT_SIZES.end,
    defaultStyle: DEFAULT_COMPONENT_STYLES.end,
    defaultConnectionPoints: DEFAULT_CONNECTION_POINTS.end,
    category: 'basic',
  },
  {
    type: 'connector',
    name: '矢印',
    description: 'コンポーネント間の接続',
    icon: ConnectorIcon,
    defaultSize: DEFAULT_COMPONENT_SIZES.connector,
    defaultStyle: DEFAULT_COMPONENT_STYLES.connector,
    defaultConnectionPoints: DEFAULT_CONNECTION_POINTS.connector,
    category: 'connectors',
  },
];

// Component categories
export const COMPONENT_CATEGORIES: ComponentLibraryCategory[] = [
  {
    id: 'basic',
    name: '基本コンポーネント',
    description: 'フロー図の基本的な要素',
    icon: CategoryIcon,
    templates: COMPONENT_TEMPLATES.filter(t => t.category === 'basic'),
    collapsed: false,
  },
  {
    id: 'connectors',
    name: '接続',
    description: 'コンポーネント間の接続要素',
    icon: ConnectorIcon,
    templates: COMPONENT_TEMPLATES.filter(t => t.category === 'connectors'),
    collapsed: false,
  },
];

// Helper functions
export function getComponentTemplate(type: string): ComponentTemplate | undefined {
  return COMPONENT_TEMPLATES.find(template => template.type === type);
}

export function getComponentsByCategory(categoryId: string): ComponentTemplate[] {
  return COMPONENT_TEMPLATES.filter(template => template.category === categoryId);
}

export function getAllCategories(): ComponentLibraryCategory[] {
  return COMPONENT_CATEGORIES;
}

export function getCategoryById(categoryId: string): ComponentLibraryCategory | undefined {
  return COMPONENT_CATEGORIES.find(category => category.id === categoryId);
}