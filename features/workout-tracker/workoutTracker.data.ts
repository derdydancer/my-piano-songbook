
import { AppData, Plate, ExerciseSettings, WorkoutSession, LiftType, ExerciseSetting, WorkoutDefinition, WorkoutExerciseDefinition, PlateCombination, SetDetails, ExerciseLog, ActiveWorkoutState, ActiveSetInfo } from '../../types';
import { BAR_WEIGHT, ALL_LIFTS, DEFAULT_PLATE_DENOMINATIONS, WORKOUT_DEFINITIONS, DEFAULT_TIMER_WARMUP_SECONDS, DEFAULT_TIMER_WORKSET_SECONDS } from './workoutTracker.constants';
import { WARMUP_LOOKUP_TABLE_SIMPLIFIED, generateWarmupTableEntry } from './workoutTracker.warmupTable';
import { calculateBestPlateCombination, findClosestLoadableWeight, roundToNearestIncrement, findNextLoadableWeight } from '../../utils/workoutHelper';

export const getDefaultPlateInventory = (): Plate[] => {
  return DEFAULT_PLATE_DENOMINATIONS.map(d => ({ denomination: d, quantity: 2 }));
};

export const getDefaultExerciseSettings = (): ExerciseSettings => {
  const settings: Partial<ExerciseSettings> = {};
  ALL_LIFTS.forEach(lift => {
    settings[lift] = {
      lastAchievedWorksetWeight: BAR_WEIGHT,
      progressionIncrement: 2.5, 
      defaultTimerWarmup: DEFAULT_TIMER_WARMUP_SECONDS,
      defaultTimerWorkset: DEFAULT_TIMER_WORKSET_SECONDS,
    };
  });
  if (settings['Press']) settings['Press']!.progressionIncrement = 1.0;
  if (settings['Deadlift']) settings['Deadlift']!.progressionIncrement = 5.0;
  return settings as ExerciseSettings;
};

export const initialWorkoutTrackerData = {
  plateInventory: getDefaultPlateInventory() as Plate[],
  exerciseSettings: getDefaultExerciseSettings() as ExerciseSettings,
  workoutSessions: [] as WorkoutSession[],
  activeWorkoutState: null as ActiveWorkoutState | null,
};

export type WorkoutTrackerActions = ReturnType<typeof createWorkoutTrackerActions>;

