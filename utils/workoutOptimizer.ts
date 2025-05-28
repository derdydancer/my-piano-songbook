
import { Plate, PlateCombination, PlateCombinationItem, LoadableConfiguration, OptimalLoadingResult, SetLoadingDetail, LiftType } from '../types';
import { BAR_WEIGHT } from '../features/workout-tracker/workoutTracker.constants'; // Assuming BAR_WEIGHT is globally relevant for optimizer

// --- Helper Functions ---

/**
 * Creates a string hash for a plate combination for use in DP states.
 * Sorts by denomination to ensure consistent hashing.
 */
const hashPlateCombination = (config: PlateCombination | null): string => {
  if (!config || config.length === 0) return 'empty';
  return config
    .filter(p => p.countPerSide > 0)
    .sort((a, b) => a.denomination - b.denomination) // Sort by denom for consistent hash
    .map(p => `${p.denomination}:${p.countPerSide}`)
    .join(',');
};

/**
 * Calculates the total weight on one side of the bar from a plate combination.
 */
const calculateWeightPerSide = (config: PlateCombination): number => {
  return config.reduce((sum, p) => sum + p.denomination * p.countPerSide, 0);
};

/**
 * Expands a PlateCombination (count per side) into a flat list of denominations for one side,
 * sorted largest to smallest, representing physical stacking from collar outwards.
 */
const expandToSortedDenomList = (config: PlateCombination | null): number[] => {
  if (!config) return [];
  const list: number[] = [];
  config.forEach(item => {
    for (let i = 0; i < item.countPerSide; i++) {
      list.push(item.denomination);
    }
  });
  return list.sort((a, b) => b - a); // Sort largest to smallest (physical stacking)
};


/**
 * Recursive helper to find all plate combinations for a target weight on one side.
 */
function findAllRecursive(
  targetWeightPerSide: number,
  availablePlates: Array<{ denomination: number; quantity: number }>,
  currentIndex: number,
  currentCombination: PlateCombinationItem[],
  solutions: PlateCombination[],
  maxCombinations: number,
  foundHashes: Set<string>
): void {
  if (solutions.length >= maxCombinations) {
    return;
  }

  if (Math.abs(targetWeightPerSide) < 0.001) { // Target is met
    const solutionCopy = [...currentCombination];
    // Sort solution before hashing to ensure consistent hash for same set of plates
    solutionCopy.sort((a,b) => b.denomination - a.denomination);
    const solutionHash = hashPlateCombination(solutionCopy);
    if (!foundHashes.has(solutionHash)) {
      solutions.push(solutionCopy);
      foundHashes.add(solutionHash);
    }
    return;
  }

  if (targetWeightPerSide < -0.001 || currentIndex >= availablePlates.length) {
    return; // Overshot or no more plates
  }

  const currentPlateInfo = availablePlates[currentIndex];
  const maxToUse = Math.min(
    currentPlateInfo.quantity,
    Math.floor(targetWeightPerSide / currentPlateInfo.denomination)
  );
  
  if (maxToUse < 0 && solutions.length < maxCombinations) {
      findAllRecursive(targetWeightPerSide, availablePlates, currentIndex + 1, currentCombination, solutions, maxCombinations, foundHashes);
      return;
  }

  for (let count = maxToUse; count >= 0; count--) {
    if (solutions.length >= maxCombinations) break;

    if (count > 0) {
      currentCombination.push({ denomination: currentPlateInfo.denomination, countPerSide: count });
    }

    const remainingTarget = parseFloat((targetWeightPerSide - count * currentPlateInfo.denomination).toFixed(3));
    findAllRecursive(remainingTarget, availablePlates, currentIndex + 1, currentCombination, solutions, maxCombinations, foundHashes);

    if (count > 0) {
      currentCombination.pop();
    }
  }
}

/**
 * Finds all distinct plate combinations to achieve a target weight on one side of the bar.
 */
