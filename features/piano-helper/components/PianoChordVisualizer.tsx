import React from 'react';
import { PianoKey } from '../../../types';
import {
  WHITE_KEY_WIDTH, WHITE_KEY_HEIGHT, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT,
  KEY_COLOR_WHITE, KEY_COLOR_BLACK, KEY_COLOR_PRESSED_WHITE, KEY_COLOR_PRESSED_BLACK,
  KEY_TEXT_COLOR_WHITE_KEY, KEY_STROKE_COLOR,
  generatePianoKeys, DEFAULT_PIANO_START_OCTAVE, DEFAULT_PIANO_NUM_OCTAVES, ALL_NOTE_NAMES,
  KEY_COLOR_HIGHLIGHT_NEXT_CHORD_WHITE, KEY_COLOR_HIGHLIGHT_NEXT_CHORD_BLACK
} from '../pianoHelper.constants';
import { getNoteMidiValue, getNoteFromMidiValue, MIDI_NOTE_NAMES_SHARP, calculateRequiredOctavesAndStartForVoicing } from '../pianoHelper.utils';
import Button from '../../../components/common/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '../../../components/common/Icons';

interface PianoChordVisualizerProps {
  chordName: string;
  allVoicings: string[][];
  currentVoicingIndex: number;
  onVoicingChange: (newIndex: number) => void;
  numOctavesToDisplay?: number;
  nextChordNotes?: string[]; // Notes of the next chord in a progression
  fixedStartOctave?: number; // If provided, forces the keyboard to start at this octave
}

