/**
 * ProcessStepComponent - Rectangular process step component
 * Represents a process or action in the flow
 */

'use client';

import React from 'react';
import FlowComponentBase, { FlowComponentBaseProps } from './FlowComponentBase';
import WrappedText from './WrappedText';

export interface ProcessStepComponentProps extends Omit<FlowComponentBaseProps, 'children'> {}

export default function ProcessStepComponent(props: ProcessStepComponentProps) {
  const { data } = props;
  const { position, size, style, text } = data;

  return (
    <FlowComponentBase {...props}>
      {/* Main rectangle */}
      <rect
        x={position.x}
        y={position.y}
        width={size.width}
        height={size.height}
        fill={style.backgroundColor}
        stroke={style.borderColor}
        strokeWidth={style.borderWidth || 2}
        rx={style.borderRadius || 8}
        ry={style.borderRadius || 8}
        opacity={style.opacity || 1}
        className="transition-colors duration-150"
      />
      
      {/* Text content (wrapped and auto-sized) */}
      <WrappedText
        text={text}
        x={position.x}
        y={position.y}
        width={size.width}
        height={size.height}
        color={style.textColor}
        maxFont={16}
        minFont={9}
        fontWeight={500}
      />
    </FlowComponentBase>
  );
}