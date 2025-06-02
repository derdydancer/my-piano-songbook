
import { StandardNote } from '../../types';

// Frequencies for standard EADGBe guitar tuning
// Using A4 = 440 Hz reference
// This list is currently NOT used by the automatic pitch detection logic
// but is kept for potential future "standard tuning mode" features.
export const TARGET_NOTES_EADGBe: StandardNote[] = [
  { name: "E2", frequency: 82.41 },   // Low E
  { name: "A2", frequency: 110.00 },  // A
  { name: "D3", frequency: 146.83 },  // D
  { name: "G3", frequency: 196.00 },  // G
  { name: "B3", frequency: 246.94 },  // B
  { name: "E4", frequency: 329.63 }   // High E
];


// A more comprehensive list for general note detection (subset)
// This list IS USED to determine the closest musical note to the detected pitch.
export const GUITAR_TUNER_STANDARD_NOTES: StandardNote[] = [
  // Octave 1
  { name: "E1", frequency: 41.20 }, { name: "F1", frequency: 43.65 }, { name: "F#1", frequency: 46.25 }, 
  { name: "G1", frequency: 49.00 }, { name: "G#1", frequency: 51.91 }, { name: "A1", frequency: 55.00 },
  { name: "A#1", frequency: 58.27 }, { name: "B1", frequency: 61.74 },
  // Octave 2
  { name: "C2", frequency: 65.41 }, { name: "C#2", frequency: 69.30 }, { name: "D2", frequency: 73.42 },
  { name: "D#2", frequency: 77.78 }, { name: "E2", frequency: 82.41 }, { name: "F2", frequency: 87.31 },
  { name: "F#2", frequency: 92.50 }, { name: "G2", frequency: 98.00 }, { name: "G#2", frequency: 103.83 },
  { name: "A2", frequency: 110.00 }, { name: "A#2", frequency: 116.54 }, { name: "B2", frequency: 123.47 },
  // Octave 3
  { name: "C3", frequency: 130.81 }, { name: "C#3", frequency: 138.59 }, { name: "D3", frequency: 146.83 },
  { name: "D#3", frequency: 155.56 }, { name: "E3", frequency: 164.81 }, { name: "F3", frequency: 174.61 },
  { name: "F#3", frequency: 185.00 }, { name: "G3", frequency: 196.00 }, { name: "G#3", frequency: 207.65 },
  { name: "A3", frequency: 220.00 }, { name: "A#3", frequency: 233.08 }, { name: "B3", frequency: 246.94 },
  // Octave 4
  { name: "C4", frequency: 261.63 }, { name: "C#4", frequency: 277.18 }, { name: "D4", frequency: 293.66 },
  { name: "D#4", frequency: 311.13 }, { name: "E4", frequency: 329.63 }, { name: "F4", frequency: 349.23 },
  { name: "F#4", frequency: 369.99 }, { name: "G4", frequency: 392.00 }, { name: "G#4", frequency: 415.30 },
  { name: "A4", frequency: 440.00 }, { name: "A#4", frequency: 466.16 }, { name: "B4", frequency: 493.88 },
  // Octave 5 (can be extended if needed for higher range detection)
  { name: "C5", frequency: 523.25 }, { name: "C#5", frequency: 554.37 }, { name: "D5", frequency: 587.33 },
  { name: "D#5", frequency: 622.25 }, { name: "E5", frequency: 659.25 }, { name: "F5", frequency: 698.46 },
  { name: "F#5", frequency: 739.99 }, { name: "G5", frequency: 783.99 }, { name: "G#5", frequency: 830.61 },
  { name: "A5", frequency: 880.00 }, { name: "A#5", frequency: 932.33 }, { name: "B5", frequency: 987.77 },
  // Octave 6
  { name: "C6", frequency: 1046.50 }
];


export const noteFromPitch = (frequency: number, noteTable: StandardNote[]): StandardNote => {
  let closestNote = noteTable[0];
  let minDifference = Infinity;

  for (const note of noteTable) {
    const difference = Math.abs(note.frequency - frequency);
    if (difference < minDifference) {
      minDifference = difference;
      closestNote = note;
    }
  }
  return closestNote;
};

export const centsOffFromPitch = (frequency: number, targetFrequency: number): number => {
  if (frequency <= 0 || targetFrequency <= 0) return 0; // Avoid log errors with non-positive frequencies
  return 1200 * Math.log2(frequency / targetFrequency);
};
