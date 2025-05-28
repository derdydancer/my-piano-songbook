import React, { useState } from 'react';
import { useAppData } from '../../contexts/AppDataContext';
import { WorkoutSession, ExerciseLog, SetDetails } from '../../types';
import { ChevronDownIcon, ChevronUpIcon } from '../../components/common/Icons';
import { formatPlateCombination } from '../../utils/workoutHelper';


const SetDetailItem: React.FC<{set: SetDetails}> = ({set}) => {
    let statusColor = "text-textSecondary";
    if (set.status === 'completed') statusColor = "text-green-500 dark:text-green-400";
    if (set.status === 'failed') statusColor = "text-red-500 dark:text-red-400";
    if (set.status === 'skipped') statusColor = "text-yellow-500 dark:text-yellow-400";

    return (
        <li className="ml-4 text-xs py-0.5">
            <span className={statusColor}>
                {set.type.charAt(0).toUpperCase() + set.type.slice(1)}: {set.actualWeight || set.targetWeight}kg x {set.status === 'completed' ? set.completedReps || set.targetReps : set.completedReps ?? '-'}/{set.targetReps} reps
                ({set.status})
            </span>
            {set.plateConfiguration && <span className="text-gray-400 dark:text-gray-500 text-xxs"> ({formatPlateCombination(set.plateConfiguration)})</span>}
        </li>
    );
};

const ExerciseDetailItem: React.FC<{exerciseLog: ExerciseLog}> = ({exerciseLog}) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <li className="py-1">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <span className="font-medium text-textPrimary">{exerciseLog.lift} - Workset: {exerciseLog.worksetWeight}kg</span>
                {isOpen ? <ChevronUpIcon className="w-4 h-4 text-textSecondary"/> : <ChevronDownIcon className="w-4 h-4 text-textSecondary"/>}
            </div>
            {isOpen && (
                <ul className="mt-1 space-y-0.5">
                    {exerciseLog.sets.map(set => <SetDetailItem key={set.id} set={set} />)}
                </ul>
            )}
        </li>
    );
};


const WorkoutSessionCard: React.FC<{ session: WorkoutSession }> = ({ session }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-card p-4 rounded-lg shadow">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div>
          <h3 className="text-lg font-semibold text-primary">{session.workoutDefinitionName}</h3>
          <p className="text-sm text-textSecondary">{new Date(session.date).toLocaleDateString()} - {new Date(session.date).toLocaleTimeString()}</p>
        </div>
        {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-textSecondary"/> : <ChevronDownIcon className="w-5 h-5 text-textSecondary"/>}
      </div>
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold text-textPrimary mb-1">Exercises:</h4>
          <ul className="space-y-1 text-sm">
            {session.exercises.map((exLog, index) => (
              <ExerciseDetailItem key={`${exLog.lift}-${index}`} exerciseLog={exLog} />
            ))}
          </ul>
          {session.notes && (
            <div className="mt-2">
              <h5 className="text-sm font-semibold text-textPrimary">Notes:</h5>
              <p className="text-xs text-textSecondary whitespace-pre-wrap">{session.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const WorkoutHistoryPage: React.FC = () => {
  const { getAllWorkoutSessions } = useAppData();
  const workoutSessions = getAllWorkoutSessions();

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-textPrimary">Workout History</h1>
      {workoutSessions.length === 0 ? (
        <p className="text-center text-textSecondary py-10">
          No workouts recorded yet. Go to the "Train" tab to start your first session!
        </p>
      ) : (
        <div className="space-y-4">
          {workoutSessions.map(session => (
            <WorkoutSessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkoutHistoryPage;