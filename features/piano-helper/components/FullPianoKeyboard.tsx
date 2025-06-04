
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
  idSuffix?: string;
  noteDotColors?: Record<string, 'red' | 'black'>; // Prop to specify dot colors
}

const GRID_VIEW_START_OCTAVE = 2;
const GRID_VIEW_NUM_OCTAVES = 5;

const FullPianoKeyboard: React.FC<FullPianoKeyboardProps> = ({
  highlightedNotes,
  idSuffix = '',
  noteDotColors,
}) => {

  const pianoKeys = React.useMemo(() =>
    generatePianoKeys(GRID_VIEW_START_OCTAVE, GRID_VIEW_NUM_OCTAVES),
    []
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
  const viewBoxHeight = WHITE_KEY_HEIGHT + 25;

  const drawDot = (keyFullName: string, keyType: 'white' | 'black', keyX: number, keyY: number, keyWidth: number, keyHeight: number) => {
    const dotColor = noteDotColors?.[keyFullName] || 'black'; // Default to black if not specified
    const radius = keyType === 'white' ? 3 : 2.5;
    let cx = keyX + keyWidth / 2;
    let cy = keyType === 'white' ? keyY + keyHeight - radius - 8 : keyY + keyHeight * 0.66;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={dotColor === 'red' ? 'red' : 'black'}
        stroke="white"
        strokeWidth="0.5"
      />
    );
  };


  return (
    <div className="w-full h-auto">
      <svg
        width="100%"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMinYMid meet"
        aria-label={`Piano keyboard segment from ${MIDI_NOTE_NAMES_SHARP[0]}${GRID_VIEW_START_OCTAVE} to ${MIDI_NOTE_NAMES_SHARP[11]}${GRID_VIEW_START_OCTAVE + GRID_VIEW_NUM_OCTAVES - 1}`}
      >
        <g>
          {pianoKeys.filter(key => key.type === 'white').map(key => {
            const isPressed = displayableHighlightedNotes.includes(key.fullName);
            return (
              <React.Fragment key={`${key.fullName}-${idSuffix}-full`}>
                <rect
                  x={key.x}
                  y={key.y}
                  width={key.width}
                  height={key.height}
                  fill={isPressed ? KEY_COLOR_PRESSED_WHITE : KEY_COLOR_WHITE}
                  stroke={KEY_STROKE_COLOR}
                  strokeWidth="0.5"
                />
                {isPressed && drawDot(key.fullName, 'white', key.x, key.y, key.width, key.height)}
              </React.Fragment>
            );
          })}
          {pianoKeys.filter(key => key.type === 'black').map(key => {
            const isPressed = displayableHighlightedNotes.includes(key.fullName);
            return (
              <React.Fragment key={`${key.fullName}-${idSuffix}-full`}>
                <rect
                  x={key.x}
                  y={key.y}
                  width={key.width}
                  height={key.height}
                  fill={isPressed ? KEY_COLOR_PRESSED_BLACK : KEY_COLOR_BLACK}
                  stroke={KEY_STROKE_COLOR}
                  strokeWidth="0.5"
                />
                {isPressed && drawDot(key.fullName, 'black', key.x, key.y, key.width, key.height)}
              </React.Fragment>
            );
          })}
          {pianoKeys.filter(key => key.type === 'white' && key.note === 'C').map(key => (
            <text
              key={`label-oct-${key.fullName}-${idSuffix}-full`}
              x={key.x + key.width / 2}
              y={key.height + 18}
              textAnchor="middle"
              fontSize="10px"
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
