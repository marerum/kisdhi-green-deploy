/**
 * StepComponent - Renders step swimlane components
 */

'use client';

import React from 'react';
import FlowComponentBase, { FlowComponentBaseProps } from './FlowComponentBase';

export default function StepComponent(props: FlowComponentBaseProps) {
  const { data } = props;
  
  return (
    <FlowComponentBase {...props}>
      {/* Background rectangle */}
      <rect
        x={data.position.x}
        y={data.position.y}
        width={data.size.width}
        height={data.size.height}
        fill={data.style.backgroundColor}
        stroke={data.style.borderColor}
        strokeWidth={data.style.borderWidth || 2}
        rx={data.style.borderRadius || 4}
      />
      
      {/* Icon and text using foreignObject for HTML content */}
      <foreignObject
        x={data.position.x}
        y={data.position.y}
        width={data.size.width}
        height={data.size.height}
        style={{ pointerEvents: 'none' }} // クリックイベントを親に委譲
      >
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{ 
            color: data.style.textColor,
            pointerEvents: 'none' // クリックイベントを親に委譲
          }}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-sm font-medium truncate">
              {data.text || 'ステップ'}
            </span>
          </div>
        </div>
      </foreignObject>
    </FlowComponentBase>
  );
}