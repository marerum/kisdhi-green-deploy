"use client";

import React, { useMemo } from 'react';

interface WrappedTextProps {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  maxFont?: number;
  minFont?: number;
  fontWeight?: number | string;
}

export default function WrappedText({
  text,
  x,
  y,
  width,
  height,
  color = '#fff',
  maxFont = 14,
  minFont = 8,
  fontWeight = '500',
}: WrappedTextProps) {
  const padding = 8; // px inside the box

  // Estimate font size so the text fits into the box by simple heuristic
  const fontSize = useMemo(() => {
    const usableWidth = Math.max(10, width - padding * 2);
    const usableHeight = Math.max(10, height - padding * 2);

    // rough average char width in px at font-size 14 ~= 7
    const approxCharWidth = 7;
    const charsPerLine = Math.max(1, Math.floor(usableWidth / approxCharWidth));
    const estimatedLines = Math.max(1, Math.ceil(text.length / charsPerLine));

    // line height ratio
    const lineHeight = 1.2;

    // compute font size that would fit vertically
    const verticalFit = Math.floor(usableHeight / (estimatedLines * lineHeight));

    const size = Math.max(minFont, Math.min(maxFont, verticalFit));
    return size;
  }, [text, width, height, padding, maxFont, minFont]);

  // position for foreignObject uses the component's x,y
  return (
    <foreignObject x={x} y={y} width={width} height={height} className="pointer-events-none">
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
          padding: `${padding}px`,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            color,
            fontSize: `${fontSize}px`,
            fontWeight,
            lineHeight: 1.2,
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            overflow: 'hidden',
          }}
        >
          {text}
        </div>
      </div>
    </foreignObject>
  );
}
