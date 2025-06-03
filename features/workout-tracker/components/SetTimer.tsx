import React, { useState, useEffect, useCallback } from 'react';
import Button from '../../../components/common/Button';
import { PlayIcon, PauseIcon, RefreshCwIcon } from '../../../components/common/Icons'; 

interface SetTimerProps {
  setKey: string; 
  defaultDurationSeconds: number;
  initialTimerState?: { timeLeft: number; isRunning: boolean };
  onTimerUpdate?: (timeLeft: number, isRunning: boolean) => void;
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const SetTimer: React.FC<SetTimerProps> = ({ setKey, defaultDurationSeconds, initialTimerState, onTimerUpdate }) => {
  const [timeLeft, setTimeLeft] = useState(initialTimerState?.timeLeft ?? defaultDurationSeconds);
  const [isRunning, setIsRunning] = useState(initialTimerState?.isRunning ?? false);
  const timerRef = React.useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    const newTimeLeft = defaultDurationSeconds;
    const newIsRunning = false;
    setTimeLeft(newTimeLeft);
    setIsRunning(newIsRunning);
    if (onTimerUpdate) {
        onTimerUpdate(newTimeLeft, newIsRunning);
    }
  }, [clearTimer, defaultDurationSeconds, onTimerUpdate]);

  useEffect(() => {
    // Reset timer when setKey (current set ID) changes OR if initial state prop changes (e.g., loaded from persisted)
    if (initialTimerState) {
        setTimeLeft(initialTimerState.timeLeft);
        setIsRunning(initialTimerState.isRunning);
    } else {
        resetTimer();
    }
  }, [setKey, initialTimerState, resetTimer]);


  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prevTime => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            clearTimer();
            setIsRunning(false);
            if (onTimerUpdate) onTimerUpdate(0, false);
            return 0;
          }
          if (onTimerUpdate) onTimerUpdate(newTime, true);
          return newTime;
        });
      }, 1000);
    } else if (!isRunning || timeLeft === 0) {
      clearTimer();
      // Ensure final state is propagated if timer stops itself
      if (timeLeft === 0 && isRunning && onTimerUpdate) onTimerUpdate(0, false);
    }
    return clearTimer;
  }, [isRunning, timeLeft, clearTimer, onTimerUpdate]);

  const handleTogglePlayPause = () => {
    const newIsRunning = !isRunning;
    if (timeLeft === 0 && !newIsRunning) { // If timer finished and user hits play, reset it
      const newTimeLeft = defaultDurationSeconds;
      setTimeLeft(newTimeLeft);
      setIsRunning(true); // Auto-start after reset
      if (onTimerUpdate) onTimerUpdate(newTimeLeft, true);
    } else {
      setIsRunning(newIsRunning);
      if (onTimerUpdate) onTimerUpdate(timeLeft, newIsRunning);
    }
  };
  
  const handleResetClick = () => {
      resetTimer(); // resetTimer already calls onTimerUpdate
  }

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
        <Button onClick={handleResetClick} size="sm" variant="ghost" disabled={timeLeft === defaultDurationSeconds && !isRunning}>
          <RefreshCwIcon className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
};

export default SetTimer;