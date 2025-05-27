
import { Plate, PlateCombination, PlateCombinationItem } from '../types';

/**
 * Rounds a weight to the nearest specified increment.
 * @param weight The weight to round.
 * @param increment The increment to round to (e.g., 1 for 1kg, 2.5 for 2.5kg).
 * @returns The rounded weight.
 */
export const roundToNearestIncrement = (weight: number, increment: number): number => {
  return Math.round(weight / increment) * increment;
};

/**
 * Recursive helper to find one plate combination for the target weight per side.
 * @param targetWeight The remaining target weight for one side.
 * @param availablePlates Plates sorted descending, with 'quantity' being per side.
 * @param currentIndex Current index in availablePlates to consider.
 * @param currentCombination Accumulator for the current path of combination.
 * @returns A valid plate combination or null.
 */
function findOnePlateCombinationRecursive(
  targetWeight: number,
  availablePlates: Array<{ denomination: number; quantity: number }>, // quantity is per side
  currentIndex: number,
  currentCombination: PlateCombinationItem[]
): PlateCombination | null {
  // Base cases
  if (Math.abs(targetWeight) < 0.001) { // Target is zero (or very close)
    return [...currentCombination]; // Found a solution
  }
  // If target is negative (overshot) or no more plates to try
  if (targetWeight < -0.001 || currentIndex >= availablePlates.length) { 
    return null;
  }

  const currentPlateInfo = availablePlates[currentIndex];

  // Max number of currentPlateInfo.denomination we can use
  const maxToUse = Math.min(
    currentPlateInfo.quantity, 
    Math.floor(targetWeight / currentPlateInfo.denomination) 
  );
  
  if (maxToUse < 0) { // Cannot use negative plates
      return findOnePlateCombinationRecursive( // Skip this plate
        targetWeight,
        availablePlates,
        currentIndex + 1, 
        currentCombination
      );
  }


  for (let count = maxToUse; count >= 0; count--) {
    if (count > 0) {
      currentCombination.push({ denomination: currentPlateInfo.denomination, countPerSide: count });
    }

    const remainingTarget = parseFloat((targetWeight - count * currentPlateInfo.denomination).toFixed(3));
    
    const result = findOnePlateCombinationRecursive(
      remainingTarget,
      availablePlates,
      currentIndex + 1, 
      currentCombination
    );

    if (result) {
      return result; 
    }

    if (count > 0) {
      currentCombination.pop(); 
    }
  }

  return null; 
}

/**
 * Wrapper function to initialize and call the recursive plate combination finder.
 * @param targetWeightPerSide The target weight for one side of the bar.
 * @param platesOwned The inventory of plates owned by the user (total quantities).
 * @returns A plate combination or null if not possible.
 */
function findOneCombination(
  targetWeightPerSide: number,
  platesOwned: Plate[]
): PlateCombination | null {
  if (targetWeightPerSide < -0.001) return null;
  if (Math.abs(targetWeightPerSide) < 0.001) return []; // No plates needed for this side

  const platesForRecursion = platesOwned
    .map(p => ({
      denomination: p.denomination,
      quantity: Math.floor(p.quantity / 2) 
    }))
    .filter(p => p.quantity > 0 && p.denomination > 0) 
    .sort((a, b) => b.denomination - a.denomination); 

  if (platesForRecursion.length === 0 && targetWeightPerSide > 0.001) {
    return null; 
  }
  
  const result = findOnePlateCombinationRecursive(targetWeightPerSide, platesForRecursion, 0, []);
  return result ? (result.length === 0 && targetWeightPerSide > 0.001 ? null : result) : null;
}


/**
 * Calculates the best plate combination for a target weight on the bar.
 * @param targetWeightOnBar The total target weight on the barbell.
 * @param platesOwned User's plate inventory.
 * @param barWeight The weight of the empty barbell.
 * @param previousCombination Optional. (Currently not used for optimization).
 * @returns The calculated plate combination or null if not possible.
 */
