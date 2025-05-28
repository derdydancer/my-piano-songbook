
# Bar Loading and Plate Combination Logic

This document details the current system for determining how to load a barbell for a target weight and outlines requirements for improving this logic to minimize plate changes between sets within an exercise.

## 1. Current Bar Loading Logic

The current system uses several functions to calculate plate combinations for a given target weight. The primary goal is to find *any* valid combination using the heaviest available plates first, ensuring the loaded weight is as close as possible to the target if the exact target isn't loadable.

### Core Functions:

1.  **`calculateBestPlateCombination(targetWeightOnBar, platesOwned, barWeight)`**
    *   **Purpose:** Determines the plate combination for one side of the barbell to achieve the `targetWeightOnBar`.
    *   **Logic:**
        1.  Calculates `weightNeededFromPlates = targetWeightOnBar - barWeight`.
        2.  If `weightNeededFromPlates` is negative, returns `null` (cannot load less than bar weight). If zero, returns an empty array (empty bar).
        3.  Calculates `targetWeightPerSide = weightNeededFromPlates / 2`.
        4.  Calls `findOneCombination(targetWeightPerSide, platesOwned)` to get the plates for one side.

2.  **`findOneCombination(targetWeightPerSide, platesOwned)`**
    *   **Purpose:** A wrapper that prepares data for and calls the recursive combination finder.
    *   **Logic:**
        1.  Filters `platesOwned` to include only those with `quantity >= 2` (for symmetrical loading) and `denomination > 0`.
        2.  Maps these plates to `platesForRecursion`, where `quantity` is `Math.floor(p.quantity / 2)` (i.e., available count per side).
        3.  Sorts `platesForRecursion` by denomination in descending order (heaviest plates first).
        4.  Calls `findOnePlateCombinationRecursive(targetWeightPerSide, platesForRecursion, 0, [])`.

3.  **`findOnePlateCombinationRecursive(targetWeight, availablePlates, currentIndex, currentCombination)`**
    *   **Purpose:** Recursively finds a combination of plates to make up the `targetWeight` for one side of the bar.
    *   **Strategy:** Backtracking search.
        *   **Base Cases:**
            *   If `targetWeight` is (close to) `0`, a solution is found (`currentCombination`).
            *   If `targetWeight` is negative (overshot) or `currentIndex` is out of bounds (no more plate types to try), this path is invalid (`null`).
        *   **Recursive Step:**
            1.  Considers the plate at `availablePlates[currentIndex]`.
            2.  Calculates `maxToUse`: the maximum number of this plate denomination that can be used without exceeding `targetWeight` or the `availablePlates[currentIndex].quantity`.
            3.  Iterates from `count = maxToUse` down to `0`:
                *   Adds `count` of the current plate to `currentCombination`.
                *   Recursively calls itself with `targetWeight - (count * denomination)` and `currentIndex + 1` (to consider the next smaller plate type).
                *   If the recursive call returns a valid combination, that solution is propagated up.
                *   If not, backtracks by removing the `count` of the current plate from `currentCombination` and tries a smaller `count`.
    *   **Outcome:** This function aims to find *any* valid combination. Because it tries to use the maximum possible count of the current (heaviest available) plate first, it tends to find combinations that use fewer total plates by prioritizing heavier denominations.

### Helper and Utility Functions:

4.  **`checkLoadability(weight, plates, bar)`**
    *   Simply calls `calculateBestPlateCombination(weight, plates, bar)` and returns `true` if a non-null combination is found, `false` otherwise.

5.  **`roundToNearestIncrement(weight, increment)`**
    *   A standard utility function to round a given `weight` to the nearest specified `increment` (e.g., rounding 42kg to the nearest 2.5kg increment would yield 42.5kg).

