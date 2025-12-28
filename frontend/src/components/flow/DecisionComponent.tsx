/**
 * DecisionComponent - Diamond-shaped decision component
 * Represents a decision point or conditional branch in the flow
 */

'use client';

import React from 'react';
import FlowComponentBase, { FlowComponentBaseProps } from './FlowComponentBase';
import WrappedText from './WrappedText';

export interface DecisionComponentProps extends Omit<FlowComponentBaseProps, 'children'> {}

export default function DecisionComponent(props: DecisionComponentProps) {
  const { data } = props;
  const { position, size, style, text } = data;

  // Calculate diamond points
  const centerX = position.x + size.width / 2;
  const centerY = position.y + size.height / 2;
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;

  const points = [
    `${centerX},${position.y}`, // top
    `${position.x + size.width},${centerY}`, // right
    `${centerX},${position.y + size.height}`, // bottom
    `${position.x},${centerY}`, // left
  ].join(' ');

  return (
    <FlowComponentBase {...props}>
      {/* Diamond shape */}
      <polygon
        points={points}
        fill={style.backgroundColor}
        stroke={style.borderColor}
        strokeWidth={style.borderWidth || 2}
        opacity={style.opacity || 1}
        className="transition-colors duration-150"
      />
      
      {/* Text content (wrapped inside diamond bounding box) */}
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