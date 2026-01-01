'use client';

import React, { useState } from 'react';
import { ComponentFactory } from '@/utils/componentRegistry';
import { COMPONENT_TEMPLATES, COMPONENT_CATEGORIES } from '@/components/flow/ComponentLibrary';
import { FlowComponentData } from '@/types/flowComponents';

export default function TestComponentsPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [createdComponents, setCreatedComponents] = useState<FlowComponentData[]>([]);

  const runTests = () => {
    const results: string[] = [];
    const components: FlowComponentData[] = [];
    
    results.push('=== Component Templates Test ===');
    results.push(`Total templates: ${COMPONENT_TEMPLATES.length}`);
    results.push(`Total categories: ${COMPONENT_CATEGORIES.length}`);
    
    COMPONENT_TEMPLATES.forEach(template => {
      results.push(`Template: ${template.type} - ${template.name} (${template.category})`);
    });
    
    results.push('\n=== Component Creation Test ===');
    
    // Test creating each component type
    const testTypes = ['process', 'decision', 'start', 'end', 'actor', 'step', 'connector'] as const;
    
    testTypes.forEach((type, index) => {
      try {
        const component = ComponentFactory.createByType(
          type,
          { x: 100 + index * 150, y: 100 },
          { text: `Test ${type}` }
        );
        
        if (component) {
          results.push(`✅ ${type}: Created successfully`);
          components.push(component);
        } else {
          results.push(`❌ ${type}: Returned null`);
        }
      } catch (error) {
        results.push(`❌ ${type}: Error - ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    
    setTestResults(results);
    setCreatedComponents(components);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Component System Test</h1>
      
      <button
        onClick={runTests}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-6"
      >
        Run Tests
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Results */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>
          <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className={`text-sm mb-1 ${
                result.includes('✅') ? 'text-green-600' :
                result.includes('❌') ? 'text-red-600' :
                result.includes('===') ? 'font-bold text-blue-600' :
                'text-gray-700'
              }`}>
                <pre className="whitespace-pre-wrap">{result}</pre>
              </div>
            ))}
          </div>
        </div>
        
        {/* Visual Components */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Created Components</h2>
          <div className="bg-white border rounded-lg p-4 min-h-96">
            <svg width="100%" height="400" className="border">
              {createdComponents.map((component) => (
                <g key={component.id}>
                  <rect
                    x={component.position.x}
                    y={component.position.y}
                    width={component.size.width}
                    height={component.size.height}
                    fill={component.style.backgroundColor}
                    stroke={component.style.borderColor}
                    strokeWidth={component.style.borderWidth || 1}
                    rx={component.style.borderRadius || 0}
                  />
                  <text
                    x={component.position.x + component.size.width / 2}
                    y={component.position.y + component.size.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={component.style.textColor}
                    fontSize="12"
                    fontFamily="Inter, sans-serif"
                  >
                    {component.text}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
      
      {/* Categories Debug */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Categories Debug</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          {COMPONENT_CATEGORIES.map(category => (
            <div key={category.id} className="mb-4">
              <h3 className="font-medium text-blue-600">{category.name} ({category.id})</h3>
              <div className="ml-4">
                {category.templates.map(template => (
                  <div key={template.type} className="text-sm text-gray-700">
                    • {template.type}: {template.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}