6.  **`findClosestLoadableWeight(idealTargetWeight, platesOwned, barWeight, maxSearchDeviationKg = 10, searchStepKg = 0.5)`**
    *   **Purpose:** Finds a loadable weight that is as close as possible to the `idealTargetWeight`.
    *   **Logic:**
        1.  Ensures `idealTargetWeight` is at least `barWeight`.
        2.  First, checks if the (adjusted) `idealTargetWeight` itself is loadable using `checkLoadability`.
        3.  If not, it searches in both downward and upward directions from `idealTargetWeight`:
            *   It iterates by `searchStepKg` (e.g., 0.5kg) up to `maxSearchDeviationKg`.
            *   Each `probedWeight` is rounded to the `searchStepKg` increment.
            *   `checkLoadability` is called for this rounded `currentWeight`.
            *   The first loadable weight found in each direction (`lowerFoundWeight`, `upperFoundWeight`) is recorded.
        4.  Compares `lowerFoundWeight` and `upperFoundWeight` to `idealTargetWeight` and returns the one that is closer.
        5.  Includes fallbacks if only one direction yields a result, or if the `barWeight` itself is the closest loadable option. The absolute fallback is the original `idealTargetWeightInput`.

7.  **`findNextLoadableWeight(currentWeight, direction, platesOwned, barWeight, stepKg = 0.5, maxSearchSteps = 40)`**
    *   **Purpose:** Finds the next loadable weight strictly greater than (`direction = 'up'`) or less than (`direction = 'down'`) the `currentWeight`.
    *   **Logic:**
        1.  Determines `actualStartWeight` by finding the closest loadable weight to `currentWeight` (this ensures the search starts from a valid, loadable point).
        2.  Iteratively adjusts `actualStartWeight` by `stepKg` in the specified `direction` for a maximum of `maxSearchSteps`.
        3.  For each `testWeight`, it calls `checkLoadability`.
        4.  Returns the first `testWeight` that is loadable AND different from `actualStartWeight`.
        5.  Handles edge cases, such as not going below `barWeight` when searching down.
        6.  If no *new* loadable weight is found within the search range, it returns `actualStartWeight`.

### Shortcomings for Set-to-Set Optimization:

*   **Independence of Sets:** The current logic calculates the plate combination for each set's target weight in isolation. `calculateBestPlateCombination` doesn't know what was on the bar for the previous set or what will be needed for the next.
*   **No "Effort" Metric:** The system doesn't quantify the "effort" of changing plates (e.g., number of plates moved, weight moved).
*   **Single "Best" Combination Per Weight:** While `findOnePlateCombinationRecursive` prioritizes heavier plates (leading to fewer plates overall), it doesn't explore alternative ways to load the same weight that might be more advantageous for transitioning to the next set.

## 2. Requirements for Optimizing Plate Changes Across Sets

The goal is to evolve the bar loading logic to minimize the manual effort of changing plates between consecutive sets within a single exercise (e.g., Squat warmups leading into Squat worksets).

### Objective:

For a given exercise (defined by a sequence of target weights for its sets), determine a sequence of plate configurations (one for each set) such that:
1.  Each set is loaded as close as possible to its target weight.
2.  The total "effort" of changing plates between all consecutive sets in the exercise is minimized.

### Definition of "Effort" (to be refined):

The "effort" of transitioning from the plate configuration of set `N-1` to set `N` could be defined by one or more of the following, or a weighted combination:
*   **Total Plates Moved:** The sum of (number of plates added + number of plates removed).
*   **Total Weight Moved:** The sum of (total denomination of plates added + total denomination of plates removed).
*   **Number of Denominations Handled:** Minimize the variety of plate denominations that need to be touched during a transition.
*   **Prioritizing "Adding Only" or "Removing Only":** Transitions that only involve adding plates might be considered less effort than those requiring removals, or vice-versa depending on workflow.
*   **A simple starting point:** `Effort = (count of plates added) + (count of plates removed)`.

### Inputs for Optimized Logic (per exercise):

1.  **Sequence of Target Set Weights:** An array of target weights, e.g., `[20, 20, 40, 60, 80, 100, 100, 100]` for an exercise.
2.  **User's Plate Inventory (`platesOwned`):** The available plates and their quantities.
3.  **Bar Weight.**

### Outputs of Optimized Logic (per exercise):

