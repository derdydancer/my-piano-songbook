
import { AppData, Plate, ExerciseSettings, WorkoutSession, LiftType, ExerciseSetting, WorkoutDefinition, WorkoutExerciseDefinition, PlateCombination, SetDetails, ExerciseLog } from '../../types';
import { BAR_WEIGHT, ALL_LIFTS, DEFAULT_PLATE_DENOMINATIONS, WORKOUT_DEFINITIONS } from './workoutTracker.constants';
import { calculateBestPlateCombination, findClosestLoadableWeight, roundToNearestIncrement } from '../../utils/workoutHelper'; // Keep helpers in utils

export const getDefaultPlateInventory = (): Plate[] => {
  return DEFAULT_PLATE_DENOMINATIONS.map(d => ({ denomination: d, quantity: 2 }));
};

export const getDefaultExerciseSettings = (): ExerciseSettings => {
  const settings: Partial<ExerciseSettings> = {};
  ALL_LIFTS.forEach(lift => {
    settings[lift] = {
      lastAchievedWorksetWeight: BAR_WEIGHT,
      progressionIncrement: 2.5, // Default, can be lift-specific
      defaultTimerWarmup: 90,
      defaultTimerWorkset: 180,
    };
  });
  // Specific default increments
  if (settings['Press']) settings['Press']!.progressionIncrement = 1.0;
  if (settings['Deadlift']) settings['Deadlift']!.progressionIncrement = 5.0;

  return settings as ExerciseSettings;
};


export const initialWorkoutTrackerData = {
  plateInventory: getDefaultPlateInventory() as Plate[],
  exerciseSettings: getDefaultExerciseSettings() as ExerciseSettings,
  workoutSessions: [] as WorkoutSession[],
};

export type WorkoutTrackerActions = ReturnType<typeof createWorkoutTrackerActions>;

