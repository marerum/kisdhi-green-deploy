/**
 * StartEndComponent - Circular start/end component
 * Represents start and end points in the flow
 */

'use client';

import React from 'react';
import FlowComponentBase, { FlowComponentBaseProps } from './FlowComponentBase';
import WrappedText from './WrappedText';

export interface StartEndComponentProps extends Omit<FlowComponentBaseProps, 'children'> {}

export default function StartEndComponent(props: StartEndComponentProps) {
  const { data } = props;
  const { position, size, style, text } = data;

  // Calculate circle properties
  const centerX = position.x + size.width / 2;
  const centerY = position.y + size.height / 2;
  const radius = Math.min(size.width, size.height) / 2;

  return (
    <FlowComponentBase {...props}>
      {/* Circle shape */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill={style.backgroundColor}
        stroke={style.borderColor}
        strokeWidth={style.borderWidth || 2}
        opacity={style.opacity || 1}
        className="transition-colors duration-150"
      />
      
      {/* Text content (wrapped inside circle bounding box) */}
      <WrappedText
        text={text}
        x={position.x}
        y={position.y}
        width={size.width}
        height={size.height}
        color={style.textColor}
        maxFont={12}
        minFont={8}
        fontWeight={500}
      />
    </FlowComponentBase>
  );
}