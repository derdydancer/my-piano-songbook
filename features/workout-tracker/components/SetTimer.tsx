import React, { useState, useEffect, useCallback } from 'react';
import Button from '../../../components/common/Button';
import { PlayIcon, PauseIcon, RefreshCwIcon } from '../../../components/common/Icons'; // Assuming these exist or can be added

interface SetTimerProps {
  setKey: string; // Used to reset timer when set changes
  defaultDurationSeconds: number;
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const SetTimer: React.FC<SetTimerProps> = ({ setKey, defaultDurationSeconds }) => {
  const [timeLeft, setTimeLeft] = useState(defaultDurationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = React.useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(defaultDurationSeconds);
    setIsRunning(false);
  }, [clearTimer, defaultDurationSeconds]);

  useEffect(() => {
    // Reset timer when setKey (current set ID) or default duration changes
    resetTimer();
  }, [setKey, defaultDurationSeconds, resetTimer]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = window.setInterval(() => { // Use window.setInterval for clarity in browser context
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearTimer();
            setIsRunning(false);
            // Optionally play a sound or show notification
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (!isRunning || timeLeft === 0) {
      clearTimer();
    }
    return clearTimer; // Cleanup on unmount or re-run
  }, [isRunning, timeLeft, clearTimer]);

  const handleTogglePlayPause = () => {
    if (timeLeft === 0 && !isRunning) { // If timer finished and user hits play, reset it
      resetTimer();
      // Consider auto-starting after reset if that's desired UX
      // setIsRunning(true); 
    } else {
      setIsRunning(prev => !prev);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2 my-3 p-3 bg-background dark:bg-gray-700 rounded-md">
      <div className={`text-4xl font-mono font-bold ${timeLeft === 0 ? 'text-red-500' : 'text-textPrimary'}`}>
        {formatTime(timeLeft)}
      </div>
      <div className="flex space-x-2">
        <Button onClick={handleTogglePlayPause} size="sm" variant={isRunning ? "secondary" : "primary"}>
          {isRunning ? <PauseIcon className="w-4 h-4 mr-1" /> : <PlayIcon className="w-4 h-4 mr-1" />}
          {isRunning ? 'Pause' : timeLeft === 0 ? 'Restart' : 'Start'}
        </Button>
        <Button onClick={resetTimer} size="sm" variant="ghost" disabled={timeLeft === defaultDurationSeconds && !isRunning}>
          <RefreshCwIcon className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
};

export default SetTimer;