export const createWorkoutTrackerActions = (
  setAppData: React.Dispatch<React.SetStateAction<AppData>>,
  getAppData: () => AppData
) => ({
  // Workout Tracker Methods
  updatePlateInventory: (updatedInventory: Plate[]) => {
    setAppData(prev => ({ ...prev, plateInventory: updatedInventory.sort((a,b) => b.denomination - a.denomination) }));
  },
  updateExerciseSetting: (lift: LiftType, setting: Partial<ExerciseSetting>) => {
    setAppData(prev => ({
      ...prev,
      exerciseSettings: {
        ...prev.exerciseSettings,
        [lift]: { ...(prev.exerciseSettings[lift] || getDefaultExerciseSettings()[lift]), ...setting },
      },
    }));
  },
  addWorkoutSession: (session: WorkoutSession) => {
    setAppData(prevAppData => {
      const newSessions = [...prevAppData.workoutSessions, session].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const updatedSettings = {...prevAppData.exerciseSettings};
      let settingsChanged = false;

      session.exercises.forEach(exLog => {
        const allWorksetsPassed = exLog.sets
          .filter(s => s.type === 'workset')
          .every(s => s.status === 'completed');
        
        if (allWorksetsPassed && exLog.worksetWeight > (updatedSettings[exLog.lift]?.lastAchievedWorksetWeight || 0) ) {
          updatedSettings[exLog.lift] = {
            ...(updatedSettings[exLog.lift] || getDefaultExerciseSettings()[exLog.lift]),
            lastAchievedWorksetWeight: exLog.worksetWeight
          };
          settingsChanged = true;
        }
      });
      if (settingsChanged) {
        return { ...prevAppData, workoutSessions: newSessions, exerciseSettings: updatedSettings };
      }
      return { ...prevAppData, workoutSessions: newSessions};
    });
  },
  getLastWorkoutSession: (workoutDefinitionName?: string): WorkoutSession | undefined => {
    const appData = getAppData();
    const sortedSessions = [...appData.workoutSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (workoutDefinitionName) {
      return sortedSessions.find(s => s.workoutDefinitionName === workoutDefinitionName);
    }
    return sortedSessions[0]; 
  },
  getAllWorkoutSessions: (): WorkoutSession[] => {
    const appData = getAppData();
    return [...appData.workoutSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
  getProposedWorksetWeight: (lift: LiftType): number => {
    const appData = getAppData();
    const liftSetting = appData.exerciseSettings[lift] || getDefaultExerciseSettings()[lift];
    const allSessions = [...appData.workoutSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const liftHistory: Array<{ sessionDate: string, worksetWeight: number, allWorksetsCompleted: boolean }> = [];

    for (const session of allSessions) {
      const exerciseLogForLift = session.exercises.find(ex => ex.lift === lift);
      if (exerciseLogForLift) {
        const worksets = exerciseLogForLift.sets.filter(s => s.type === 'workset');
        if (worksets.length > 0) {
          const allWorksetsCompleted = worksets.every(s => s.status === 'completed');
          liftHistory.push({
            sessionDate: session.date,
            worksetWeight: exerciseLogForLift.worksetWeight,
            allWorksetsCompleted,
          });
        }
      }
    }

    let idealTargetWeight: number;

    if (liftHistory.length === 0) {
      // First time doing this lift
      idealTargetWeight = BAR_WEIGHT + (liftSetting.progressionIncrement > 0 ? liftSetting.progressionIncrement : 0);
       // If progression is 0, start with bar. Otherwise, Bar + increment.
       // Or just BAR_WEIGHT if it's the absolute first workout and progressionIncrement is 0.
       if (liftSetting.progressionIncrement === 0 && liftSetting.lastAchievedWorksetWeight === BAR_WEIGHT){
            idealTargetWeight = BAR_WEIGHT;
       } else if (liftSetting.lastAchievedWorksetWeight > BAR_WEIGHT) { // handles if manually set higher
            idealTargetWeight = liftSetting.lastAchievedWorksetWeight + liftSetting.progressionIncrement;
       } else if (liftSetting.progressionIncrement > 0) {
            idealTargetWeight = BAR_WEIGHT + liftSetting.progressionIncrement;
       } else {
            idealTargetWeight = BAR_WEIGHT;
       }


    } else {
      const lastPerformance = liftHistory[0]; // Most recent performance of this lift
      if (lastPerformance.allWorksetsCompleted) {
        idealTargetWeight = lastPerformance.worksetWeight + liftSetting.progressionIncrement;
      } else {
        // Failed or skipped some worksets last time
        idealTargetWeight = lastPerformance.worksetWeight;
      }
    }
    
    // Ensure target is not less than bar weight
    idealTargetWeight = Math.max(idealTargetWeight, BAR_WEIGHT);

    return findClosestLoadableWeight(idealTargetWeight, appData.plateInventory, BAR_WEIGHT);
  },
  generateSetsForExercise: (
    exerciseDef: WorkoutExerciseDefinition, 
    proposedWorksetWeight: number,
    previousPlateConfig?: PlateCombination
  ): { exerciseLog: ExerciseLog, nextPlateConfig?: PlateCombination} => {
    const appData = getAppData();
    const sets: SetDetails[] = [];
    let runningPlateConfig = previousPlateConfig;
    const WARMUP_ROUNDING_INCREMENT = 5; 

    const calculateRoundedWarmupTarget = (percentage: number, baseWeight: number): number => {
      const percentWeight = baseWeight * percentage;
      // Round to nearest 2.5kg, then ensure it's at least BAR_WEIGHT
      const roundedUpWeight = roundToNearestIncrement(percentWeight, WARMUP_ROUNDING_INCREMENT); // Now uses a general util
      return Math.max(BAR_WEIGHT, roundedUpWeight);
    };

    // Two sets with the empty bar
    [1,2].forEach(i => {
        const actualWeight = findClosestLoadableWeight(BAR_WEIGHT, appData.plateInventory, BAR_WEIGHT);
        const plateConfig = calculateBestPlateCombination(actualWeight, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
        sets.push({
            id: `${exerciseDef.lift}-warmup-bar-${i}-${Date.now()}${Math.random().toString(36).substring(2,9)}`,
            type: 'warmup',
            targetWeight: BAR_WEIGHT, 
            actualWeight: actualWeight,
            targetReps: 5,
            status: 'pending',
            plateConfiguration: plateConfig ?? undefined,
        });
        if (plateConfig) runningPlateConfig = plateConfig;
    });

    // Determine if we need the special "beginner" warmup ramp (target < 25kg for 40% implies low workset weight)
    const target40pctInitial = proposedWorksetWeight * 0.4;

    if (target40pctInitial < 25 && proposedWorksetWeight <= 45) { // Threshold for "very light" worksets
        // Simplified ramp for very light weights, might skip loaded warmups or do fewer
        const lightWarmupTarget = Math.max(BAR_WEIGHT, findClosestLoadableWeight(BAR_WEIGHT + 5, appData.plateInventory, BAR_WEIGHT)); // e.g. Bar + smallest pair
        if (lightWarmupTarget > BAR_WEIGHT && lightWarmupTarget < proposedWorksetWeight) {
           const plateConfig = calculateBestPlateCombination(lightWarmupTarget, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
            sets.push({
                id: `${exerciseDef.lift}-warmup-light-${Date.now()}${Math.random().toString(36).substring(2,9)}`,
                type: 'warmup', targetWeight: lightWarmupTarget, actualWeight: lightWarmupTarget, targetReps: 5, status: 'pending', plateConfiguration: plateConfig ?? undefined,
            });
            if (plateConfig) runningPlateConfig = plateConfig;
        }

        const midWarmupTarget = Math.max(BAR_WEIGHT, findClosestLoadableWeight(proposedWorksetWeight * 0.7, appData.plateInventory, BAR_WEIGHT));
         if (midWarmupTarget > BAR_WEIGHT && midWarmupTarget < proposedWorksetWeight && midWarmupTarget !== lightWarmupTarget) {
           const plateConfig = calculateBestPlateCombination(midWarmupTarget, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
            sets.push({
                id: `${exerciseDef.lift}-warmup-mid-${Date.now()}${Math.random().toString(36).substring(2,9)}`,
                type: 'warmup', targetWeight: midWarmupTarget, actualWeight: midWarmupTarget, targetReps: 3, status: 'pending', plateConfiguration: plateConfig ?? undefined,
            });
            if (plateConfig) runningPlateConfig = plateConfig;
        }


    } else { // Standard warmup percentages
        const warmupTargetsPercents = [0.4, 0.6, 0.8];
        const warmupReps = [5, 3, 2];
        const idSuffixes = ['40pct', '60pct', '80pct'];

        warmupTargetsPercents.forEach((percent, index) => {
            const targetWeight = calculateRoundedWarmupTarget(percent, proposedWorksetWeight);
            if (targetWeight >= proposedWorksetWeight && percent < 0.8) return; // Skip warmup heavier than or equal to workset unless it's the last one

            const actualWeight = findClosestLoadableWeight(targetWeight, appData.plateInventory, BAR_WEIGHT);
            // Only add warmup if it's distinct from previous and lighter than workset (unless it's the 80% set)
            const lastWarmupWeight = sets.length > 0 ? sets[sets.length-1].actualWeight : 0;
            if (actualWeight > lastWarmupWeight && (actualWeight < proposedWorksetWeight || percent === 0.8)) {
                const plateConfig = calculateBestPlateCombination(actualWeight, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
                sets.push({
                    id: `${exerciseDef.lift}-warmup-std-${idSuffixes[index]}-${Date.now()}${Math.random().toString(36).substring(2,9)}`,
                    type: 'warmup',
                    targetWeight: targetWeight, 
                    actualWeight: actualWeight,
                    targetReps: warmupReps[index],
                    status: 'pending',
                    plateConfiguration: plateConfig ?? undefined,
                });
                if (plateConfig) runningPlateConfig = plateConfig;
            }
        });
    }
    
    // Worksets
    const actualLoadableWorksetWeight = findClosestLoadableWeight(proposedWorksetWeight, appData.plateInventory, BAR_WEIGHT); 
    for (let i = 0; i < exerciseDef.worksetSets; i++) {
      const plateConfig = calculateBestPlateCombination(actualLoadableWorksetWeight, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
      sets.push({
        id: `${exerciseDef.lift}-workset-${i}-${Date.now()}${Math.random().toString(36).substring(2,9)}`,
        type: 'workset',
        targetWeight: proposedWorksetWeight, // Store the ideal target for progression logic
        actualWeight: actualLoadableWorksetWeight, // Store what's actually loaded
        targetReps: exerciseDef.worksetReps,
        status: 'pending',
        plateConfiguration: plateConfig ?? undefined,
      });
       if (plateConfig) runningPlateConfig = plateConfig; // For next exercise's starting point if needed
    }

    return {
      exerciseLog: {
        lift: exerciseDef.lift,
        worksetWeight: actualLoadableWorksetWeight, // This is the weight the user put on the bar for worksets
        sets,
      },
      nextPlateConfig: runningPlateConfig
    };
  },
  getAvailableWorkoutDefinitions: (): WorkoutDefinition[] => {
    return WORKOUT_DEFINITIONS;
  },
  // Getter for plateInventory (read-only access for components)
  getPlateInventory: (): Plate[] => {
      const appData = getAppData();
      return [...appData.plateInventory].sort((a,b) => b.denomination - a.denomination);
  },
  // Getter for exerciseSettings (read-only access for components)
  getExerciseSettings: (): ExerciseSettings => {
      const appData = getAppData();
      return { ...appData.exerciseSettings };
  }
});
