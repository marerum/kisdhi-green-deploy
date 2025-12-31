/**
 * LaneStepTemplate Component
 * Displays the lane (actors) and step template grid for business flow diagrams
 */

'use client';

import React from 'react';

interface Actor {
  name: string;
  role: string;
}

interface Step {
  name: string;
  description: string;
}

interface LaneStepTemplateProps {
  actors: Actor[];
  steps: Step[];
  width: number;
  height: number;
  laneWidth?: number;
  stepHeight?: number;
  headerHeight?: number;
  sidebarWidth?: number;
}

export default function LaneStepTemplate({
  actors,
  steps,
  width,
  height,
  laneWidth = 150,
  stepHeight = 80,
  headerHeight = 60,
  sidebarWidth = 120,
}: LaneStepTemplateProps) {
  console.log('=== LANE STEP TEMPLATE RENDER ===');
  console.log('actors:', actors);
  console.log('steps:', steps);
  console.log('width:', width);
  console.log('height:', height);
  console.log('actors.length:', actors.length);
  console.log('steps.length:', steps.length);
  
  if (!actors.length || !steps.length) {
    console.log('❌ LaneStepTemplate: No actors or steps, returning null');
    return null;
  }

  console.log('✅ LaneStepTemplate: Rendering with', actors.length, 'actors and', steps.length, 'steps');

  const contentWidth = width - sidebarWidth;
  const contentHeight = height - headerHeight;
  const stepWidth = contentWidth / steps.length;
  const actualLaneHeight = contentHeight / actors.length;

  return (
    <g className="lane-step-template">
      {/* Background */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="white"
        stroke="none"
      />

      {/* Step Headers */}
      <g className="step-headers">
        {steps.map((step, index) => (
          <g key={`step-${index}`}>
            {/* Step header background */}
            <rect
              x={sidebarWidth + index * stepWidth}
              y={0}
              width={stepWidth}
              height={headerHeight}
              fill="#f8fafc"
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            
            {/* Step name */}
            <text
              x={sidebarWidth + index * stepWidth + stepWidth / 2}
              y={headerHeight / 2 - 8}
              textAnchor="middle"
              className="text-sm font-semibold fill-gray-800"
              fontSize="14"
            >
              {step.name}
            </text>
            
            {/* Step description (if it fits) */}
            {step.description && step.description.length < 20 && (
              <text
                x={sidebarWidth + index * stepWidth + stepWidth / 2}
                y={headerHeight / 2 + 8}
                textAnchor="middle"
                className="text-xs fill-gray-600"
                fontSize="11"
              >
                {step.description.length > 15 
                  ? step.description.substring(0, 15) + '...' 
                  : step.description}
              </text>
            )}
          </g>
        ))}
      </g>

      {/* Actor Lanes (Sidebar) */}
      <g className="actor-lanes">
        {actors.map((actor, index) => (
          <g key={`actor-${index}`}>
            {/* Lane background */}
            <rect
              x={0}
              y={headerHeight + index * actualLaneHeight}
              width={sidebarWidth}
              height={actualLaneHeight}
              fill="#f1f5f9"
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            
            {/* Actor name */}
            <text
              x={sidebarWidth / 2}
              y={headerHeight + index * actualLaneHeight + actualLaneHeight / 2 - 8}
              textAnchor="middle"
              className="text-sm font-semibold fill-gray-800"
              fontSize="13"
            >
              {actor.name.length > 12 
                ? actor.name.substring(0, 12) + '...' 
                : actor.name}
            </text>
            
            {/* Actor role */}
            <text
              x={sidebarWidth / 2}
              y={headerHeight + index * actualLaneHeight + actualLaneHeight / 2 + 8}
              textAnchor="middle"
              className="text-xs fill-gray-600"
              fontSize="10"
            >
              {actor.role.length > 15 
                ? actor.role.substring(0, 15) + '...' 
                : actor.role}
            </text>
          </g>
        ))}
      </g>

      {/* Grid Lines */}
      <g className="grid-lines" stroke="#e2e8f0" strokeWidth={1}>
        {/* Vertical lines (between steps) */}
        {steps.map((_, index) => (
          <line
            key={`vline-${index}`}
            x1={sidebarWidth + index * stepWidth}
            y1={0}
            x2={sidebarWidth + index * stepWidth}
            y2={height}
          />
        ))}
        
        {/* Final vertical line */}
        <line
          x1={width}
          y1={0}
          x2={width}
          y2={height}
        />

        {/* Horizontal lines (between actors) */}
        {actors.map((_, index) => (
          <line
            key={`hline-${index}`}
            x1={0}
            y1={headerHeight + index * actualLaneHeight}
            x2={width}
            y2={headerHeight + index * actualLaneHeight}
          />
        ))}
        
        {/* Final horizontal line */}
        <line
          x1={0}
          y1={height}
          x2={width}
          y2={height}
        />

        {/* Header separator line */}
        <line
          x1={0}
          y1={headerHeight}
          x2={width}
          y2={headerHeight}
          strokeWidth={2}
        />

        {/* Sidebar separator line */}
        <line
          x1={sidebarWidth}
          y1={0}
          x2={sidebarWidth}
          y2={height}
          strokeWidth={2}
        />
      </g>
    </g>
  );
}

// Utility functions to calculate positions
export const calculateNodePosition = (
  actor: string,
  step: string,
  actors: Actor[],
  steps: Step[],
  canvasWidth: number,
  canvasHeight: number,
  headerHeight: number = 60,
  sidebarWidth: number = 120
) => {
  const actorIndex = actors.findIndex(a => a.name === actor);
  const stepIndex = steps.findIndex(s => s.name === step);
  
  if (actorIndex === -1 || stepIndex === -1) {
    // Fallback to center if actor/step not found
    return {
      x: canvasWidth / 2,
      y: canvasHeight / 2,
    };
  }

  const contentWidth = canvasWidth - sidebarWidth;
  const contentHeight = canvasHeight - headerHeight;
  const stepWidth = contentWidth / steps.length;
  const laneHeight = contentHeight / actors.length;

  return {
    x: sidebarWidth + stepIndex * stepWidth + stepWidth / 2,
    y: headerHeight + actorIndex * laneHeight + laneHeight / 2,
  };
};

export const getLaneStepDimensions = (
  actors: Actor[],
  steps: Step[],
  canvasWidth: number,
  canvasHeight: number,
  headerHeight: number = 60,
  sidebarWidth: number = 120
) => {
  const contentWidth = canvasWidth - sidebarWidth;
  const contentHeight = canvasHeight - headerHeight;
  
  return {
    stepWidth: contentWidth / steps.length,
    laneHeight: contentHeight / actors.length,
    headerHeight,
    sidebarWidth,
    contentWidth,
    contentHeight,
  };
};