export function findAllPlateCombinationsForTarget(
  targetWeightOnBar: number,
  platesOwned: Plate[],
  barWeight: number,
  toleranceKg: number = 0.5, 
  maxCombinations: number = 15 // Increased slightly for more options
): LoadableConfiguration[] {
  const results: LoadableConfiguration[] = [];
  const uniqueTotalWeightConfigs = new Set<string>(); 

  for (let currentTargetBar = Math.max(barWeight, targetWeightOnBar - toleranceKg); currentTargetBar <= targetWeightOnBar + toleranceKg; currentTargetBar += 0.5) {
    if (results.length >= maxCombinations) break;

    const weightNeededFromPlates = parseFloat((currentTargetBar - barWeight).toFixed(3));
    if (weightNeededFromPlates < -0.001) continue;
    if (Math.abs(weightNeededFromPlates) < 0.001) { 
       const configKey = `${currentTargetBar}_empty`;
       if (!uniqueTotalWeightConfigs.has(configKey)) {
          results.push({ plateConfig: [], actualWeight: currentTargetBar });
          uniqueTotalWeightConfigs.add(configKey);
       }
      continue;
    }

    const targetWeightPerSide = parseFloat((weightNeededFromPlates / 2).toFixed(3));
    if (targetWeightPerSide < -0.001) continue;

    const platesForRecursion = platesOwned
      .map(p => ({
        denomination: p.denomination,
        quantity: Math.floor(p.quantity / 2)
      }))
      .filter(p => p.quantity > 0 && p.denomination > 0)
      .sort((a, b) => b.denomination - a.denomination);
    
    if (platesForRecursion.length === 0 && targetWeightPerSide > 0.001) continue;

    const combinationsForSide: PlateCombination[] = [];
    const foundSideHashes = new Set<string>();
    findAllRecursive(targetWeightPerSide, platesForRecursion, 0, [], combinationsForSide, maxCombinations - results.length, foundSideHashes);

    for (const combo of combinationsForSide) {
      if (results.length >= maxCombinations) break;
      const actualLoadedWeightOnBar = barWeight + calculateWeightPerSide(combo) * 2;
      // Sort combo before hashing for consistency
      const sortedComboForHash = [...combo].sort((a,b) => b.denomination - a.denomination);
      const configKey = `${actualLoadedWeightOnBar}_${hashPlateCombination(sortedComboForHash)}`;
      if(!uniqueTotalWeightConfigs.has(configKey)) {
        results.push({ plateConfig: combo, actualWeight: actualLoadedWeightOnBar });
        uniqueTotalWeightConfigs.add(configKey);
      }
    }
  }
  return results.slice(0, maxCombinations);
}


/**
 * Calculates the "effort" to transition between two plate configurations on one side of the bar.
 * Effort = (number of plates removed) + (number of plates added), considering stacking order.
 */
export function calculateTransitionEffort(
  prevConfig: PlateCombination | null,
  currentConfig: PlateCombination
): number {
  const prevPlatesSorted: number[] = expandToSortedDenomList(prevConfig); // e.g. [20, 10, 5]
  const currentPlatesSorted: number[] = expandToSortedDenomList(currentConfig); // e.g. [20, 5]

  let commonPrefixLength = 0;
  while (
    commonPrefixLength < prevPlatesSorted.length &&
    commonPrefixLength < currentPlatesSorted.length &&
    prevPlatesSorted[commonPrefixLength] === currentPlatesSorted[commonPrefixLength]
  ) {
    commonPrefixLength++;
  }

  const platesToRemove = prevPlatesSorted.length - commonPrefixLength;
  const platesToAdd = currentPlatesSorted.length - commonPrefixLength;
  
  return platesToRemove + platesToAdd;
}


/**
 * Finds all valid loading sequences for an exercise, sorted by total effort.
 * Uses Dynamic Programming.
 * @param targetSets Array of objects containing targetWeight for each set.
 * @returns Array of OptimalLoadingResult or null if no solution found.
 */
