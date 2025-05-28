
import { AppData, Plate, OptimalLoadingResult, LiftType, WorkoutExerciseDefinition } from '../../types';
import { findAllLoadingSequencesForExercise } from '../../utils/workoutOptimizer'; // Updated import
import { BAR_WEIGHT } from '../workout-tracker/workoutTracker.constants';
import { WorkoutTrackerActions } from '../workout-tracker/workoutTracker.data'; 

export const initialBarLoaderTesterData = {
  // No persistent state needed for the tester itself in AppData for now
};

export type BarLoaderTesterActions = ReturnType<typeof createBarLoaderTesterActions>;

export const createBarLoaderTesterActions = (
  setAppData: React.Dispatch<React.SetStateAction<AppData>>,
  getAppData: () => AppData,
  workoutActions: WorkoutTrackerActions 
) => {
  return {
    analyzeBarLoading: (
      targetWorksetWeight: number,
      liftType: LiftType, 
      worksetSets: number,
      worksetReps: number
    ): OptimalLoadingResult[] | null => { // Return type changed
      const appData = getAppData();
      const { plateInventory } = appData;
      const exerciseSettings = appData.exerciseSettings[liftType];

      if (!plateInventory || !exerciseSettings) {
        console.error("Plate inventory or exercise settings not available for Bar Loader Tester.");
        return null;
      }
      
      const exerciseDef: WorkoutExerciseDefinition = { lift: liftType, worksetSets, worksetReps };
      
      let generatedExerciseLog;
      try {
        if (workoutActions.generateSetsForExercise) {
            generatedExerciseLog = workoutActions.generateSetsForExercise(
                exerciseDef, 
                targetWorksetWeight
            ).exerciseLog;
        } else {
            console.error("`generateSetsForExercise` method not found on workoutActions.");
            return null;
        }
      } catch (e) {
          console.error("Error calling generateSetsForExercise:", e);
          return null;
      }

      if (!generatedExerciseLog || !generatedExerciseLog.sets) {
        console.error("Failed to generate sets for analysis.");
        return null;
      }

      const targetSetsForOptimizer: Array<{ targetWeight: number, type: 'warmup' | 'workset', reps: number }> = generatedExerciseLog.sets.map(s => ({
        targetWeight: s.targetWeight, 
        type: s.type,
        reps: s.targetReps
      }));
      
      // Call the updated function
      return findAllLoadingSequencesForExercise(targetSetsForOptimizer, plateInventory, BAR_WEIGHT);
    },
  };
};
