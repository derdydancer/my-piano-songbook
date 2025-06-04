
import React from 'react';
import { PianoKey } from '../../../types';
import {
  WHITE_KEY_WIDTH, WHITE_KEY_HEIGHT, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT,
  KEY_COLOR_WHITE, KEY_COLOR_BLACK, KEY_COLOR_PRESSED_WHITE, KEY_COLOR_PRESSED_BLACK,
  KEY_TEXT_COLOR_WHITE_KEY, KEY_STROKE_COLOR, 
  OCTAVE_BAR_COLOR_VALUES, OCTAVE_BAR_TEXT_COLOR_VALUE, OCTAVE_BAR_DEFAULT_COLOR_VALUE,
  OCTAVE_BAR_WIDTH,
  generatePianoKeys
} from '../pianoHelper.constants';
import { getNoteMidiValue, getNoteFromMidiValue, MIDI_NOTE_NAMES_SHARP } from '../pianoHelper.utils';
import Button from '../../../components/common/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '../../../components/common/Icons';

interface PianoChordVisualizerProps {
  chordName: string;
  allVoicings: string[][];
  currentVoicingIndex: number;
  onVoicingChange: (newIndex: number) => void;
  numOctavesToDisplay: number; 
  fixedStartOctave: number;   
  noteDotColors?: Record<string, 'red' | 'black'>; 
}

const PianoChordVisualizer: React.FC<PianoChordVisualizerProps> = ({
  chordName,
  allVoicings,
  currentVoicingIndex,
  onVoicingChange,
  numOctavesToDisplay,
  fixedStartOctave,
  noteDotColors,
}) => {
  const currentNotesInChord = allVoicings[currentVoicingIndex] || [];

  const pianoKeys = React.useMemo(() =>
    generatePianoKeys(fixedStartOctave, numOctavesToDisplay),
    [fixedStartOctave, numOctavesToDisplay]
  );

  const getDisplayableNoteFullName = (noteNameWithOctave: string): string => {
    const match = noteNameWithOctave.match(/([A-Ga-g][#b]?)([0-9])/);
    if (!match) return noteNameWithOctave;

    let notePart = match[1];
    const octaveNum = parseInt(match[2], 10);

    const equivalentSharp: { [key: string]: string } = {
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    if (equivalentSharp[notePart]) {
      notePart = equivalentSharp[notePart];
    }
    return `${notePart}${octaveNum}`;
  };

  const displayableNotesInCurrentChord = currentNotesInChord.map(getDisplayableNoteFullName);

  const totalWhiteKeys = pianoKeys.filter(k => k.type === 'white').length;
  const keyboardSvgWidth = totalWhiteKeys * WHITE_KEY_WIDTH;
  const svgWidthWithOctaveBar = keyboardSvgWidth + OCTAVE_BAR_WIDTH + 5; // 5 for spacing
  const svgHeight = WHITE_KEY_HEIGHT; // Main keyboard height for keys
  const totalSvgHeight = svgHeight + 20; // For C note labels below

  const octaveBarColor = OCTAVE_BAR_COLOR_VALUES[fixedStartOctave % OCTAVE_BAR_COLOR_VALUES.length] || OCTAVE_BAR_DEFAULT_COLOR_VALUE;
  const octaveBarLabel = `${MIDI_NOTE_NAMES_SHARP[0]}${fixedStartOctave}`;


  const drawDot = (keyFullName: string, keyType: 'white' | 'black', keyX: number, keyY: number, keyWidth: number, keyHeight: number) => {
    const dotColor = noteDotColors?.[keyFullName] || 'black'; 
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
    <div className="my-1 p-1 bg-background dark:bg-gray-700 rounded-md shadow w-full">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-md font-semibold text-textPrimary truncate" title={chordName}>{chordName}</h4>
        {allVoicings.length > 1 && (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVoicingChange((currentVoicingIndex - 1 + allVoicings.length) % allVoicings.length)}
              aria-label="Previous voicing"
              disabled={allVoicings.length <= 1}
              className="p-1"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            <span className="text-xs text-textSecondary tabular-nums">
              {currentVoicingIndex + 1}/{allVoicings.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVoicingChange((currentVoicingIndex + 1) % allVoicings.length)}
              aria-label="Next voicing"
              disabled={allVoicings.length <= 1}
              className="p-1"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto pb-1">
        <svg
          width={svgWidthWithOctaveBar}
          height={totalSvgHeight}
          viewBox={`0 0 ${svgWidthWithOctaveBar} ${totalSvgHeight}`}
          aria-label={`Piano keyboard showing notes for ${chordName}`}
          role="img"
        >
          <title>Piano keyboard visualizing {chordName} - {currentNotesInChord.join(', ')}</title>
          
          <rect
            x="0"
            y="0"
            width={OCTAVE_BAR_WIDTH}
            height={svgHeight}
            fill={octaveBarColor} 
          />
          <text
            x={OCTAVE_BAR_WIDTH / 2}
            y={svgHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill={OCTAVE_BAR_TEXT_COLOR_VALUE}
            fontWeight="600"
            style={{ userSelect: 'none' }}
            transform={`rotate(-90 ${OCTAVE_BAR_WIDTH/2} ${svgHeight/2})`}
          >
            {octaveBarLabel}
          </text>

          <g transform={`translate(${OCTAVE_BAR_WIDTH + 5}, 0)`}>
            {pianoKeys.filter(key => key.type === 'white').map(key => {
              const isPressed = displayableNotesInCurrentChord.includes(key.fullName);
              let keyFillColor = KEY_COLOR_WHITE;
              if (isPressed) {
                keyFillColor = KEY_COLOR_PRESSED_WHITE;
              }
              return (
                <React.Fragment key={key.fullName}>
                  <rect
                    x={key.x}
                    y={key.y}
                    width={key.width}
                    height={key.height}
                    fill={keyFillColor}
                    stroke={KEY_STROKE_COLOR}
                    strokeWidth="1"
                    aria-label={`${key.fullName} ${isPressed ? 'pressed' : ''}`}
                  />
                  {isPressed && drawDot(key.fullName, 'white', key.x, key.y, key.width, key.height)}
                </React.Fragment>
              );
            })}
            {pianoKeys.filter(key => key.type === 'black').map(key => {
              const isPressed = displayableNotesInCurrentChord.includes(key.fullName);
              let keyFillColor = KEY_COLOR_BLACK;
              if (isPressed) {
                keyFillColor = KEY_COLOR_PRESSED_BLACK;
              }
              return (
                <React.Fragment key={key.fullName}>
                  <rect
                    x={key.x}
                    y={key.y}
                    width={key.width}
                    height={key.height}
                    fill={keyFillColor}
                    stroke={KEY_STROKE_COLOR}
                    strokeWidth="1"
                    aria-label={`${key.fullName} ${isPressed ? 'pressed' : ''}`}
                  />
                  {isPressed && drawDot(key.fullName, 'black', key.x, key.y, key.width, key.height)}
                </React.Fragment>
              );
            })}
            {pianoKeys.filter(key => key.type === 'white' && key.note === 'C').map(key => (
              <text
                key={`label-${key.fullName}`}
                x={key.x + key.width / 2}
                y={svgHeight + 15} 
                textAnchor="middle"
                fontSize="10"
                fill={KEY_TEXT_COLOR_WHITE_KEY}
                style={{ userSelect: 'none' }}
                aria-hidden="true"
              >
                {key.note}{key.octave}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default PianoChordVisualizer;