1.  **Sequence of Plate Configurations:** An array of `PlateCombination` objects, one for each set in the input sequence.
2.  **Sequence of Actual LoadedWeights:** An array of the actual weights loaded for each set, which might deviate slightly from the target weights if such deviation allows for significantly lower plate change effort.

### Constraints:

1.  **Loadability:** The actual loaded weight for each set must be achievable using the `platesOwned` and `barWeight`.
2.  **Target Adherence:** The actual loaded weight for each set should be as close as possible to its target weight. A maximum allowable deviation (e.g., +/- 1kg, or +/- 2.5% of target) might need to be defined if perfect target adherence conflicts with optimal plate changes.
3.  **Bar is Constant:** The barbell itself is always part of the total weight.
4.  **Symmetry:** Plates are added/removed symmetrically on both sides of the bar. The `PlateCombination` type already reflects "countPerSide".

### Key Challenges:

1.  **Lookahead/Lookbehind:** The optimal plate configuration for set `N` is dependent on the configuration of set `N-1` and influences the best configuration for set `N+1`. This suggests a need for an algorithm that considers the entire sequence of sets.
2.  **Multiple Valid Combinations for a Single Weight:** A target weight can often be achieved with several different plate combinations (e.g., 20kg added to each side could be 1x20kg, or 2x10kg, or 4x5kg, etc.). The choice made for set `N` impacts the transition "effort" to set `N+1`.
3.  **State Space Size:** The number of possible sequences of plate configurations for an entire exercise can be very large, making brute-force search infeasible.
4.  **Defining "Optimal":** The precise definition of "minimal effort" and the acceptable trade-off between hitting exact target weights versus reducing plate changes need to be clear.

### Potential Algorithmic Approaches (High-Level):

1.  **Dynamic Programming:**
    *   **Subproblem:** Find the minimum effort to load sets `1` through `k`, ending with a specific plate configuration `C_k` on the bar for set `k`.
    *   **State:** `dp[k][config_hash]` = minimum effort to complete set `k` ending in `config_hash`. The `config_hash` needs to uniquely represent a plate configuration.
    *   **Recurrence:** To calculate `dp[k][config_k]`, iterate over all possible previous configurations `config_{k-1}` for set `k-1`. The effort would be `dp[k-1][config_{k-1}] + effort_to_change(config_{k-1}, config_k)`.
    *   This requires generating all valid (or near-target) loadable configurations for each set's target weight.

2.  **Graph Search Algorithms (e.g., A*, Dijkstra's):**
    *   **Nodes:** A node could represent `(set_index, current_bar_configuration)`.
    *   **Edges:** An edge from `(k-1, config_A)` to `(k, config_B)` exists if `config_B` is a valid loading for set `k`. The weight of the edge is the "effort" to change plates from `config_A` to `config_B`.
    *   **Goal:** Find the shortest path from a starting state (e.g., set 0, empty bar) to any state at the final set_index.
    *   A* would require a heuristic for the remaining effort. Dijkstra's would find the optimal path based on accumulated effort.

3.  **Greedy Heuristics (Potentially Sub-Optimal):**
    *   For each set `N`, starting from set 1:
        *   Consider the plate configuration of set `N-1`.
        *   Generate possible valid loadable configurations for set `N`'s target weight.
        *   Choose the configuration for set `N` that requires the minimum "effort" to transition from set `N-1`.
    *   This approach is simpler but may not find the globally optimal solution as it makes locally optimal choices.

### Considerations for Actual Loadable Weight & Warmups:

*   If the optimization algorithm suggests a slight deviation from a set's target weight to reduce plate changes, this deviation must be within acceptable bounds.
*   Warmup set target weights are often derived as percentages of the workset weight or specific increments. The optimization should aim to hit these warmup targets as closely as possible, as they are critical for proper preparation. The `generateSetsForExercise` logic already rounds warmups and makes them loadable; an optimized system would need to integrate this or a similar concept.

This documentation provides a foundation for understanding the current system and the complexities involved in developing a more sophisticated bar loading strategy focused on minimizing user effort during a workout.