export function findAllLoadingSequencesForExercise(
  targetSets: Array<{ targetWeight: number, type: 'warmup' | 'workset', reps: number }>,
  platesOwned: Plate[],
  barWeight: number
): OptimalLoadingResult[] | null {
  if (targetSets.length === 0) return null;

  const dp: Array<Map<string, { totalEffort: number, actualWeight: number, prevSetBestConfigHash: string | null, currentSetPlateConfig: PlateCombination }>> = [];

  dp[0] = new Map();
  const firstSetLoadOptions = findAllPlateCombinationsForTarget(targetSets[0].targetWeight, platesOwned, barWeight);
  if (firstSetLoadOptions.length === 0 && targetSets[0].targetWeight > barWeight) {
     const barLoadOptions = findAllPlateCombinationsForTarget(barWeight, platesOwned, barWeight);
     if (barLoadOptions.length > 0) firstSetLoadOptions.push(...barLoadOptions);
     else return null; 
  }

  for (const loadOption of firstSetLoadOptions) {
    const configHash = hashPlateCombination(loadOption.plateConfig);
    const effort = calculateTransitionEffort(null, loadOption.plateConfig); 
    dp[0].set(configHash, {
      totalEffort: effort,
      actualWeight: loadOption.actualWeight,
      prevSetBestConfigHash: null,
      currentSetPlateConfig: loadOption.plateConfig
    });
  }

  if (dp[0].size === 0) return null; 

  for (let i = 1; i < targetSets.length; i++) {
    dp[i] = new Map();
    const currentSetTarget = targetSets[i].targetWeight;
    const currentSetLoadOptions = findAllPlateCombinationsForTarget(currentSetTarget, platesOwned, barWeight);

    if (currentSetLoadOptions.length === 0 && currentSetTarget > barWeight) {
        const barLoadOptionsFallback = findAllPlateCombinationsForTarget(barWeight, platesOwned, barWeight);
        if(barLoadOptionsFallback.length > 0) currentSetLoadOptions.push(...barLoadOptionsFallback);
        else {
             console.warn(`Cannot load set ${i} target ${currentSetTarget}kg, and cannot load bar. Aborting sequence generation.`);
             return null; 
        }
    }
    if (currentSetLoadOptions.length === 0 && currentSetTarget <= barWeight) {
        console.warn(`Cannot load set ${i} target ${currentSetTarget}kg (likely bar or less). Aborting sequence generation.`);
        return null;
    }

    for (const loadOption of currentSetLoadOptions) {
      const currentConfigHash = hashPlateCombination(loadOption.plateConfig);
      let minEffortForThisConfig = Infinity;
      let bestPrevConfigHashForThisPath: string | null = null;

      for (const [prevConfigHash, prevConfigState] of dp[i-1].entries()) {
        const transitionEffort = calculateTransitionEffort(prevConfigState.currentSetPlateConfig, loadOption.plateConfig);
        const newTotalEffort = prevConfigState.totalEffort + transitionEffort;

        if (newTotalEffort < minEffortForThisConfig) {
          minEffortForThisConfig = newTotalEffort;
          bestPrevConfigHashForThisPath = prevConfigHash;
        }
      }

      if (bestPrevConfigHashForThisPath !== null) { 
         const existingEntry = dp[i].get(currentConfigHash);
        if (!existingEntry || minEffortForThisConfig < existingEntry.totalEffort) {
            dp[i].set(currentConfigHash, {
                totalEffort: minEffortForThisConfig,
                actualWeight: loadOption.actualWeight,
                prevSetBestConfigHash: bestPrevConfigHashForThisPath,
                currentSetPlateConfig: loadOption.plateConfig
            });
        }
      }
    }
     if (dp[i].size === 0) {
        console.warn(`No valid loading path found for set ${i+1} (target: ${targetSets[i].targetWeight}kg).`);
        return null; 
    }
  }

  const lastSetIndex = targetSets.length - 1;
  if (!dp[lastSetIndex] || dp[lastSetIndex].size === 0) return null;

  const allFoundSequences: OptimalLoadingResult[] = [];

  for (const [finalConfigHash, finalState] of dp[lastSetIndex].entries()) {
    const sequence: SetLoadingDetail[] = [];
    let currentHashToTrace: string | null = finalConfigHash;
    let currentActualEffortInSequence = finalState.totalEffort; // Store the total effort for this specific sequence

    for (let i = lastSetIndex; i >= 0; i--) {
      const state = dp[i].get(currentHashToTrace!);
      if (!state) throw new Error("DP backtracking error: state not found for hash " + currentHashToTrace);

      const prevSetState = (i > 0 && state.prevSetBestConfigHash) ? dp[i-1].get(state.prevSetBestConfigHash) : null;
      const transitionEffort = calculateTransitionEffort(
        prevSetState ? prevSetState.currentSetPlateConfig : null,
        state.currentSetPlateConfig
      );
      
      sequence.unshift({
        targetWeight: targetSets[i].targetWeight,
        actualWeight: state.actualWeight,
        plateConfig: state.currentSetPlateConfig,
        transitionEffortFromPrevious: transitionEffort,
        setType: targetSets[i].type,
        reps: targetSets[i].reps,
      });
      currentHashToTrace = state.prevSetBestConfigHash;
    }
    allFoundSequences.push({
      totalEffort: currentActualEffortInSequence, // Use the actual total effort for this path
      setLoadings: sequence
    });
  }

  if (allFoundSequences.length === 0) return null;

  // Sort all sequences by total effort
  allFoundSequences.sort((a, b) => a.totalEffort - b.totalEffort);
  
  return allFoundSequences;
}
