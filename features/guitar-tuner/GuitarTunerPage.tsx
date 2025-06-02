
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TuningInfo } from '../../types';
import { MicrophoneIcon, InformationCircleIcon } from '../../components/common/Icons';
import Button from '../../components/common/Button';
import { GUITAR_TUNER_STANDARD_NOTES, noteFromPitch, centsOffFromPitch } from './guitarTuner.constants';

const SMOOTHING_FACTOR = 0.3; // For exponential smoothing of cents deviation (0.1 more smoothing, 0.9 less)
const MIN_CLARITY_THRESHOLD = 0.7; // Minimum correlation quality to consider a note "clear"

const GuitarTunerPage: React.FC = () => {
  const [tuningInfo, setTuningInfo] = useState<TuningInfo>({
    detectedFrequency: null,
    targetNote: null,
    targetFrequency: null,
    deviationInCents: null,
    clarity: 0,
  });
  const [smoothedDeviation, setSmoothedDeviation] = useState<number | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Float32Array | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);


  const stopListening = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
    }
    // Stop all tracks on the stream
    if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
    }
    // Closing the AudioContext can be deferred or handled if re-creating, to avoid issues.
    // For robust restart, ensure it's closed if no longer needed or re-initialized properly.
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
       // audioContextRef.current.close(); // Consider implications for quick restart
       // audioContextRef.current = null;
    }
    setIsListening(false);
    setTuningInfo({ detectedFrequency: null, targetNote: null, targetFrequency: null, deviationInCents: null, clarity: 0 });
    setSmoothedDeviation(null);
  }, []);


  const processAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !audioContextRef.current || audioContextRef.current.state === 'closed') {
      if (isListening) animationFrameRef.current = requestAnimationFrame(processAudio);
      return;
    }

    const buffer = dataArrayRef.current;
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    const sampleRate = audioContextRef.current.sampleRate;
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / buffer.length);

    if (rms < 0.015) { // Increased RMS threshold for noise gating
      setTuningInfo(prev => ({ ...prev, detectedFrequency: null, targetNote: null, deviationInCents: null, clarity: rms / 0.015 }));
      setSmoothedDeviation(null);
      if (isListening) animationFrameRef.current = requestAnimationFrame(processAudio);
      return;
    }
    
    // Autocorrelation
    let bestOffset = -1;
    let bestCorrelation = 0;
    const correlations = new Array(buffer.length).fill(0);

    // More constrained search range for guitar fundamental frequencies
    // Min freq ~70Hz (low E string is ~82Hz, but allow a bit lower) => max_offset = sampleRate / 70
    // Max freq ~700Hz (higher harmonics or very high notes) => min_offset = sampleRate / 700
    const minOffset = Math.floor(sampleRate / 700); 
    const maxOffset = Math.min(Math.floor(sampleRate / 70), buffer.length -1);


    for (let offset = minOffset; offset < maxOffset; offset++) {
      let corr = 0;
      for (let i = 0; i < buffer.length - offset; i++) {
        corr += buffer[i] * buffer[i + offset];
      }
      correlations[offset] = corr / (buffer.length - offset); // Normalize by window size
      if (correlations[offset] > bestCorrelation) {
        bestCorrelation = correlations[offset];
        bestOffset = offset;
      }
    }
    
    // Normalize bestCorrelation by RMS to get a value somewhat independent of volume
    const normalizedClarity = rms > 0 ? bestCorrelation / (rms*rms) : 0;

    let detectedFrequency: number | null = null;
    if (normalizedClarity > 0.1 && bestOffset > 0) { // Adjusted clarity threshold
        // Parabolic interpolation for more precise frequency
        if (bestOffset > 0 && bestOffset < correlations.length - 1) {
            const d1 = correlations[bestOffset - 1];
            const d2 = correlations[bestOffset];
            const d3 = correlations[bestOffset + 1];
            const correction = (d3 - d1) / (2 * (2 * d2 - d1 - d3));
            if (Math.abs(correction) < 1) { // Ensure correction is within reasonable bounds
                 detectedFrequency = sampleRate / (bestOffset + correction);
            } else {
                 detectedFrequency = sampleRate / bestOffset;
            }
        } else {
            detectedFrequency = sampleRate / bestOffset;
        }
    }


    if (detectedFrequency && detectedFrequency > 60 && detectedFrequency < 1300) { // Plausible guitar note range (incl. harmonics)
      const closestOverallNote = noteFromPitch(detectedFrequency, GUITAR_TUNER_STANDARD_NOTES);
      const targetNoteName = closestOverallNote.name.slice(0, -1); // Remove octave for general target
      const targetFrequency = closestOverallNote.frequency;
      const deviation = centsOffFromPitch(detectedFrequency, targetFrequency);

      setTuningInfo({
        detectedFrequency: parseFloat(detectedFrequency.toFixed(1)),
        targetNote: targetNoteName,
        targetFrequency: parseFloat(targetFrequency.toFixed(1)),
        deviationInCents: parseFloat(deviation.toFixed(1)),
        clarity: normalizedClarity,
      });
      
      setSmoothedDeviation(prevSmoothed => {
        if (prevSmoothed === null) return deviation;
        return SMOOTHING_FACTOR * deviation + (1 - SMOOTHING_FACTOR) * prevSmoothed;
      });

    } else {
      setTuningInfo(prev => ({ ...prev, detectedFrequency: null, targetNote: null, deviationInCents: null, clarity: normalizedClarity }));
      setSmoothedDeviation(null);
    }

    if (isListening) animationFrameRef.current = requestAnimationFrame(processAudio);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]); // Removed GUITAR_TUNER_STANDARD_NOTES from deps as it's constant


  const startListening = useCallback(async () => {
    setError(null);
    try {
      // Ensure any existing AudioContext is properly closed or reused
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close(); // Ensure clean state before creating new
      }
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
          noiseSuppression: true,
          echoCancellation: false,
          autoGainControl: true, // Enable for better signal consistency
      }, video: false });
      micStreamRef.current = stream; // Store stream to stop tracks later
      setPermissionGranted(true);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096; // Larger FFT for better low-frequency resolution
      analyserRef.current.smoothingTimeConstant = 0.1; // Some smoothing on analyser
      dataArrayRef.current = new Float32Array(analyserRef.current.fftSize);
      
      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current.connect(analyserRef.current);
      
      setIsListening(true); // Set isListening before starting animation frame
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      animationFrameRef.current = requestAnimationFrame(processAudio);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied or not available. Please enable it in your browser settings and try again.");
      setPermissionGranted(false);
      setIsListening(false);
    }
  }, [processAudio]);

  useEffect(() => {
    // This effect now correctly manages the processAudio loop based on isListening state
    if (isListening && !animationFrameRef.current && audioContextRef.current?.state === 'running') {
        animationFrameRef.current = requestAnimationFrame(processAudio);
    } else if (!isListening && animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    // Cleanup function for when component unmounts or isListening changes from true to false
    return () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };
  }, [isListening, processAudio]);


  useEffect(() => {
    // Final cleanup on unmount
    return () => {
      stopListening();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("Error closing AudioContext on unmount:", e));
      }
    };
  }, [stopListening]);
  
  const displayCents = smoothedDeviation !== null ? smoothedDeviation : tuningInfo.deviationInCents;
  const displayClarity = tuningInfo.clarity ?? 0;
  const isSignalClear = displayClarity >= MIN_CLARITY_THRESHOLD && tuningInfo.targetNote !== null;

  const getMeterColor = (cents: number | null): string => {
    if (!isSignalClear || cents === null) return 'bg-gray-300 dark:bg-gray-600';
    const absCents = Math.abs(cents);
    if (absCents <= 5) return 'bg-green-500';   // Green for in-tune
    if (absCents <= 15) return 'bg-yellow-500'; // Yellow for slightly off
    return 'bg-red-500';                      // Red for very off
  };

  const getArmRotation = (cents: number | null): number => {
    if (!isSignalClear || cents === null) return 0;
    // Max rotation e.g., -45deg for -50 cents, +45deg for +50 cents
    return Math.max(-45, Math.min(45, cents * 0.9)); 
  };

  return (
    <div className="p-4 space-y-6 text-center">
      <h1 className="text-2xl font-bold text-textPrimary">Guitar Tuner</h1>

      {!isListening && permissionGranted !== false && (
        <Button onClick={startListening} size="lg" leftIcon={<MicrophoneIcon className="w-6 h-6" />} aria-label="Start Tuning">
          Start Tuning
        </Button>
      )}
      {isListening && (
        <Button onClick={stopListening} size="lg" variant="danger" aria-label="Stop Tuning">
          Stop Tuning
        </Button>
      )}

      {error && (
        <div className="p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md" role="alert">
          <InformationCircleIcon className="w-5 h-5 inline mr-2" />
          {error}
        </div>
      )}
      {permissionGranted === false && !error && (
         <div className="p-3 bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300 rounded-md" role="status">
          <InformationCircleIcon className="w-5 h-5 inline mr-2" />
          Microphone permission is required for the tuner to work.
        </div>
      )}


      <div className={`mt-6 p-6 bg-card rounded-xl shadow-xl max-w-sm mx-auto transition-opacity duration-300 ${isListening && !isSignalClear && displayClarity < 0.3 ? 'opacity-50' : 'opacity-100'}`}>
        <div 
          className="relative w-64 h-32 mx-auto mb-6" 
          role="meter" 
          aria-valuemin={-50} 
          aria-valuemax={50} 
          aria-valuenow={displayCents ?? 0}
          aria-valuetext={isSignalClear && displayCents !== null ? `${displayCents.toFixed(0)} cents ${displayCents > 0 ? 'sharp' : 'flat'}` : (isListening ? 'Detecting...' : 'Idle')}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
           <div 
              className={`absolute left-1/2 top-1/2 w-1 h-8 -translate-x-1/2 -translate-y-1/2 transition-colors duration-200 ${getMeterColor(displayCents)}`}
              style={{
                  boxShadow: `0 0 15px 2px ${getMeterColor(displayCents)}`
              }}
            ></div>
          <div
            className="absolute left-1/2 top-0 w-1 h-16 bg-textPrimary origin-bottom transition-transform duration-100 ease-linear"
            style={{ transform: `translateX(-50%) rotate(${getArmRotation(displayCents)}deg)` }}
            aria-hidden="true"
          ></div>
          <div className="absolute left-1/2 top-1/2 w-2 h-2 bg-textSecondary rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        <div className="text-6xl font-bold text-primary mb-2 min-h-[72px]" aria-live="polite">
          {isSignalClear ? tuningInfo.targetNote : (isListening ? '...' : '--')}
        </div>
        <div className={`text-2xl font-semibold mb-4 min-h-[36px] ${!isSignalClear || displayCents === null ? 'text-textSecondary' : (Math.abs(displayCents) <= 5 ? 'text-green-500' : (Math.abs(displayCents) <=15 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500'))}`}>
          {isSignalClear && displayCents !== null ? `${displayCents > 0 ? '+' : ''}${displayCents.toFixed(0)} ¢` : (isListening ? '...' : '---')}
        </div>
        
        <div className="text-sm text-textSecondary space-y-1">
          <p>Detected: {isSignalClear && tuningInfo.detectedFrequency !== null ? `${tuningInfo.detectedFrequency} Hz` : '-- Hz'}</p>
          <p>Target Freq: {isSignalClear && tuningInfo.targetFrequency !== null ? `${tuningInfo.targetFrequency} Hz` : '-- Hz'}</p>
          <p>Clarity: {isListening ? `${(displayClarity * 100).toFixed(0)}%` : '--%'}</p>
        </div>
      </div>
        {isListening && !isSignalClear && displayClarity < MIN_CLARITY_THRESHOLD && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-3" role="status">
                {displayClarity < 0.2 ? "Low signal or noisy. Play louder/clearer." : "Trying to detect a clear note..."}
            </p>
        )}
    </div>
  );
};

export default GuitarTunerPage;