export const createWorkoutTrackerActions = (
  setAppData: React.Dispatch<React.SetStateAction<AppData>>,
  getAppData: () => AppData
) => ({
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
      
      const finalState = { ...prevAppData, workoutSessions: newSessions, activeWorkoutState: null };
      if (settingsChanged) {
        return { ...finalState, exerciseSettings: updatedSettings };
      }
      return finalState;
    });
  },
  startActiveWorkout: (session: WorkoutSession, activeSetInfo: ActiveSetInfo) => {
    setAppData(prev => ({
      ...prev,
      activeWorkoutState: {
        mode: 'active',
        session: session,
        activeSetInfo: activeSetInfo,
      }
    }));
  },
  updateActiveWorkoutProgress: (updatedSession: WorkoutSession, nextActiveSetInfo: ActiveSetInfo | null) => {
    setAppData(prev => {
      if (!prev.activeWorkoutState) return prev;
      if (nextActiveSetInfo === null) { 
        return { ...prev, activeWorkoutState: null };
      }
      return {
        ...prev,
        activeWorkoutState: {
          ...prev.activeWorkoutState,
          session: updatedSession,
          activeSetInfo: nextActiveSetInfo,
        },
      };
    });
  },
   updateActiveSetTimerState: (exerciseIndex: number, setIndex: number, timerState: { timeLeft: number; isRunning: boolean }) => {
    setAppData(prev => {
      if (!prev.activeWorkoutState || !prev.activeWorkoutState.session) return prev;

      const newSession = { ...prev.activeWorkoutState.session };
      newSession.exercises = newSession.exercises.map((ex, exIdx) => {
        if (exIdx === exerciseIndex) {
          return {
            ...ex,
            sets: ex.sets.map((s, sIdx) => {
              if (sIdx === setIndex) {
                return { ...s, timerState };
              }
              return s;
            }),
          };
        }
        return ex;
      });
      
      const currentActiveSet = newSession.exercises[exerciseIndex].sets[setIndex];

      return {
        ...prev,
        activeWorkoutState: {
          ...prev.activeWorkoutState,
          session: newSession,
          activeSetInfo: { 
            ...prev.activeWorkoutState.activeSetInfo,
            currentSet: exerciseIndex === prev.activeWorkoutState.activeSetInfo.exerciseIndex && 
                        setIndex === prev.activeWorkoutState.activeSetInfo.setIndex
                        ? currentActiveSet
                        : prev.activeWorkoutState.activeSetInfo.currentSet
          }
        }
      };
    });
  },
  cancelActiveWorkout: () => {
    setAppData(prev => ({ ...prev, activeWorkoutState: null }));
  },
  getActiveWorkoutState: (): ActiveWorkoutState | null | undefined => {
    const appData = getAppData();
    return appData.activeWorkoutState;
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
       idealTargetWeight = Math.max(BAR_WEIGHT, liftSetting.lastAchievedWorksetWeight) + liftSetting.progressionIncrement;
       if (liftSetting.lastAchievedWorksetWeight === BAR_WEIGHT && idealTargetWeight === BAR_WEIGHT + liftSetting.progressionIncrement && idealTargetWeight > BAR_WEIGHT && liftSetting.progressionIncrement > 0) {
           // This logic ensures first workout after reset or ever is not just BAR if prog inc is > 0
       } else if (liftSetting.lastAchievedWorksetWeight === BAR_WEIGHT) {
            idealTargetWeight = BAR_WEIGHT; // if prog inc is 0 or last achieved was bar.
       }
    } else {
      const lastPerformance = liftHistory[0]; 
      if (lastPerformance.allWorksetsCompleted) {
        idealTargetWeight = lastPerformance.worksetWeight + liftSetting.progressionIncrement;
      } else {
        idealTargetWeight = lastPerformance.worksetWeight;
      }
    }
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
    const loadableBarWeight = findClosestLoadableWeight(BAR_WEIGHT, appData.plateInventory, BAR_WEIGHT);
    const FIXED_REPS_FOR_TABLE_WARMUPS = [5, 5, 5, 3, 2];

    const lookupKey = Math.floor(proposedWorksetWeight);
    let useTable = proposedWorksetWeight >= 20 && proposedWorksetWeight <= 60 && WARMUP_LOOKUP_TABLE_SIMPLIFIED[lookupKey];
    
    if (useTable) {
      const tableWarmupWeights = WARMUP_LOOKUP_TABLE_SIMPLIFIED[lookupKey];
      tableWarmupWeights.forEach((targetWarmupWeight, index) => {
        const actualWeight = findClosestLoadableWeight(targetWarmupWeight, appData.plateInventory, BAR_WEIGHT);
        const plateConfig = calculateBestPlateCombination(actualWeight, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
        sets.push({
          id: `${exerciseDef.lift}-warmup-table-${index}-${Date.now()}${Math.random().toString(36).substring(2,9)}`,
          type: 'warmup',
          targetWeight: targetWarmupWeight,
          actualWeight: actualWeight,
          targetReps: FIXED_REPS_FOR_TABLE_WARMUPS[index],
          status: 'pending',
          plateConfiguration: plateConfig ?? undefined,
        });
        if (plateConfig) runningPlateConfig = plateConfig;
      });
    } else { 
      // Fallback to percentage-based logic for weights < 20kg or > 60kg, or if table entry missing
      const fullWarmupDefinitions = generateWarmupTableEntry(proposedWorksetWeight, appData.plateInventory, BAR_WEIGHT);
      fullWarmupDefinitions.forEach((warmupDef, index) => {
          const actualWeight = findClosestLoadableWeight(warmupDef.weight, appData.plateInventory, BAR_WEIGHT); // Ensure loadable with user plates
          const plateConfig = calculateBestPlateCombination(actualWeight, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
          sets.push({
              id: `${exerciseDef.lift}-warmup-dynamic-${index}-${Date.now()}${Math.random().toString(36).substring(2,9)}`,
              type: 'warmup',
              targetWeight: warmupDef.weight,
              actualWeight: actualWeight,
              targetReps: warmupDef.reps,
              status: 'pending',
              plateConfiguration: plateConfig ?? undefined,
          });
          if (plateConfig) runningPlateConfig = plateConfig;
      });
    }

    // Worksets
    const actualLoadableWorksetWeight = findClosestLoadableWeight(proposedWorksetWeight, appData.plateInventory, BAR_WEIGHT); 
    for (let i = 0; i < exerciseDef.worksetSets; i++) {
      const plateConfig = calculateBestPlateCombination(actualLoadableWorksetWeight, appData.plateInventory, BAR_WEIGHT, runningPlateConfig);
      sets.push({
        id: `${exerciseDef.lift}-workset-${i}-${Date.now()}${Math.random().toString(36).substring(2,9)}`,
        type: 'workset',
        targetWeight: proposedWorksetWeight, 
        actualWeight: actualLoadableWorksetWeight, 
        targetReps: exerciseDef.worksetReps,
        status: 'pending',
        plateConfiguration: plateConfig ?? undefined,
      });
       if (plateConfig) runningPlateConfig = plateConfig; 
    }

    return {
      exerciseLog: {
        lift: exerciseDef.lift,
        worksetWeight: actualLoadableWorksetWeight, 
        sets,
      },
      nextPlateConfig: runningPlateConfig
    };
  },
  getAvailableWorkoutDefinitions: (): WorkoutDefinition[] => {
    return WORKOUT_DEFINITIONS;
  },
  getPlateInventory: (): Plate[] => {
      const appData = getAppData();
      return [...appData.plateInventory].sort((a,b) => b.denomination - a.denomination);
  },
  getExerciseSettings: (): ExerciseSettings => {
      const appData = getAppData();
      return { ...appData.exerciseSettings };
  }
});