export const calculateBestPlateCombination = (
  targetWeightOnBar: number,
  platesOwned: Plate[],
  barWeight: number,
  previousCombination?: PlateCombination 
): PlateCombination | null => {
  const weightNeededFromPlates = parseFloat((targetWeightOnBar - barWeight).toFixed(3));

  if (weightNeededFromPlates < -0.001) return null; 
  if (Math.abs(weightNeededFromPlates) < 0.001) return []; 

  const targetWeightPerSide = parseFloat((weightNeededFromPlates / 2).toFixed(3));
  
  if (targetWeightPerSide < -0.001) return null; 

  return findOneCombination(targetWeightPerSide, platesOwned);
};

// Helper function for loadability checks
const checkLoadability = (weight: number, plates: Plate[], bar: number): PlateCombination | null => {
  if (weight < bar && Math.abs(weight - bar) > 0.001) return null; // Cannot be lighter than the bar
  const result = calculateBestPlateCombination(weight, plates, bar);
  return result;
};

/**
 * Finds the closest loadable weight to an ideal target weight.
 * @param idealTargetWeightInput The desired target weight.
 * @param platesOwned User's plate inventory.
 * @param barWeight Weight of the empty bar.
 * @param maxSearchDeviationKg How far (in kg) up and down to search from the ideal target. Default 10kg.
 * @param searchStepKg The step (in kg) for total bar weight during the search. Default 0.5kg (smallest practical plate).
 * @returns The closest loadable weight. Falls back to barWeight or idealTargetWeightInput if no other is found.
 */
export const findClosestLoadableWeight = (
  idealTargetWeightInput: number,
  platesOwned: Plate[],
  barWeight: number,
  maxSearchDeviationKg: number = 10, 
  searchStepKg: number = 0.5 
): number => {
  let idealTargetWeight = Math.max(parseFloat(idealTargetWeightInput.toFixed(3)), barWeight);

  if (checkLoadability(idealTargetWeight, platesOwned, barWeight) !== null) {
    return idealTargetWeight;
  }

  let lowerFoundWeight: number | null = null;
  let upperFoundWeight: number | null = null;

  // Search Down
  for (let offset = searchStepKg; offset <= maxSearchDeviationKg; offset += searchStepKg) {
    const probedWeight = idealTargetWeight - offset;
    // Round the probed weight to the nearest practical increment (searchStepKg, e.g., 0.5kg)
    const currentWeight = roundToNearestIncrement(probedWeight, searchStepKg); 
    
    if (currentWeight < barWeight && Math.abs(currentWeight - barWeight) > 0.001) {
      if (checkLoadability(barWeight, platesOwned, barWeight) !== null) {
        lowerFoundWeight = barWeight; 
      }
      break; 
    }
    if (Math.abs(currentWeight - barWeight) < 0.001) { 
        if (checkLoadability(barWeight, platesOwned, barWeight) !== null) {
            lowerFoundWeight = barWeight;
        }
        break;
    }

    if (checkLoadability(currentWeight, platesOwned, barWeight) !== null) {
      lowerFoundWeight = currentWeight;
      break;
    }
  }
  
  // Search Up
  for (let offset = searchStepKg; offset <= maxSearchDeviationKg; offset += searchStepKg) {
    const probedWeight = idealTargetWeight + offset;
    const currentWeight = roundToNearestIncrement(probedWeight, searchStepKg);

    if (checkLoadability(currentWeight, platesOwned, barWeight) !== null) {
      upperFoundWeight = currentWeight;
      break;
    }
  }

  if (lowerFoundWeight !== null && upperFoundWeight !== null) {
    const diffLower = Math.abs(idealTargetWeight - lowerFoundWeight);
    const diffUpper = Math.abs(upperFoundWeight - idealTargetWeight);
    if (diffLower <= diffUpper) { 
      return lowerFoundWeight;
    } else {
      return upperFoundWeight;
    }
  } else if (lowerFoundWeight !== null) {
    return lowerFoundWeight;
  } else if (upperFoundWeight !== null) {
    return upperFoundWeight;
  }
  
  // Fallback logic:
  // If loops found nothing, re-check idealTargetWeight (might have been missed if not a multiple of searchStepKg from a base)
  // This check might be redundant if the first check `checkLoadability(idealTargetWeight, ...)` was for the original ideal.
  // However, idealTargetWeight here is Math.max(parseFloat(idealTargetWeightInput.toFixed(3)), barWeight);
  // Let's ensure we check the original input if it's different and potentially loadable.
  if (checkLoadability(idealTargetWeight, platesOwned, barWeight) !== null) {
      return idealTargetWeight;
  }
  // If idealTargetInput was different and is loadable, consider it.
  if (Math.abs(idealTargetWeightInput - idealTargetWeight) > 0.001 && 
      idealTargetWeightInput >= barWeight && // only if it's a valid weight
      checkLoadability(idealTargetWeightInput, platesOwned, barWeight) !== null) {
      return idealTargetWeightInput;
  }

  // Last resort: check barWeight itself
  if (checkLoadability(barWeight, platesOwned, barWeight) !== null) {
      return barWeight;
  }
  
  // Absolute fallback: original input, this might not be loadable but it's what was requested.
  // This indicates an issue if bar isn't loadable or inventory is problematic.
  return idealTargetWeightInput; 
};


