import React from 'react';
import { ExerciseLog } from '../../../types';

interface ExerciseProgressBarProps {
  exerciseLog: ExerciseLog;
}

const ExerciseProgressBar: React.FC<ExerciseProgressBarProps> = ({ exerciseLog }) => {
  const totalSets = exerciseLog.sets.length;
  const completedSets = exerciseLog.sets.filter(
    s => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped'
  ).length;

  const progressPercentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div className="my-2">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-sm font-medium text-textPrimary">{exerciseLog.lift}</h4>
        <span className="text-xs text-textSecondary">{completedSets} / {totalSets} sets</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
        <div
          className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${exerciseLog.lift} progress`}
        ></div>
      </div>
    </div>
  );
};

export default ExerciseProgressBar;
