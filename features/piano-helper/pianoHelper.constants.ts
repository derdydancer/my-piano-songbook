
// features/piano-helper/pianoHelper.constants.ts
import { PianoKey } from '../../types';

// --- Piano Keyboard Visualizer Constants ---
export const WHITE_KEY_WIDTH = 30;
export const WHITE_KEY_HEIGHT = 120;
export const BLACK_KEY_WIDTH = 18;
export const BLACK_KEY_HEIGHT = 80;

export const KEY_COLOR_WHITE = '#FFFFFF';
export const KEY_COLOR_BLACK = '#333333';
export const KEY_COLOR_PRESSED_WHITE = '#AEDFF7'; // Light blue for pressed white key
export const KEY_COLOR_PRESSED_BLACK = '#3572A5'; // Darker blue for pressed black key
export const KEY_TEXT_COLOR_WHITE_KEY = '#4A5568'; // Gray for text on white key
export const KEY_TEXT_COLOR_BLACK_KEY = '#E2E8F0'; // Lighter gray for text on black key (if ever needed)
export const KEY_STROKE_COLOR = '#A0AEC0'; // Border color for keys

// Defines the colors for the octave indicator bar. Uses actual color values.
// Matched to Tailwind v3 default palette where possible for consistency
export const OCTAVE_BAR_COLOR_VALUES: string[] = [
  '#f87171', // red-400
  '#fb923c', // orange-400
  '#facc15', // amber-400 (Tailwind yellow-400 is very light, amber-400 used)
  '#a3e635', // lime-400
  '#4ade80', // green-400
  '#34d399', // emerald-400
  '#2dd4bf', // teal-400
  '#22d3ee', // cyan-400
  '#38bdf8', // sky-400
  '#60a5fa', // blue-400
  '#818cf8', // indigo-400
  '#a78bfa', // violet-400
  '#c084fc', // purple-400
  '#e879f9', // fuchsia-400
  '#f472b6', // pink-400
  '#fb7185', // rose-400
];
export const OCTAVE_BAR_TEXT_COLOR_VALUE = '#ffffff';
export const OCTAVE_BAR_DEFAULT_COLOR_VALUE = '#94a3b8'; // slate-400 as a fallback if needed

export const OCTAVE_BAR_WIDTH = 15; // px


// Defines the sequence of notes in an octave and if they have a black key after them
export const NOTE_SEQUENCE: { note: string; hasSharp: boolean }[] = [
  { note: 'C', hasSharp: true },
  { note: 'D', hasSharp: true },
  { note: 'E', hasSharp: false },
  { note: 'F', hasSharp: true },
  { note: 'G', hasSharp: true },
  { note: 'A', hasSharp: true },
  { note: 'B', hasSharp: false },
];

// Full note names including sharps/flats for parsing and mapping
export const ALL_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTE_TO_MIDI_OFFSET: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};


// Generates keys for a given octave range for the visualizer
export const generatePianoKeys = (startOctave: number, numOctaves: number): PianoKey[] => {
  const keys: PianoKey[] = [];
  let whiteKeyX = 0;
  const totalWhiteKeysInOctave = 7;

  for (let oct = startOctave; oct < startOctave + numOctaves; oct++) {
    NOTE_SEQUENCE.forEach((keyInfo, indexInOctave) => {
      // White Key
      const whiteKeyName = `${keyInfo.note}${oct}`;
      keys.push({
        note: keyInfo.note,
        octave: oct,
        type: 'white',
        x: whiteKeyX,
        y: 0,
        width: WHITE_KEY_WIDTH,
        height: WHITE_KEY_HEIGHT,
        isPressed: false,
        fullName: whiteKeyName
      });

      // Black Key (if applicable)
      if (keyInfo.hasSharp) {
        const blackKeyName = `${keyInfo.note}#${oct}`; // Or use flat names depending on convention
        keys.push({
          note: `${keyInfo.note}#`,
          octave: oct,
          type: 'black',
          x: whiteKeyX + WHITE_KEY_WIDTH - (BLACK_KEY_WIDTH / 2) -1, // Position relative to the white key
          y: 0,
          width: BLACK_KEY_WIDTH,
          height: BLACK_KEY_HEIGHT,
          isPressed: false,
          fullName: blackKeyName
        });
      }
      whiteKeyX += WHITE_KEY_WIDTH;
    });
  }
  return keys;
};

export const DEFAULT_PIANO_START_OCTAVE = 3;
export const DEFAULT_PIANO_NUM_OCTAVES = 2;
