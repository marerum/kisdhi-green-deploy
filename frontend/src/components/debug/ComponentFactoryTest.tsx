'use client';

import React, { useEffect, useState } from 'react';
import { ComponentFactory } from '@/utils/componentRegistry';

export default function ComponentFactoryTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const results: string[] = [];
    
    // Test creating different component types
    const testTypes = ['start', 'process', 'decision', 'end'] as const;
    
    testTypes.forEach((type, index) => {
      try {
        const component = ComponentFactory.createByType(
          type,
          { x: 100 + index * 200, y: 100 },
          { text: `Test ${type}` }
        );
        
        if (component) {
          results.push(`✅ ${type}: Created successfully - ID: ${component.id}, Text: ${component.text}`);
        } else {
          results.push(`❌ ${type}: Returned null`);
        }
      } catch (error) {
        results.push(`❌ ${type}: Error - ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    
    // Test the exact same logic as convertNodesToCanvasComponents
    const testNodes = [
      { text: "ジャガイモをゆでる", order: 0, actor: "料理人", step: "ジャガイモをゆでる" },
      { text: "ジャガイモをつぶす", order: 1, actor: "料理人", step: "ジャガイモをつぶす" },
      { text: "タマネギをみじん切りにする", order: 2, actor: "料理人", step: "タマネギをみじん切りにする" },
      { text: "ミンチを炒める", order: 3, actor: "料理人", step: "ミンチを炒める" },
      { text: "コロッケを揚げる", order: 4, actor: "料理人", step: "コロッケを揚げる" }
    ];
    
    results.push('\n=== Testing convertNodesToCanvasComponents logic ===');
    
    const components = testNodes.map((node, index) => {
      const componentType = index === 0 ? 'start' : 
                           index === testNodes.length - 1 ? 'end' : 'process';
      
      const spacing = 350;
      const startX = 100;
      const startY = 100;
      
      const position = { x: startX + (index * spacing), y: startY };
      
      const component = ComponentFactory.createByType(
        componentType,
        position,
        { text: node.text || `ステップ ${node.order}` }
      );
      
      if (component && node.actor && node.step) {
        (component as any).actor = node.actor;
        (component as any).step = node.step;
      }
      
      return component;
    }).filter(Boolean);
    
    results.push(`Total components created: ${components.length}`);
    results.push(`Components: ${JSON.stringify(components.filter((c): c is NonNullable<typeof c> => c !== null).map(c => ({ id: c.id, type: c.type, text: c.text })), null, 2)}`);
    
    setTestResults(results);
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">ComponentFactory Test Results</h2>
      <div className="space-y-2">
        {testResults.map((result, index) => (
          <div key={index} className={`p-2 rounded ${
            result.includes('✅') ? 'bg-green-100 text-green-800' :
            result.includes('❌') ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}