
import { Plate, ExerciseSettings, WorkoutSession, ExerciseLog, SetDetails, LiftType, WorkoutDefinition } from '../../types';
import { BAR_WEIGHT, ALL_LIFTS, WORKOUT_DEFINITIONS } from './workoutTracker.constants';
import { getDefaultExerciseSettings as getStockExerciseSettings } from './workoutTracker.data';


const today = new Date();
const daysAgo = (days: number): string => {
    const date = new Date(today);
    date.setDate(today.getDate() - days);
    return date.toISOString();
};

export const samplePlateInventory: Plate[] = [
  { denomination: 25, quantity: 2 },
  { denomination: 20, quantity: 4 },
  { denomination: 15, quantity: 0 }, 
  { denomination: 10, quantity: 2 },
  { denomination: 5, quantity: 4 },
  { denomination: 2.5, quantity: 2 },
  { denomination: 1.25, quantity: 2 },
  { denomination: 0.5, quantity: 2 }, 
];

export const sampleExerciseSettings: ExerciseSettings = {
  ...(getStockExerciseSettings()), 
  'Squat': { ...(getStockExerciseSettings()['Squat']), lastAchievedWorksetWeight: 100, progressionIncrement: 2.5 },
  'Press': { ...(getStockExerciseSettings()['Press']), lastAchievedWorksetWeight: 60, progressionIncrement: 1.0 }, 
  'Deadlift': { ...(getStockExerciseSettings()['Deadlift']), lastAchievedWorksetWeight: 140, progressionIncrement: 5.0 }, 
  'Bench Press': { ...(getStockExerciseSettings()['Bench Press']), lastAchievedWorksetWeight: 80, progressionIncrement: 2.5 },
};

const workoutA = WORKOUT_DEFINITIONS.find(w => w.name === "Workout A")!;
const workoutB = WORKOUT_DEFINITIONS.find(w => w.name === "Workout B")!;

const createSampleWorkoutSession = (
    id: string, 
    dateISO: string, 
    definition: WorkoutDefinition, 
    exerciseDetails: Array<{lift: LiftType, worksetWeight: number, setStatuses: Array<'completed'|'failed'|'skipped'>, completedReps?: number[]}>,
    notes?: string
): WorkoutSession => {
    const exercises: ExerciseLog[] = definition.exercises.map((exDef, index) => {
        const detail = exerciseDetails.find(ed => ed.lift === exDef.lift);
        if (!detail) throw new Error (`Detail missing for ${exDef.lift}`);

        const sets: SetDetails[] = [];
        // Simplified warmups for sample data
        for (let i=0; i<2; i++) { // Bar warmups
            sets.push({ id: `${id}-${exDef.lift}-warmup-bar-${i}-${Math.random()}`, type: 'warmup', targetWeight: BAR_WEIGHT, actualWeight: BAR_WEIGHT, targetReps: 5, status: 'completed', completedReps: 5 });
        }
        // One loaded warmup
        const loadedWarmupWeight = Math.max(BAR_WEIGHT, Math.round((detail.worksetWeight * 0.6)/5)*5);
        if (loadedWarmupWeight < detail.worksetWeight && loadedWarmupWeight > BAR_WEIGHT) {
             sets.push({ id: `${id}-${exDef.lift}-warmup-loaded-1-${Math.random()}`, type: 'warmup', targetWeight: loadedWarmupWeight, actualWeight: loadedWarmupWeight, targetReps: 5, status: 'completed', completedReps: 5 });
        }
        
        for (let i = 0; i < exDef.worksetSets; i++) {
            const status = detail.setStatuses[i] || 'completed';
            const repsDone = detail.completedReps && detail.completedReps[i] !== undefined ? detail.completedReps[i] : (status === 'completed' ? exDef.worksetReps : 0);
            sets.push({
                id: `${id}-${exDef.lift}-workset-${i}-${Math.random()}`,
                type: 'workset',
                targetWeight: detail.worksetWeight,
                actualWeight: detail.worksetWeight,
                targetReps: exDef.worksetReps,
                status: status,
                completedReps: repsDone,
            });
        }
        return { lift: exDef.lift, worksetWeight: detail.worksetWeight, sets };
    });
    return { id, date: dateISO, workoutDefinitionName: definition.name, exercises, notes };
};


