
import React from 'react';
import { ExerciseLog, SetDetails } from '../../../types';
import { CheckCircleIcon, XCircleIcon, ForwardIcon } from '../../../components/common/Icons';

interface ActiveWorkoutSetsDisplayProps {
  currentExerciseLog: ExerciseLog;
  activeSetId: string; 
  totalSetsInExercise: number; // Unused currently, but might be useful later
}

const MAX_UPCOMING_DISPLAY = 3; // Show active set + these many upcoming
const MAX_PERFORMED_DISPLAY = 4; // Show this many recent performed sets

const SetStatusIcon: React.FC<{ status: SetDetails['status'] }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="w-4 h-4 text-green-500 dark:text-green-400 inline ml-1" />;
    case 'failed':
      return <XCircleIcon className="w-4 h-4 text-red-500 dark:text-red-400 inline ml-1" />;
    case 'skipped':
      return <ForwardIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400 inline ml-1" />;
    default:
      return null;
  }
};

const ActiveWorkoutSetsDisplay: React.FC<ActiveWorkoutSetsDisplayProps> = ({ currentExerciseLog, activeSetId }) => {
  if (!currentExerciseLog) return null;

  const allSets = currentExerciseLog.sets;
  const activeIndex = allSets.findIndex(set => set.id === activeSetId);

  let displayedUpcomingSets: SetDetails[] = [];
  let displayedPerformedSets: SetDetails[] = [];

  if (activeIndex !== -1) {
    // Active set and the next few upcoming
    displayedUpcomingSets = allSets.slice(activeIndex, activeIndex + 1 + MAX_UPCOMING_DISPLAY);
    // Last few performed sets
    displayedPerformedSets = allSets.slice(0, activeIndex).slice(-MAX_PERFORMED_DISPLAY);
  } else {
    // Fallback if activeSetId isn't found (e.g., workout just completed for this exercise)
    // Show all non-pending as performed, and all pending as upcoming (respecting limits)
    const pendingSets = allSets.filter(s => s.status === 'pending');
    const nonPendingSets = allSets.filter(s => s.status !== 'pending');
    
    displayedUpcomingSets = pendingSets.slice(0, 1 + MAX_UPCOMING_DISPLAY); // Show first few pending
    displayedPerformedSets = nonPendingSets.slice(-MAX_PERFORMED_DISPLAY); // Show last few non-pending
  }


  return (
    <div className="my-3 p-3 bg-card dark:bg-gray-700 rounded-lg shadow h-72"> {/* Fixed height, no overflow-y-auto */}
      <h3 className="text-md font-semibold text-textPrimary mb-2 text-center sticky top-0 bg-card dark:bg-gray-700 z-10 py-1 -mt-3 -mx-3 px-3 pt-3 border-b border-gray-200 dark:border-gray-600">
        {currentExerciseLog.lift} - Sets Overview
      </h3>
      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        {/* Upcoming Sets Column */}
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-medium text-textSecondary border-b border-gray-300 dark:border-gray-600 pb-1">Upcoming</h4>
          {displayedUpcomingSets.length > 0 ? (
            <ul className="text-xs space-y-0.5">
              {displayedUpcomingSets.map((set) => (
                <li key={set.id} className={`py-0.5 leading-tight ${set.id === activeSetId ? 'font-bold text-primary dark:text-primary' : ''}`}>
                  {set.id === activeSetId && <span className="mr-1">➔</span>}
                  {set.type.charAt(0).toUpperCase() + set.type.slice(1)}: {set.actualWeight}kg x {set.targetReps} reps
                </li>
              ))}
            </ul>
          ) : (
             displayedPerformedSets.length > 0 && allSets.every(s => s.status !== 'pending') && <p className="text-xs text-textSecondary italic">All sets for this exercise completed.</p>
          )}
        </div>
        
        {/* Performed Sets Column */}
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-medium text-textSecondary border-b border-gray-300 dark:border-gray-600 pb-1">Performed</h4>
          {displayedPerformedSets.length > 0 ? (
            <ul className="text-xs space-y-0.5">
              {displayedPerformedSets.map(set => (
                <li key={set.id} className={`py-0.5 leading-tight ${set.status === 'skipped' ? 'opacity-60' : ''}`}>
                  {set.type.charAt(0).toUpperCase() + set.type.slice(1)}: {set.actualWeight}kg x {set.completedReps ?? '-'}/{set.targetReps}
                  <SetStatusIcon status={set.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-textSecondary italic">No sets performed yet for this exercise.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveWorkoutSetsDisplay;
