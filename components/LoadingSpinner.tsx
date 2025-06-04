
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

/**
 * A simple loading spinner component.
 *
 * @remarks
 * Used by:
 * - Piano Chord Helper: AI analysis loading state.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', message }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-primary border-t-transparent`}
      ></div>
      {message && <p className="mt-2 text-sm text-textSecondary">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