export const sampleWorkoutSessions: WorkoutSession[] = [
    createSampleWorkoutSession('s1', daysAgo(20), workoutA, [
        { lift: 'Squat', worksetWeight: 95, setStatuses: ['completed', 'completed', 'completed'] },
        { lift: 'Press', worksetWeight: 55, setStatuses: ['completed', 'completed', 'failed'], completedReps: [5,5,3] },
        { lift: 'Deadlift', worksetWeight: 130, setStatuses: ['completed'] },
    ], "Felt strong on squats, press was tough."),
    createSampleWorkoutSession('s2', daysAgo(18), workoutB, [
        { lift: 'Squat', worksetWeight: 97.5, setStatuses: ['completed', 'completed', 'completed'] },
        { lift: 'Bench Press', worksetWeight: 75, setStatuses: ['completed', 'completed', 'completed'] },
        { lift: 'Deadlift', worksetWeight: 135, setStatuses: ['skipped'] }, 
    ]),
    createSampleWorkoutSession('s3', daysAgo(16), workoutA, [
        { lift: 'Squat', worksetWeight: 97.5, setStatuses: ['completed', 'completed', 'completed'] }, 
        { lift: 'Press', worksetWeight: 55, setStatuses: ['completed', 'completed', 'completed'] }, 
        { lift: 'Deadlift', worksetWeight: 135, setStatuses: ['completed'] },
    ], "Squats felt heavy today. Glad I got through press."),
    createSampleWorkoutSession('s4', daysAgo(13), workoutB, [ 
        { lift: 'Squat', worksetWeight: 100, setStatuses: ['completed', 'completed', 'completed'] },
        { lift: 'Bench Press', worksetWeight: 77.5, setStatuses: ['completed', 'completed', 'failed'], completedReps: [5,5,2] },
        { lift: 'Deadlift', worksetWeight: 140, setStatuses: ['completed'] },
    ]),
    createSampleWorkoutSession('s5', daysAgo(10), workoutA, [
        { lift: 'Squat', worksetWeight: 100, setStatuses: ['completed', 'completed', 'completed'] }, 
        { lift: 'Press', worksetWeight: 57.5, setStatuses: ['completed', 'completed', 'completed'] },
        { lift: 'Deadlift', worksetWeight: 130, setStatuses: ['failed'], completedReps: [3] }, 
    ], "Short on time, rushed warmups."),
     createSampleWorkoutSession('s6', daysAgo(7), workoutB, [
        { lift: 'Squat', worksetWeight: 102.5, setStatuses: ['completed', 'completed', 'completed'] },
        { lift: 'Bench Press', worksetWeight: 77.5, setStatuses: ['completed', 'completed', 'completed'] }, 
        { lift: 'Deadlift', worksetWeight: 140, setStatuses: ['completed'] }, 
    ]),
    createSampleWorkoutSession('s7', daysAgo(4), workoutA, [
        { lift: 'Squat', worksetWeight: 102.5, setStatuses: ['failed','failed','failed'], completedReps: [2,1,0] }, 
        { lift: 'Press', worksetWeight: 58.5, setStatuses: ['completed', 'completed', 'completed'] },
        { lift: 'Deadlift', worksetWeight: 132.5, setStatuses: ['completed'] }, 
    ], "Terrible squat session. Maybe need more rest or food."),
     createSampleWorkoutSession('s8', daysAgo(1), workoutB, [
        { lift: 'Squat', worksetWeight: 105, setStatuses: ['completed', 'completed', 'completed'] },
        { lift: 'Bench Press', worksetWeight: 80, setStatuses: ['completed', 'completed', 'completed'] },
        { lift: 'Deadlift', worksetWeight: 145, setStatuses: ['completed'] },
    ], "Feeling much better today! Good lifts."),
];
