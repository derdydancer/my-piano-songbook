import { LiftType, WorkoutDefinition, PlateVisualStyle } from '../../types';

export const BAR_WEIGHT = 20; // in kg

export const ALL_LIFTS: LiftType[] = ['Squat', 'Press', 'Deadlift', 'Bench Press'];

export const DEFAULT_PLATE_DENOMINATIONS: number[] = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];

export const WORKOUT_DEFINITIONS: WorkoutDefinition[] = [
  {
    name: "Workout A",
    exercises: [
      { lift: 'Squat', worksetSets: 3, worksetReps: 5 },
      { lift: 'Press', worksetSets: 3, worksetReps: 5 },
      { lift: 'Deadlift', worksetSets: 1, worksetReps: 5 },
    ],
  },
  {
    name: "Workout B",
    exercises: [
      { lift: 'Squat', worksetSets: 3, worksetReps: 5 },
      { lift: 'Bench Press', worksetSets: 3, worksetReps: 5 },
      { lift: 'Deadlift', worksetSets: 1, worksetReps: 5 },
    ],
  },
];

// Smallest increment you can add to the bar (e.g., two 0.5kg plates = 1kg)
export const SMALLEST_BAR_INCREMENT = 1;

// For BarbellVisualizer.tsx
// Adjusted thickness for more uniformity and text legibility.
// All plates will now have a thickness of at least 20.
const MIN_PLATE_THICKNESS = 20;
export const PLATE_VISUAL_STYLES: Record<number, PlateVisualStyle> = {
  25:    { color: '#FF0000', height: 100, thickness: Math.max(MIN_PLATE_THICKNESS, 40) }, // Red
  20:    { color: '#0000FF', height: 95,  thickness: Math.max(MIN_PLATE_THICKNESS, 36) }, // Blue
  15:    { color: '#FFFF00', height: 90,  thickness: Math.max(MIN_PLATE_THICKNESS, 32) }, // Yellow
  10:    { color: '#008000', height: 85,  thickness: Math.max(MIN_PLATE_THICKNESS, 28) }, // Green
  5:     { color: '#FFFFFF', height: 80,  thickness: Math.max(MIN_PLATE_THICKNESS, 24) }, // White (stroke will be needed)
  2.5:   { color: '#333333', height: 75,  thickness: MIN_PLATE_THICKNESS }, // Black/Dark Grey
  1.25:  { color: '#808080', height: 70,  thickness: MIN_PLATE_THICKNESS },  // Grey
  0.5:   { color: '#A9A9A9', height: 65,  thickness: MIN_PLATE_THICKNESS },  // Darker Grey / Silver
};

export const DEFAULT_PLATE_VISUAL_STYLE: PlateVisualStyle = { color: '#CCCCCC', height: 60, thickness: MIN_PLATE_THICKNESS };

export const getPlateVisualStyle = (denomination: number): PlateVisualStyle => {
  return PLATE_VISUAL_STYLES[denomination] || DEFAULT_PLATE_VISUAL_STYLE;
};

export const BAR_VISUAL_COLOR = '#AAAAAA';
export const BAR_SLEEVE_COLOR = '#999999';
export const BAR_TEXT_COLOR = '#000000'; // For text on light plates
export const BAR_TEXT_COLOR_DARK_BG = '#FFFFFF'; // For text on dark plates

// Workout Timer Defaults
export const DEFAULT_TIMER_WARMUP_SECONDS = 90;
export const DEFAULT_TIMER_WORKSET_SECONDS = 180;