/**
 * Finds the next loadable weight in a specific direction (up or down).
 * @param currentWeight The starting weight.
 * @param direction 'up' to find the next heavier, 'down' to find the next lighter.
 * @param platesOwned User's plate inventory.
 * @param barWeight Weight of the empty bar.
 * @param stepKg The increment to search by (e.g., 0.5kg for smallest plate pair).
 * @param maxSearchSteps Maximum number of steps to search.
 * @returns The next loadable weight in the given direction, or currentWeight if none found.
 */
export const findNextLoadableWeight = (
  currentWeight: number,
  direction: 'up' | 'down',
  platesOwned: Plate[],
  barWeight: number,
  stepKg: number = 0.5, 
  maxSearchSteps: number = 40 
): number => {
  let initialTestWeight = parseFloat(currentWeight.toFixed(3));
  
  // First, check if currentWeight itself is loadable.
  // If not, find the closest loadable to currentWeight to start the search from a valid point.
  const actualStartWeight = findClosestLoadableWeight(initialTestWeight, platesOwned, barWeight, 5, stepKg);

  // If searching down and actualStartWeight is already at or below barWeight, handle appropriately.
  if (direction === 'down' && actualStartWeight <= barWeight) {
      if (checkLoadability(barWeight, platesOwned, barWeight) !== null) {
          return barWeight; // Can't go lower than bar, return bar if loadable
      }
      return actualStartWeight; // Or return actualStartWeight if bar itself is not loadable (edge case)
  }


  for (let i = 1; i <= maxSearchSteps; i++) { // Start from step 1
    let testWeight;
    if (direction === 'up') {
      testWeight = parseFloat((actualStartWeight + i * stepKg).toFixed(3));
    } else { // 'down'
      testWeight = parseFloat((actualStartWeight - i * stepKg).toFixed(3));
      if (testWeight < barWeight && Math.abs(testWeight - barWeight) > 0.001) {
        if (checkLoadability(barWeight, platesOwned, barWeight) !== null) {
          return barWeight; // Found bar weight as the next loadable down
        }
        return actualStartWeight; // Cannot go below bar, or bar not loadable, return the starting point
      }
      if (Math.abs(testWeight - barWeight) < 0.001) { 
         if (checkLoadability(barWeight, platesOwned, barWeight) !== null) {
          return barWeight;
        }
        return actualStartWeight; 
      }
    }

    if (checkLoadability(testWeight, platesOwned, barWeight) !== null) {
      // Ensure it's actually different from actualStartWeight if actualStartWeight was already loadable
      if (Math.abs(testWeight - actualStartWeight) > 0.001) {
          return testWeight; 
      }
      // If testWeight is the same as actualStartWeight, continue searching for the *next different* one
    }
  }
  // If no *new* loadable weight found, return the (closest loadable to) original currentWeight
  return actualStartWeight; 
};


// Helper function to format plate combination for display
export const formatPlateCombination = (combination: PlateCombination | undefined | null): string => {
  if (!combination || combination.length === 0) return "Empty Bar";
  return combination
    .filter(p => p.countPerSide > 0) 
    .sort((a,b) => b.denomination - a.denomination) 
    .map(p => `${p.countPerSide}x${p.denomination}kg`)
    .join(' + ') + " per side";
};

