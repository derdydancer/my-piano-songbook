
import React from 'react';
import { PlateCombination, PlateCombinationItem } from '../../../types';
import { getPlateVisualStyle, BAR_VISUAL_COLOR, BAR_SLEEVE_COLOR, BAR_TEXT_COLOR, BAR_TEXT_COLOR_DARK_BG } from '../workoutTracker.constants';

interface BarbellVisualizerProps {
  plateCombination: PlateCombination | null | undefined;
  barWeight: number; // kg, typically 20
}

const BarbellVisualizer: React.FC<BarbellVisualizerProps> = ({ plateCombination, barWeight }) => {
  const SVG_VIEWBOX_WIDTH = 300; // Keep internal logic based on fixed viewBox
  const SVG_HEIGHT = 120; 
  const BAR_Y_CENTER = SVG_HEIGHT / 2;
  const BAR_THICKNESS = 10; 
  const SLEEVE_THICKNESS = 16; 
  const BAR_SHAFT_LENGTH_RATIO = 0.3; 
  const COLLAR_THICKNESS = 4;
  const COLLAR_HEIGHT_EXTENSION = 4; 

  const barShaftLength = SVG_VIEWBOX_WIDTH * BAR_SHAFT_LENGTH_RATIO;
  const sleeveLength = (SVG_VIEWBOX_WIDTH - barShaftLength - 2 * COLLAR_THICKNESS) / 2; 

  const barShaftStart = sleeveLength + COLLAR_THICKNESS;
  const barShaftEnd = barShaftStart + barShaftLength;

  const leftSleeveStart = 0;
  const rightSleeveStart = barShaftEnd + COLLAR_THICKNESS;

  const renderPlates = (side: 'left' | 'right', combination: PlateCombination) => {
    const platesElements: JSX.Element[] = [];
    let currentOffsetOnSleeve = 0; 

    const sortedCombination = [...combination].sort((a,b) => {
      return (getPlateVisualStyle(b.denomination)?.height || 0) - (getPlateVisualStyle(a.denomination)?.height || 0);
    });

    for (const item of sortedCombination) {
      const plateStyle = getPlateVisualStyle(item.denomination);
      for (let i = 0; i < item.countPerSide; i++) {
        const plateX = side === 'left'
          ? barShaftStart - COLLAR_THICKNESS - currentOffsetOnSleeve - plateStyle.thickness 
          : rightSleeveStart + currentOffsetOnSleeve; 
        
        platesElements.push(
          <g key={`${side}-plate-${item.denomination}-${i}`}>
            <rect
              x={plateX}
              y={BAR_Y_CENTER - plateStyle.height / 2}
              width={plateStyle.thickness}
              height={plateStyle.height}
              fill={plateStyle.color}
              stroke={plateStyle.color === '#FFFFFF' ? '#DDDDDD' : 'none'} 
              strokeWidth="1"
            />
            <text
              x={plateX + plateStyle.thickness / 2}
              y={BAR_Y_CENTER + 4} 
              fill={plateStyle.color === '#FFFFFF' || plateStyle.color === '#FFFF00' ? BAR_TEXT_COLOR : BAR_TEXT_COLOR_DARK_BG}
              fontSize="10"
              textAnchor="middle"
              fontWeight="bold"
            >
              {item.denomination}
            </text>
          </g>
        );
        currentOffsetOnSleeve += plateStyle.thickness;
      }
    }
    return platesElements;
  };

  const commonBarElements = (
    <>
      {/* Left Sleeve */}
      <rect x={leftSleeveStart} y={BAR_Y_CENTER - SLEEVE_THICKNESS / 2} width={sleeveLength} height={SLEEVE_THICKNESS} fill={BAR_SLEEVE_COLOR} />
      {/* Left Collar */}
       <rect x={leftSleeveStart + sleeveLength} y={BAR_Y_CENTER - (SLEEVE_THICKNESS + COLLAR_HEIGHT_EXTENSION) / 2} width={COLLAR_THICKNESS} height={SLEEVE_THICKNESS + COLLAR_HEIGHT_EXTENSION} fill={BAR_VISUAL_COLOR} />
      {/* Bar Shaft */}
      <rect x={barShaftStart} y={BAR_Y_CENTER - BAR_THICKNESS / 2} width={barShaftLength} height={BAR_THICKNESS} fill={BAR_VISUAL_COLOR} />
       {/* Right Collar */}
      <rect x={barShaftEnd} y={BAR_Y_CENTER - (SLEEVE_THICKNESS + COLLAR_HEIGHT_EXTENSION) / 2} width={COLLAR_THICKNESS} height={SLEEVE_THICKNESS + COLLAR_HEIGHT_EXTENSION} fill={BAR_VISUAL_COLOR} />
      {/* Right Sleeve */}
      <rect x={rightSleeveStart} y={BAR_Y_CENTER - SLEEVE_THICKNESS / 2} width={sleeveLength} height={SLEEVE_THICKNESS} fill={BAR_SLEEVE_COLOR} />
    </>
  );


  if (!plateCombination || plateCombination.length === 0) {
    return (
      <div className="text-center py-2 w-full flex flex-col items-center">
        <svg width="90%" height={SVG_HEIGHT} viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_HEIGHT}`} aria-label={`Empty ${barWeight}kg bar`}>
          {commonBarElements}
        </svg>
        <p className="text-sm text-textPrimary font-semibold mt-1">Empty Bar ({barWeight}kg)</p>
      </div>
    );
  }

  return (
    <div className="text-center py-2 w-full flex flex-col items-center">
      <svg width="90%" height={SVG_HEIGHT} viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_HEIGHT}`} aria-label={`Barbell loaded with plates.`}>
        {commonBarElements}
        {/* Plates */}
        {renderPlates('left', plateCombination)}
        {renderPlates('right', plateCombination)}
      </svg>
    </div>
  );
};

export default BarbellVisualizer;