const PianoChordVisualizer: React.FC<PianoChordVisualizerProps> = ({
  chordName,
  allVoicings,
  currentVoicingIndex,
  onVoicingChange,
  numOctavesToDisplay = DEFAULT_PIANO_NUM_OCTAVES,
  nextChordNotes,
  fixedStartOctave, 
}) => {
  const currentNotesInChord = allVoicings[currentVoicingIndex] || [];

  const { numOctaves: actualNumOctaves, startOctave: actualStartOctave } = React.useMemo(() => {
    if (typeof fixedStartOctave === 'number') {
      return { numOctaves: numOctavesToDisplay, startOctave: fixedStartOctave };
    }
    return calculateRequiredOctavesAndStartForVoicing(currentNotesInChord, numOctavesToDisplay);
  }, [currentNotesInChord, numOctavesToDisplay, fixedStartOctave]);


  const pianoKeys = React.useMemo(() => 
    generatePianoKeys(actualStartOctave, actualNumOctaves), 
    [actualStartOctave, actualNumOctaves]
  );

  const getDisplayableNoteFullName = (noteNameWithOctave: string): string => {
    const match = noteNameWithOctave.match(/([A-Ga-g][#b]?)([0-9])/);
    if (!match) return noteNameWithOctave; 

    let notePart = match[1];
    const octaveNum = parseInt(match[2], 10);
    
    const equivalentSharp: {[key:string]:string} = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    if (equivalentSharp[notePart]) {
        notePart = equivalentSharp[notePart];
    }

    // No re-mapping to display octave here, use actual note octave for accuracy with fixed range
    return `${notePart}${octaveNum}`;
  };

  const displayableNotesInCurrentChord = currentNotesInChord.map(getDisplayableNoteFullName);
  const displayableNotesInNextChord = nextChordNotes?.map(getDisplayableNoteFullName) || [];


  const totalWhiteKeys = pianoKeys.filter(k => k.type === 'white').length;
  const svgWidth = totalWhiteKeys * WHITE_KEY_WIDTH;
  const svgHeight = WHITE_KEY_HEIGHT;
  
  const viewingOctaveEnd = actualStartOctave + actualNumOctaves - 1;
  const viewingRangeStr = `${MIDI_NOTE_NAMES_SHARP[0]}${actualStartOctave} - ${MIDI_NOTE_NAMES_SHARP[MIDI_NOTE_NAMES_SHARP.length-1]}${viewingOctaveEnd}`;


  return (
    <div className="my-1 p-1 bg-background dark:bg-gray-700 rounded-md shadow">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-md font-semibold text-textPrimary">{chordName}</h4>
        {allVoicings.length > 1 && (
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onVoicingChange( (currentVoicingIndex - 1 + allVoicings.length) % allVoicings.length )}
              aria-label="Previous voicing"
              disabled={allVoicings.length <=1}
            >
              <ChevronLeftIcon className="w-4 h-4"/>
            </Button>
            <span className="text-xs text-textSecondarytabular-nums">
              {currentVoicingIndex + 1}/{allVoicings.length}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onVoicingChange( (currentVoicingIndex + 1) % allVoicings.length )}
              aria-label="Next voicing"
              disabled={allVoicings.length <=1}
            >
              <ChevronRightIcon className="w-4 h-4"/>
            </Button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto pb-1">
        <svg 
          width={svgWidth} 
          height={svgHeight + 20} 
          viewBox={`0 0 ${svgWidth} ${svgHeight + 20}`}
          aria-label={`Piano keyboard showing notes for ${chordName}`}
          role="img"
        >
          <title>Piano keyboard visualizing {chordName} - {currentNotesInChord.join(', ')}</title>
          <g>
            {pianoKeys.filter(key => key.type === 'white').map(key => {
              const isPressed = displayableNotesInCurrentChord.includes(key.fullName);
              const isInNextChord = isPressed && displayableNotesInNextChord.includes(key.fullName);
              let fillColor = KEY_COLOR_WHITE;
              if (isPressed) {
                fillColor = isInNextChord ? KEY_COLOR_HIGHLIGHT_NEXT_CHORD_WHITE : KEY_COLOR_PRESSED_WHITE;
              }
              return (
                <rect
                  key={key.fullName}
                  x={key.x}
                  y={key.y}
                  width={key.width}
                  height={key.height}
                  fill={fillColor}
                  stroke={KEY_STROKE_COLOR}
                  strokeWidth="1"
                  aria-label={`${key.fullName} ${isPressed ? 'pressed' : ''} ${isInNextChord ? 'also in next chord' : ''}`}
                />
              );
            })}
            {pianoKeys.filter(key => key.type === 'black').map(key => {
              const isPressed = displayableNotesInCurrentChord.includes(key.fullName);
              const isInNextChord = isPressed && displayableNotesInNextChord.includes(key.fullName);
              let fillColor = KEY_COLOR_BLACK;
              if (isPressed) {
                fillColor = isInNextChord ? KEY_COLOR_HIGHLIGHT_NEXT_CHORD_BLACK : KEY_COLOR_PRESSED_BLACK;
              }
              return (
                <rect
                  key={key.fullName}
                  x={key.x}
                  y={key.y}
                  width={key.width}
                  height={key.height}
                  fill={fillColor}
                  stroke={KEY_STROKE_COLOR}
                  strokeWidth="1"
                  aria-label={`${key.fullName} ${isPressed ? 'pressed' : ''} ${isInNextChord ? 'also in next chord' : ''}`}
                />
              );
            })}
            {pianoKeys.filter(key => key.type === 'white').map(key => (
              <text
                key={`label-${key.fullName}`}
                x={key.x + key.width / 2}
                y={key.height + 15}
                textAnchor="middle"
                fontSize="10"
                fill={KEY_TEXT_COLOR_WHITE_KEY}
                className="select-none"
                aria-hidden="true"
              >
                {key.note}{key.octave}
              </text>
            ))}
          </g>
        </svg>
      </div>
       <p className="text-xs text-textSecondary mt-1">Notes: {currentNotesInChord.join(', ')}</p>
       <p className="text-xs text-textSecondary mt-0.5">Viewing: {viewingRangeStr}</p>
    </div>
  );
};

export default PianoChordVisualizer;