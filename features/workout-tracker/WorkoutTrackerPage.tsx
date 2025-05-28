
import React, { useState, useEffect, useCallback } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { WorkoutDefinition, WorkoutSession, ExerciseLog, SetDetails, LiftType, ActiveSetInfo, PlateCombination, WorkoutMode } from '../../types';
import Button from '../../components/common/Button';
import Modal from '../../components/Modal';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import { PlusCircleIcon, RefreshCwIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon, ChevronUpIcon, MinusIcon, PlusIcon, ArrowLeftIcon } from '../../components/common/Icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatPlateCombination, findClosestLoadableWeight, findNextLoadableWeight } from '../../utils/workoutHelper';
import { BAR_WEIGHT, DEFAULT_TIMER_WARMUP_SECONDS, DEFAULT_TIMER_WORKSET_SECONDS, WORKOUT_DEFINITIONS as APP_WORKOUT_DEFINITIONS } from './workoutTracker.constants'; // Renamed import
import BarbellVisualizer from './components/BarbellVisualizer';
import SetTimer from './components/SetTimer';
import ExerciseProgressBar from './components/ExerciseProgressBar';
import ActiveWorkoutSetsDisplay from './components/ActiveWorkoutSetsDisplay';


const WorkoutTrackerPage: React.FC = () => {
  const {
    getAvailableWorkoutDefinitions,
    getLastWorkoutSession, // Still useful for displaying last session of specific type
    getAllWorkoutSessions, // Used for determining next workout type
    getProposedWorksetWeight,
    generateSetsForExercise,
    addWorkoutSession,
    getExerciseSettings,
    getPlateInventory,
  } = useAppData();

  const exerciseSettings = getExerciseSettings();
  const plateInventory = getPlateInventory();

  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('setup');
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutDefinition[]>([]);
  const [selectedWorkoutDef, setSelectedWorkoutDef] = useState<WorkoutDefinition | null>(null);
  const [lastSpecificSessionDisplay, setLastSpecificSessionDisplay] = useState<WorkoutSession | null>(null);
  
  const [currentWorkoutSession, setCurrentWorkoutSession] = useState<WorkoutSession | null>(null);
  const [editableExerciseLogs, setEditableExerciseLogs] = useState<ExerciseLog[]>([]);
  
  const [activeSetInfo, setActiveSetInfo] = useState<ActiveSetInfo | null>(null);
  const [repsForFailedSet, setRepsForFailedSet] = useState<string>("");
  const [isFailModalOpen, setIsFailModalOpen] = useState(false);

  const updateSetupScreenData = useCallback((definitionName: string, currentDefinitions: WorkoutDefinition[]) => {
    const definition = currentDefinitions.find(def => def.name === definitionName);
    if (definition) {
      setSelectedWorkoutDef(definition);
      setLastSpecificSessionDisplay(getLastWorkoutSession(definition.name) || null); // For display of last *specific* A/B
      
      let runningPlateConfig: PlateCombination | undefined = undefined;
      const proposedLogs: ExerciseLog[] = definition.exercises.map(exDef => {
        const proposedWeight = getProposedWorksetWeight(exDef.lift);
        const { exerciseLog, nextPlateConfig } = generateSetsForExercise(exDef, proposedWeight, runningPlateConfig);
        runningPlateConfig = nextPlateConfig;
        return exerciseLog;
      });
      setEditableExerciseLogs(proposedLogs);
    } else {
      setSelectedWorkoutDef(null);
      setLastSpecificSessionDisplay(null);
      setEditableExerciseLogs([]);
    }
  }, [getLastWorkoutSession, getProposedWorksetWeight, generateSetsForExercise]);

  useEffect(() => {
    const definitions = getAvailableWorkoutDefinitions();
    setAvailableWorkouts(definitions);

    if (definitions.length > 0 && workoutMode === 'setup') {
        const allSessions = getAllWorkoutSessions(); // Chronologically sorted, newest first
        const mostRecentGlobalSession = allSessions[0]; // The very last workout done
        let defaultWorkoutName = definitions[0].name; // Fallback

        if (mostRecentGlobalSession && APP_WORKOUT_DEFINITIONS.length >= 2) {
            const workoutADef = definitions.find(d => d.name === APP_WORKOUT_DEFINITIONS[0]?.name);
            const workoutBDef = definitions.find(d => d.name === APP_WORKOUT_DEFINITIONS[1]?.name);

            if (mostRecentGlobalSession.workoutDefinitionName === APP_WORKOUT_DEFINITIONS[0]?.name && workoutBDef) {
                defaultWorkoutName = APP_WORKOUT_DEFINITIONS[1].name; // If A was last, suggest B
            } else if (mostRecentGlobalSession.workoutDefinitionName === APP_WORKOUT_DEFINITIONS[1]?.name && workoutADef) {
                defaultWorkoutName = APP_WORKOUT_DEFINITIONS[0].name; // If B was last, suggest A
            } else if (workoutADef){ // If last workout was neither A nor B (or definitions changed), default to A if available
                defaultWorkoutName = APP_WORKOUT_DEFINITIONS[0].name;
            } else if (workoutBDef) { // Or B if A not available
                 defaultWorkoutName = APP_WORKOUT_DEFINITIONS[1].name;
            }
            // If neither A nor B are in current definitions, the initial fallback (definitions[0].name) is used.
        }
        updateSetupScreenData(defaultWorkoutName, definitions);
    } else if (definitions.length === 0) {
        updateSetupScreenData("", []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAvailableWorkoutDefinitions, workoutMode]); // Rerun when definitions load or mode changes to setup


  const handleAdjustWorksetWeight = (exerciseIndex: number, adjustmentType: 'increment' | 'decrement' | 'add10' | 'subtract10') => {
    setEditableExerciseLogs(prevLogs => {
      const updatedLogs = [...prevLogs];
      const targetLog = updatedLogs[exerciseIndex];
      if (!targetLog || !selectedWorkoutDef) return prevLogs;

      const exerciseDef = selectedWorkoutDef.exercises[exerciseIndex];
      let newTargetWeight = targetLog.worksetWeight;

      switch (adjustmentType) {
        case 'increment':
          newTargetWeight = findNextLoadableWeight(targetLog.worksetWeight, 'up', plateInventory, BAR_WEIGHT);
          break;
        case 'decrement':
          newTargetWeight = findNextLoadableWeight(targetLog.worksetWeight, 'down', plateInventory, BAR_WEIGHT);
          break;
        case 'add10':
          newTargetWeight = findClosestLoadableWeight(targetLog.worksetWeight + 10, plateInventory, BAR_WEIGHT);
          break;
        case 'subtract10':
          newTargetWeight = findClosestLoadableWeight(targetLog.worksetWeight - 10, plateInventory, BAR_WEIGHT);
          break;
      }
      
      newTargetWeight = Math.max(newTargetWeight, BAR_WEIGHT);

      const { exerciseLog: newExerciseLog, nextPlateConfig: currentExPlateConfig } = generateSetsForExercise(exerciseDef, newTargetWeight, 
        exerciseIndex > 0 ? updatedLogs[exerciseIndex-1]?.sets[updatedLogs[exerciseIndex-1].sets.length-1]?.plateConfiguration : undefined
      );
      updatedLogs[exerciseIndex] = newExerciseLog;
      
      let lastPlateConfig = currentExPlateConfig;

      for (let i = exerciseIndex + 1; i < updatedLogs.length; i++) {
        const subsequentExDef = selectedWorkoutDef.exercises[i];
        const {exerciseLog: subsequentNewLog, nextPlateConfig: subsequentPlateConfig} = generateSetsForExercise(subsequentExDef, updatedLogs[i].worksetWeight, lastPlateConfig);
        updatedLogs[i] = subsequentNewLog;
        lastPlateConfig = subsequentPlateConfig;
      }
      return updatedLogs;
    });
  };

  const startWorkout = () => {
    if (!selectedWorkoutDef || editableExerciseLogs.length === 0) return;

    const newSession: WorkoutSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      workoutDefinitionName: selectedWorkoutDef.name,
      exercises: JSON.parse(JSON.stringify(editableExerciseLogs)), 
    };
    setCurrentWorkoutSession(newSession);
    if (newSession.exercises.length > 0 && newSession.exercises[0].sets.length > 0) {
        setActiveSetInfo({
          exerciseIndex: 0,
          setIndex: 0,
          currentLift: newSession.exercises[0].lift,
          currentSet: newSession.exercises[0].sets[0],
        });
        setWorkoutMode('active');
    } else {
        setWorkoutMode('completed'); 
    }
  };

  const handleSetCompletion = (status: 'completed' | 'failed' | 'skipped') => {
    if (!currentWorkoutSession || !activeSetInfo) return;

    let completedRepsValue: number | undefined = undefined;
    if (status === 'failed') {
        const reps = parseInt(repsForFailedSet, 10);
        if (isNaN(reps) || reps < 0 || reps >= activeSetInfo.currentSet.targetReps) {
            alert(`Please enter a valid number of reps completed (0-${activeSetInfo.currentSet.targetReps -1}).`);
            return;
        }
        completedRepsValue = reps;
        setIsFailModalOpen(false);
        setRepsForFailedSet("");
    }
    
    const updatedSession = { ...currentWorkoutSession };
    updatedSession.exercises = updatedSession.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({...s})) // Deep copy sets
    }));

    const exLog = updatedSession.exercises[activeSetInfo.exerciseIndex];
    const setLog = exLog.sets[activeSetInfo.setIndex];
    
    setLog.status = status;
    if (completedRepsValue !== undefined) {
        setLog.completedReps = completedRepsValue;
    } else if (status === 'completed') {
        setLog.completedReps = setLog.targetReps;
    }

    setCurrentWorkoutSession(updatedSession); // This will trigger progress bar updates

    // Advance to next set or complete workout
    let nextExerciseIndex = activeSetInfo.exerciseIndex;
    let nextSetIndex = activeSetInfo.setIndex + 1;

    if (nextSetIndex >= exLog.sets.length) { 
      nextExerciseIndex++;
      nextSetIndex = 0;
    }

    if (nextExerciseIndex >= updatedSession.exercises.length) { 
      setWorkoutMode('completed');
      addWorkoutSession(updatedSession);
      // updateSetupScreenData will be called by useEffect due to workoutMode change
    } else {
      setActiveSetInfo({
        exerciseIndex: nextExerciseIndex,
        setIndex: nextSetIndex,
        currentLift: updatedSession.exercises[nextExerciseIndex].lift,
        currentSet: updatedSession.exercises[nextExerciseIndex].sets[nextSetIndex],
      });
    }
  };

  const handleGoBackToPreviousSet = () => {
    if (!currentWorkoutSession || !activeSetInfo || (activeSetInfo.exerciseIndex === 0 && activeSetInfo.setIndex === 0)) {
      return; // Cannot go back from the very first set
    }

    const updatedSession = { ...currentWorkoutSession };
     updatedSession.exercises = updatedSession.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({...s}))
    }));

    // Reset current (soon to be next) set's status before moving back
    const currentExLog = updatedSession.exercises[activeSetInfo.exerciseIndex];
    const currentSetLogToReset = currentExLog.sets[activeSetInfo.setIndex];
    currentSetLogToReset.status = 'pending';
    delete currentSetLogToReset.completedReps;


    let prevExerciseIndex = activeSetInfo.exerciseIndex;
    let prevSetIndex = activeSetInfo.setIndex - 1;

    if (prevSetIndex < 0) {
      prevExerciseIndex--;
      // This assumes all exercises have at least one set.
      prevSetIndex = updatedSession.exercises[prevExerciseIndex].sets.length - 1; 
    }
    
    // Also reset the status of the set we are going back TO
    const targetExLog = updatedSession.exercises[prevExerciseIndex];
    const targetSetLog = targetExLog.sets[prevSetIndex];
    targetSetLog.status = 'pending';
    delete targetSetLog.completedReps;


    setCurrentWorkoutSession(updatedSession);
    setActiveSetInfo({
      exerciseIndex: prevExerciseIndex,
      setIndex: prevSetIndex,
      currentLift: updatedSession.exercises[prevExerciseIndex].lift,
      currentSet: targetSetLog,
    });
  };
  
  const openFailModal = () => {
    if(activeSetInfo) {
      setRepsForFailedSet(Math.max(0, activeSetInfo.currentSet.targetReps -1).toString());
      setIsFailModalOpen(true);
    }
  };

  if (workoutMode === 'setup' && (!selectedWorkoutDef && availableWorkouts.length > 0)) { 
    return <div className="p-4"><LoadingSpinner message="Loading workout definitions..." /></div>;
  }
  if (availableWorkouts.length === 0 && workoutMode === 'setup') { 
    return <div className="p-4 text-center text-textSecondary">No workout definitions found. Configure them in workoutTracker.constants.ts.</div>;
  }


  return (
    <div className="p-4 space-y-6 mb-16"> {/* Added mb-16 for bottom nav */}
      <h1 className="text-2xl font-bold text-textPrimary">Train</h1>

      {workoutMode === 'setup' && selectedWorkoutDef && (
        <div className="space-y-4">
          <Select
            label="Choose Workout:"
            options={availableWorkouts.map(def => ({ value: def.name, label: def.name }))}
            value={selectedWorkoutDef.name}
            onChange={(e) => updateSetupScreenData(e.target.value, availableWorkouts)}
          />

          {lastSpecificSessionDisplay && (
            <div className="bg-card p-3 rounded-lg shadow">
              <h3 className="text-md font-semibold text-textPrimary mb-1">Last {selectedWorkoutDef.name}:</h3>
              <p className="text-xs text-textSecondary">Date: {new Date(lastSpecificSessionDisplay.date).toLocaleDateString()}</p>
              <ul className="text-xs mt-1 space-y-0.5">
                {lastSpecificSessionDisplay.exercises.map(ex => (
                  <li key={ex.lift}>{ex.lift}: {ex.worksetWeight}kg - {ex.sets.filter(s=>s.type==='workset').map(s => s.status === 'completed' ? `${s.completedReps || s.targetReps}r` : `${s.completedReps || 0}/${s.targetReps}r(${s.status})`).join(', ')}</li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="text-xl font-semibold text-textPrimary mt-4">Confirm Workout Plan:</h2>
          {editableExerciseLogs.map((exLog, exIndex) => (
            <div key={exLog.lift + exIndex} className="bg-card p-3 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-primary">{exLog.lift}</h3>
              <div className="mb-2 space-y-2">
                 <label className="block text-sm font-medium text-textSecondary">Workset Weight (kg) for {exLog.lift}:</label>
                 <div className="flex items-center space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => handleAdjustWorksetWeight(exIndex, 'subtract10')}>-10kg</Button>
                    <Button size="sm" variant="secondary" onClick={() => handleAdjustWorksetWeight(exIndex, 'decrement')}><MinusIcon className="w-4 h-4"/></Button>
                    <span className="text-lg font-semibold text-textPrimary w-16 text-center tabular-nums">{exLog.worksetWeight.toFixed(1)}</span>
                    <Button size="sm" variant="secondary" onClick={() => handleAdjustWorksetWeight(exIndex, 'increment')}><PlusIcon className="w-4 h-4"/></Button>
                    <Button size="sm" variant="secondary" onClick={() => handleAdjustWorksetWeight(exIndex, 'add10')}>+10kg</Button>
                 </div>
                 <p className="text-xs text-textSecondary mt-1">Progression Inc: {exerciseSettings[exLog.lift]?.progressionIncrement || 2.5}kg. Last achieved for {exLog.lift}: {exerciseSettings[exLog.lift]?.lastAchievedWorksetWeight || BAR_WEIGHT}kg</p>
              </div>
              <p className="text-sm text-textSecondary">Warmups & Worksets will be based on this weight.</p>
              {exLog.sets && exLog.sets.length > 0 && (
                <details className="text-xs mt-1">
                  <summary className="cursor-pointer text-primary hover:underline">Show Generated Sets Preview</summary>
                  <ul className="mt-1 space-y-0.5">
                    {exLog.sets.map(s => (
                      <li key={s.id} className="text-textSecondary">
                        {s.type.charAt(0).toUpperCase() + s.type.slice(1)}: {s.actualWeight}kg (Target: {s.targetWeight}kg) x {s.targetReps} reps ({formatPlateCombination(s.plateConfiguration)})
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
          <Button onClick={startWorkout} size="lg" className="w-full">
            Start Workout
          </Button>
        </div>
      )}

      {workoutMode === 'active' && currentWorkoutSession && activeSetInfo && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-textPrimary">
            {currentWorkoutSession.workoutDefinitionName} - In Progress
          </h2>

          {/* Overall Progress Bars (can be kept or removed based on preference) */}
          <div className="bg-card p-3 rounded-lg shadow space-y-2">
            <h3 className="text-md font-semibold text-textPrimary mb-1">Overall Workout Progress:</h3>
            {currentWorkoutSession.exercises.map(exLog => (
                <ExerciseProgressBar key={exLog.lift} exerciseLog={exLog} />
            ))}
          </div>
          
          {/* Main Active Set Info */}
          <div className="bg-card p-4 rounded-lg shadow text-center">
            <h3 className="text-2xl font-bold text-primary">{activeSetInfo.currentLift}</h3>
            <p className="text-lg text-textPrimary">
              {activeSetInfo.currentSet.type.charAt(0).toUpperCase() + activeSetInfo.currentSet.type.slice(1)} Set {currentWorkoutSession.exercises[activeSetInfo.exerciseIndex].sets.filter(s => s.type === activeSetInfo.currentSet.type).findIndex(s => s.id === activeSetInfo.currentSet.id) + 1}
              {' / '} 
              {currentWorkoutSession.exercises[activeSetInfo.exerciseIndex].sets.filter(s => s.type === activeSetInfo.currentSet.type).length}
            </p>
            <p className="text-4xl font-bold text-textPrimary my-3">
              {activeSetInfo.currentSet.actualWeight} kg x {activeSetInfo.currentSet.targetReps} reps
            </p>

            {/* Performed/Upcoming Sets Display for Current Exercise */}
            <ActiveWorkoutSetsDisplay 
                currentExerciseLog={currentWorkoutSession.exercises[activeSetInfo.exerciseIndex]}
                activeSetId={activeSetInfo.currentSet.id}
                totalSetsInExercise={currentWorkoutSession.exercises[activeSetInfo.exerciseIndex].sets.length}
            />
            
            <SetTimer 
              key={activeSetInfo.currentSet.id} // React key for re-mounting
              setKey={activeSetInfo.currentSet.id} // Prop for internal logic
              defaultDurationSeconds={activeSetInfo.currentSet.type === 'warmup' ? (exerciseSettings[activeSetInfo.currentLift]?.defaultTimerWarmup || DEFAULT_TIMER_WARMUP_SECONDS) : (exerciseSettings[activeSetInfo.currentLift]?.defaultTimerWorkset || DEFAULT_TIMER_WORKSET_SECONDS)}
            />
            
            <div className="bg-background dark:bg-gray-700 p-2 rounded mb-4">
                <p className="text-sm font-semibold text-textSecondary">Load Bar:</p>
                <BarbellVisualizer 
                    plateCombination={activeSetInfo.currentSet.plateConfiguration} 
                    barWeight={BAR_WEIGHT} 
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => handleSetCompletion('completed')} variant="primary" size="lg" className="bg-green-500 hover:bg-green-600">
                <CheckCircleIcon className="w-6 h-6 mr-2"/> Pass
              </Button>
              <Button onClick={openFailModal} variant="danger" size="lg">
                <XCircleIcon className="w-6 h-6 mr-2"/> Fail
              </Button>
            </div>
            <div className="mt-3 flex justify-between items-center">
                <Button 
                    onClick={handleGoBackToPreviousSet} 
                    variant="ghost" 
                    size="sm" 
                    disabled={activeSetInfo.exerciseIndex === 0 && activeSetInfo.setIndex === 0}
                    className="text-textSecondary hover:text-textPrimary disabled:opacity-50"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-1"/> Previous Set
                </Button>
                 <Button onClick={() => handleSetCompletion('skipped')} variant="ghost" size="sm" className="text-textSecondary hover:text-textPrimary">
                    Skip Set
                </Button>
            </div>
          </div>
        </div>
      )}
      
      <Modal isOpen={isFailModalOpen} onClose={() => setIsFailModalOpen(false)} title={`Failed Set: ${activeSetInfo?.currentLift || ''}`}>
          <Input 
            label={`How many reps did you complete (target: ${activeSetInfo?.currentSet.targetReps || 0})?`}
            type="number"
            value={repsForFailedSet}
            onChange={(e) => setRepsForFailedSet(e.target.value)}
            max={(activeSetInfo && activeSetInfo.currentSet.targetReps > 0 ? activeSetInfo.currentSet.targetReps -1 : 0).toString()}
            min="0"
            required
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="ghost" onClick={() => setIsFailModalOpen(false)}>Cancel</Button>
            <Button onClick={() => handleSetCompletion('failed')}>Confirm Failure</Button>
          </div>
      </Modal>

      {workoutMode === 'completed' && currentWorkoutSession && (
        <div className="bg-card p-4 rounded-lg shadow text-center space-y-3">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto"/>
          <h2 className="text-2xl font-bold text-textPrimary">Workout Completed!</h2>
          <p className="text-textSecondary">{currentWorkoutSession.workoutDefinitionName} on {new Date(currentWorkoutSession.date).toLocaleDateString()}</p>
          <Button onClick={() => {
            setWorkoutMode('setup'); // This will trigger useEffect to reload setup data
            setCurrentWorkoutSession(null);
            setActiveSetInfo(null);
          }}>
            Start New Workout Setup
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkoutTrackerPage;
