
import React from 'react';
import { PianoKey } from '../../../types';
import {
  WHITE_KEY_WIDTH, WHITE_KEY_HEIGHT, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT,
  KEY_COLOR_WHITE, KEY_COLOR_BLACK, KEY_COLOR_PRESSED_WHITE, KEY_COLOR_PRESSED_BLACK,
  KEY_TEXT_COLOR_WHITE_KEY, KEY_STROKE_COLOR,
  generatePianoKeys, NOTE_SEQUENCE
} from '../pianoHelper.constants';
import { getNoteMidiValue, MIDI_NOTE_NAMES_SHARP } from '../pianoHelper.utils';

interface FullPianoKeyboardProps {
  highlightedNotes: string[];
  idSuffix?: string; // For unique IDs if multiple keyboards are on a page
}

const GRID_VIEW_START_OCTAVE = 2; // e.g., C2
const GRID_VIEW_NUM_OCTAVES = 5;  // e.g., C2-B6 (5 octaves)

const FullPianoKeyboard: React.FC<FullPianoKeyboardProps> = ({
  highlightedNotes,
  idSuffix = ''
}) => {

  const pianoKeys = React.useMemo(() =>
    generatePianoKeys(GRID_VIEW_START_OCTAVE, GRID_VIEW_NUM_OCTAVES),
    [] // Static generation for the grid view
  );
  
  const displayableHighlightedNotes = React.useMemo(() => {
    return highlightedNotes.map(note => {
      const midi = getNoteMidiValue(note);
      if (midi === null) return null; 
      
      const keyOctave = Math.floor(midi / 12) - 1;
      const noteIndex = midi % 12;
      const keyNoteName = MIDI_NOTE_NAMES_SHARP[noteIndex];

      if (keyOctave >= GRID_VIEW_START_OCTAVE && keyOctave < GRID_VIEW_START_OCTAVE + GRID_VIEW_NUM_OCTAVES) {
        return `${keyNoteName}${keyOctave}`;
      }
      return null; 
    }).filter(note => note !== null) as string[];
  }, [highlightedNotes]);


  const totalWhiteKeysInSegment = NOTE_SEQUENCE.length * GRID_VIEW_NUM_OCTAVES;
  const viewBoxWidth = totalWhiteKeysInSegment * WHITE_KEY_WIDTH;
  const viewBoxHeight = WHITE_KEY_HEIGHT + 25; // +25 for octave labels at the bottom

  return (
    // The parent container in SongGridView will manage width distribution.
    // This SVG will scale to 100% of its container's width.
    <div className="w-full h-auto"> 
      <svg
        width="100%" // Takes full width of its parent
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMinYMid meet" 
        aria-label={`Piano keyboard segment from ${MIDI_NOTE_NAMES_SHARP[0]}${GRID_VIEW_START_OCTAVE} to ${MIDI_NOTE_NAMES_SHARP[11]}${GRID_VIEW_START_OCTAVE + GRID_VIEW_NUM_OCTAVES -1}`}
      >
        <g>
          {pianoKeys.filter(key => key.type === 'white').map(key => {
            const isPressed = displayableHighlightedNotes.includes(key.fullName);
            return (
              <rect
                key={`${key.fullName}-${idSuffix}-full`}
                x={key.x}
                y={key.y}
                width={key.width}
                height={key.height}
                fill={isPressed ? KEY_COLOR_PRESSED_WHITE : KEY_COLOR_WHITE}
                stroke={KEY_STROKE_COLOR}
                strokeWidth="0.5" // Relative to viewBox, might appear thinner when scaled.
              />
            );
          })}
          {pianoKeys.filter(key => key.type === 'black').map(key => {
            const isPressed = displayableHighlightedNotes.includes(key.fullName);
            return (
              <rect
                key={`${key.fullName}-${idSuffix}-full`}
                x={key.x}
                y={key.y}
                width={key.width}
                height={key.height}
                fill={isPressed ? KEY_COLOR_PRESSED_BLACK : KEY_COLOR_BLACK}
                stroke={KEY_STROKE_COLOR}
                strokeWidth="0.5"
              />
            );
          })}
          {/* Octave Labels (only for C notes) */}
          {pianoKeys.filter(key => key.type === 'white' && key.note === 'C').map(key => (
            <text
              key={`label-oct-${key.fullName}-${idSuffix}-full`}
              x={key.x + key.width / 2}
              y={key.height + 18} // Position below the keys
              textAnchor="middle"
              fontSize="10px" // Fixed font size in viewBox units; will scale with SVG
              fill={KEY_TEXT_COLOR_WHITE_KEY}
              className="select-none pointer-events-none"
            >
              {key.note}{key.octave}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default FullPianoKeyboard;
