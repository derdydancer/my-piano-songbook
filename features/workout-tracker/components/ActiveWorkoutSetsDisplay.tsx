
import React from 'react';
import { ExerciseLog, SetDetails } from '../../../types';
import { CheckCircleIcon, XCircleIcon, ForwardIcon } from '../../../components/common/Icons';

interface ActiveWorkoutSetsDisplayProps {
  currentExerciseLog: ExerciseLog;
  activeSetId: string; // ID of the currently active set
  totalSetsInExercise: number;
}

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

const ActiveWorkoutSetsDisplay: React.FC<ActiveWorkoutSetsDisplayProps> = ({ currentExerciseLog, activeSetId, totalSetsInExercise }) => {
  if (!currentExerciseLog) return null;

  const performedSets: SetDetails[] = [];
  const upcomingSets: SetDetails[] = [];
  let activeSetEncountered = false;

  currentExerciseLog.sets.forEach(set => {
    if (set.id === activeSetId) {
      activeSetEncountered = true;
      upcomingSets.push(set); // Active set is the first in upcoming
    } else if (activeSetEncountered) {
      upcomingSets.push(set);
    } else {
      performedSets.push(set);
    }
  });
  
  if (!activeSetEncountered && currentExerciseLog.sets.length > 0) {
      currentExerciseLog.sets.forEach(set => {
          if(set.status === 'pending') upcomingSets.push(set);
          else performedSets.push(set);
      })
  }

  const upcomingEmptyRows = Math.max(0, totalSetsInExercise - upcomingSets.length);
  const performedEmptyRows = Math.max(0, totalSetsInExercise - performedSets.length);

  const renderEmptyRows = (count: number, side: string) => {
    return Array.from({ length: count }).map((_, index) => (
      <li key={`empty-${side}-${index}`} className="py-0.5 text-transparent select-none h-[1.125rem] sm:h-[1.25rem] leading-tight">
        &nbsp; {/* Non-breaking space to maintain height */}
      </li>
    ));
  };


  return (
    <div className="my-3 p-3 bg-card dark:bg-gray-700 rounded-lg shadow h-60 overflow-y-auto"> {/* Added h-60 and overflow-y-auto */}
      <h3 className="text-md font-semibold text-textPrimary mb-2 text-center sticky top-0 bg-card dark:bg-gray-700 z-10 py-1">
        {currentExerciseLog.lift} - Sets Overview
      </h3>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Upcoming Sets Column (Now on Left) */}
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-medium text-textSecondary border-b border-gray-300 dark:border-gray-600 pb-1">Upcoming</h4>
          {upcomingSets.length > 0 || upcomingEmptyRows > 0 ? (
            <ul className="text-xs">
              {upcomingSets.map((set) => (
                <li key={set.id} className={`py-0.5 leading-tight ${set.id === activeSetId ? 'font-bold text-primary dark:text-primary' : ''}`}>
                  {set.id === activeSetId && <span className="mr-1">➔</span>}
                  {set.type.charAt(0).toUpperCase() + set.type.slice(1)}: {set.actualWeight}kg x {set.targetReps} reps
                </li>
              ))}
              {renderEmptyRows(upcomingEmptyRows, 'upcoming')}
            </ul>
          ) : (
             performedSets.length > 0 && <p className="text-xs text-textSecondary italic">All sets for this exercise completed.</p>
          )}
        </div>
        
        {/* Performed Sets Column (Now on Right) */}
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-medium text-textSecondary border-b border-gray-300 dark:border-gray-600 pb-1">Performed</h4>
          {performedSets.length > 0 || performedEmptyRows > 0 ? (
            <ul className="text-xs">
              {performedSets.map(set => (
                <li key={set.id} className={`py-0.5 leading-tight ${set.status === 'skipped' ? 'opacity-60' : ''}`}>
                  {set.type.charAt(0).toUpperCase() + set.type.slice(1)}: {set.actualWeight}kg x {set.completedReps ?? '-'}/{set.targetReps}
                  <SetStatusIcon status={set.status} />
                </li>
              ))}
              {renderEmptyRows(performedEmptyRows, 'performed')}
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
