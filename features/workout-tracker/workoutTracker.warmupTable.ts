
import { Plate } from '../../types';
import { findClosestLoadableWeight, findNextLoadableWeight, roundToNearestIncrement } from '../../utils/workoutHelper';
import { BAR_WEIGHT as DEFAULT_BAR_WEIGHT_FOR_TABLE_GENERATION, DEFAULT_PLATE_DENOMINATIONS } from './workoutTracker.constants';

export interface WarmupSetDefinition {
  weight: number;
  reps: number;
}

// Default plates for generating the lookup table.
// Using a generous quantity to ensure all denominations are considered available.
const DEFAULT_PLATES_FOR_TABLE_GENERATION: Plate[] = DEFAULT_PLATE_DENOMINATIONS.map(denom => ({ denomination: denom, quantity: 8 }));


// This function is used to generate the WARMUP_LOOKUP_TABLE below.
// It's refined to ensure better progression especially for lighter worksets.
export const generateWarmupTableEntry = (
  worksetKg: number,
  plateInventory: Plate[], // Typically DEFAULT_PLATES_FOR_TABLE_GENERATION for table creation
  barWeight: number      // Typically DEFAULT_BAR_WEIGHT_FOR_TABLE_GENERATION for table creation
): WarmupSetDefinition[] => {
  const warmups: WarmupSetDefinition[] = [];
  const WARMUP_ROUNDING_INCREMENT = 0.5; // Smallest practical jump for warmups

  const loadableBarWeight = findClosestLoadableWeight(barWeight, plateInventory, barWeight);

  // Sets 1 & 2: Bar x 5 reps
  warmups.push({ weight: loadableBarWeight, reps: 5 });
  warmups.push({ weight: loadableBarWeight, reps: 5 });

  let lastLoadedActualWeight = loadableBarWeight;

  const loadedWarmupTargetsConfig = [
    { percent: 0.45, reps: 5, step: 1 }, // Percent of workset weight, reps, conceptual step number
    { percent: 0.65, reps: 3, step: 2 },
    { percent: 0.85, reps: 2, step: 3 },
  ];

  for (const target of loadedWarmupTargetsConfig) {
    let idealWarmupWeight = worksetKg * target.percent;
    let actualWarmupWeight = findClosestLoadableWeight(idealWarmupWeight, plateInventory, barWeight);
    
    actualWarmupWeight = Math.max(actualWarmupWeight, loadableBarWeight);

    // Ensure progression: current warmup must be >= last.
    if (actualWarmupWeight < lastLoadedActualWeight) {
      actualWarmupWeight = lastLoadedActualWeight;
    }
    
    // If it's same as last and not yet at worksetKg, try to find next distinct loadable weight.
    // This is crucial for light worksets to ensure warmups actually step up if possible.
    if (actualWarmupWeight === lastLoadedActualWeight && actualWarmupWeight < worksetKg && actualWarmupWeight >= loadableBarWeight) {
        const nextDistinctUp = findNextLoadableWeight(actualWarmupWeight, 'up', plateInventory, barWeight, WARMUP_ROUNDING_INCREMENT, 20); // Search a bit
        if (nextDistinctUp > actualWarmupWeight) { 
            actualWarmupWeight = nextDistinctUp;
        }
    }
    
    actualWarmupWeight = Math.min(actualWarmupWeight, worksetKg); // Cap at workset weight
    
    // Final loadability check after adjustments
    actualWarmupWeight = findClosestLoadableWeight(actualWarmupWeight, plateInventory, barWeight);

    warmups.push({ weight: actualWarmupWeight, reps: target.reps });
    lastLoadedActualWeight = actualWarmupWeight;
  }
  
  // Final checks to ensure 5 sets and progression for the last few sets.
  if (warmups.length === 5) {
    // Ensure the last warmup is not heavier than the workset.
    if (warmups[4].weight > worksetKg) {
        warmups[4].weight = findClosestLoadableWeight(worksetKg, plateInventory, barWeight);
    }
    // Ensure the last warmup is at least as heavy as the 2nd to last, if conditions allow
    if (warmups[3].weight > loadableBarWeight && warmups[4].weight < warmups[3].weight && warmups[4].weight < worksetKg) {
        warmups[4].weight = warmups[3].weight; 
        warmups[4].weight = findClosestLoadableWeight(warmups[4].weight, plateInventory, barWeight);
        warmups[4].weight = Math.min(warmups[4].weight, worksetKg); 
    }
    // Ensure the 2nd to last warmup is at least as heavy as 3rd to last
    if (warmups[2].weight > loadableBarWeight && warmups[3].weight < warmups[2].weight && warmups[3].weight < worksetKg) {
        warmups[3].weight = warmups[2].weight;
        warmups[3].weight = findClosestLoadableWeight(warmups[3].weight, plateInventory, barWeight);
        warmups[3].weight = Math.min(warmups[3].weight, worksetKg);
        // Re-check last one if 2nd to last changed
        if (warmups[4].weight < warmups[3].weight && warmups[4].weight < worksetKg) {
            warmups[4].weight = warmups[3].weight;
            warmups[4].weight = findClosestLoadableWeight(warmups[4].weight, plateInventory, barWeight);
            warmups[4].weight = Math.min(warmups[4].weight, worksetKg);
        }
    }
  }

  // In case of very light worksets (e.g. 20kg), all warmups might be bar weight.
  // Or if logic above resulted in less than 5 sets for some reason.
  while (warmups.length < 5) {
    warmups.push({ weight: loadableBarWeight, reps: warmups.length < 3 ? 5 : (warmups.length === 3 ? 3 : 2) });
  }

  return warmups.slice(0, 5); // Ensure exactly 5
};


const createSimplifiedWarmupTable = (
  minKg: number,
  maxKg: number,
  plateInventory: Plate[],
  barWeight: number
): Record<number, number[]> => {
  const table: Record<number, number[]> = {};
  for (let kg = minKg; kg <= maxKg; kg++) {
    const fullWarmupDefs = generateWarmupTableEntry(kg, plateInventory, barWeight);
    table[kg] = fullWarmupDefs.map(def => def.weight); // Store only weights
  }
  return table;
};

export const WARMUP_LOOKUP_TABLE_SIMPLIFIED: Record<number, number[]> = createSimplifiedWarmupTable(
  20,
  60,
  DEFAULT_PLATES_FOR_TABLE_GENERATION,
  DEFAULT_BAR_WEIGHT_FOR_TABLE_GENERATION
);

// Log to console for verification during development
// console.log("WARMUP_LOOKUP_TABLE_SIMPLIFIED:", JSON.stringify(WARMUP_LOOKUP_TABLE_SIMPLIFIED, null, 2));

// Quick check for table population integrity
if (Object.keys(WARMUP_LOOKUP_TABLE_SIMPLIFIED).length !== (60 - 20 + 1)) {
    console.warn("WARMUP_LOOKUP_TABLE_SIMPLIFIED is not fully populated for 20-60kg. Expected 41 entries, got " + Object.keys(WARMUP_LOOKUP_TABLE_SIMPLIFIED).length);
}
Object.entries(WARMUP_LOOKUP_TABLE_SIMPLIFIED).forEach(([key, value]) => {
    if (value.length !== 5) {
        console.warn(`Warmup table entry for ${key}kg does not have 5 sets. It has ${value.length}. Weights: ${value.join(', ')}`);
    }
});
