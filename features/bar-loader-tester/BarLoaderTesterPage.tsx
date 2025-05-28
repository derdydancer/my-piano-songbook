
import React, { useState, useEffect } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { OptimalLoadingResult, LiftType, PlateCombination } from '../../types';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import BarbellVisualizer from '../workout-tracker/components/BarbellVisualizer';
import { formatPlateCombination } from '../../utils/workoutHelper';
import { BAR_WEIGHT, ALL_LIFTS } from '../workout-tracker/workoutTracker.constants';
import LoadingSpinner from '../../components/LoadingSpinner';

const BarLoaderTesterPage: React.FC = () => {
  const { analyzeBarLoading } = useAppData();
  const [targetWorksetWeight, setTargetWorksetWeight] = useState<string>("100");
  const [selectedLift, setSelectedLift] = useState<LiftType>(ALL_LIFTS[0]);
  const [analysisResults, setAnalysisResults] = useState<OptimalLoadingResult[] | null>(null); // Changed to array
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = () => {
    const weight = parseFloat(targetWorksetWeight);
    if (isNaN(weight) || weight < BAR_WEIGHT) {
      setError(`Please enter a valid workset weight (must be at least bar weight: ${BAR_WEIGHT}kg).`);
      setAnalysisResults(null);
      setSelectedSequenceIndex(null);
      return;
    }
    setError(null);
    setIsLoading(true);
    setAnalysisResults(null); 
    setSelectedSequenceIndex(null);

    setTimeout(() => {
        try {
            const worksetSets = selectedLift === 'Deadlift' ? 1 : 3;
            const worksetReps = 5;
            const results = analyzeBarLoading(weight, selectedLift, worksetSets, worksetReps);
            
            if (results && results.length > 0) {
                // Results are already sorted by totalEffort by the optimizer
                setAnalysisResults(results);
                setSelectedSequenceIndex(0); // Default to the best one
            } else {
                setAnalysisResults(null);
                setError("Could not find any valid loading sequences. This might happen if target weights are unachievable or an internal error occurred.");
            }
        } catch (e: any) {
            console.error("Error during analysis:", e);
            setError(`An error occurred: ${e.message || "Unknown error"}`);
            setAnalysisResults(null);
        } finally {
            setIsLoading(false);
        }
    }, 50); 
  };

  useEffect(() => {
    // Reset selected index if results change
    if (analysisResults && analysisResults.length > 0) {
        setSelectedSequenceIndex(0);
    } else {
        setSelectedSequenceIndex(null);
    }
  }, [analysisResults]);

  const liftOptions = ALL_LIFTS.map(lift => ({ value: lift, label: lift }));
  
  const sequenceOptions = analysisResults?.map((result, index) => ({
      value: index.toString(),
      label: `Sequence ${index + 1} (Total Effort: ${result.totalEffort})`
  })) || [];

  const currentSelectedSequence = (analysisResults && selectedSequenceIndex !== null) ? analysisResults[selectedSequenceIndex] : null;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-textPrimary">Bar Loading Optimizer Tester</h1>

      <div className="bg-card p-4 rounded-lg shadow space-y-3">
        <div>
          <Select
            label="Select Lift for Warmup Scheme:"
            options={liftOptions}
            value={selectedLift}
            onChange={(e) => setSelectedLift(e.target.value as LiftType)}
            containerClassName="mb-0"
          />
        </div>
        <div>
          <Input
            label="Target Workset Weight (kg):"
            type="number"
            value={targetWorksetWeight}
            onChange={(e) => setTargetWorksetWeight(e.target.value)}
            placeholder={`e.g., 100 (min ${BAR_WEIGHT})`}
            min={BAR_WEIGHT.toString()}
            step="0.5"
            containerClassName="mb-0"
          />
        </div>
        <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
          {isLoading ? <LoadingSpinner size="sm" /> : "Analyze All Loading Sequences"}
        </Button>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {isLoading && <LoadingSpinner message="Calculating all loading sequences..." />}

      {analysisResults && analysisResults.length > 0 && !isLoading && (
        <div className="bg-card p-4 rounded-lg shadow space-y-4">
            <h2 className="text-xl font-semibold text-textPrimary">
                Found {analysisResults.length} Loading Sequence(s)
            </h2>
            {analysisResults.length > 1 && (
                 <Select
                    label="Select Sequence to View:"
                    options={sequenceOptions}
                    value={selectedSequenceIndex !== null ? selectedSequenceIndex.toString() : ""}
                    onChange={(e) => setSelectedSequenceIndex(parseInt(e.target.value, 10))}
                    containerClassName="mb-2"
                />
            )}
            {currentSelectedSequence && (
                <div>
                    <p className="text-textSecondary mb-2">
                        Viewing Sequence {selectedSequenceIndex !== null ? selectedSequenceIndex + 1 : ''} <br/>
                        Total Transition Effort: <span className="font-bold text-primary">{currentSelectedSequence.totalEffort}</span> units
                    </p>
                    <div className="space-y-3">
                        {currentSelectedSequence.setLoadings.map((setLoad, index) => (
                        <div key={index} className="p-3 bg-background dark:bg-gray-700 rounded-md">
                            <h3 className="text-md font-semibold text-textPrimary">
                            Set {index + 1} ({setLoad.setType}, {setLoad.reps} reps)
                            </h3>
                            <p className="text-sm text-textSecondary">
                            Target: {setLoad.targetWeight.toFixed(1)}kg | Actual Loaded: <span className="font-bold">{setLoad.actualWeight.toFixed(1)}kg</span>
                            </p>
                            <BarbellVisualizer plateCombination={setLoad.plateConfig} barWeight={BAR_WEIGHT} />
                            <p className="text-xs text-textSecondary mt-1">
                            Plates: {setLoad.plateConfig.length > 0 ? formatPlateCombination(setLoad.plateConfig) : 'Empty Bar'}
                            </p>
                            <p className="text-xs text-textSecondary">
                            Transition Effort from Previous Set: <span className="font-semibold">{setLoad.transitionEffortFromPrevious}</span>
                            </p>
                        </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}
       {!analysisResults && !isLoading && !error && (
        <p className="text-textSecondary text-center py-6">
          Enter a workset weight and click "Analyze" to see possible loading sequences.
        </p>
      )}
    </div>
  );
};

export default BarLoaderTesterPage;
