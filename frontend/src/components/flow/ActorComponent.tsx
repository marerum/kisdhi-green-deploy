/**
 * ActorComponent - Renders actor swimlane components
 */

'use client';

import React from 'react';
import FlowComponentBase, { FlowComponentBaseProps } from './FlowComponentBase';

export default function ActorComponent(props: FlowComponentBaseProps) {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-medium truncate">
              {data.text || '登場人物'}
            </span>
          </div>
        </div>
      </foreignObject>
    </FlowComponentBase>
  );
}