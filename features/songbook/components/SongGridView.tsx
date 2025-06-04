
import React from 'react';
import FullPianoKeyboard from '../../piano-helper/components/FullPianoKeyboard';
import { SavedUniqueChordDefinition, ChordSimplificationOption } from '../../../types';
import Button from '../../../components/common/Button';
import Select from '../../../components/common/Select';
import { ChevronLeftIcon, ChevronRightIcon } from '../../../components/common/Icons';
import { normalizeNoteToSharp } from '../../piano-helper/pianoHelper.utils';


interface SongGridViewProps {
  songId: string;
  uniqueChordsData: SavedUniqueChordDefinition[]; // Changed prop
  onVoicingChange: (songId: string, chordName: string, newIndex: number) => void;
  onSimplificationChange: (songId: string, chordName: string, newSimplificationName: string) => void; // New prop
  songTitle?: string;
}

const SongGridView: React.FC<SongGridViewProps> = ({ songId, uniqueChordsData, onVoicingChange, onSimplificationChange, songTitle }) => {

  if (!uniqueChordsData || uniqueChordsData.length === 0) {
    return <p className="text-textSecondary text-center py-4">No chords to display in grid view.</p>;
  }

  // Pre-calculate all selected voicings for efficient sharing check
  const allSelectedVoicingsInSong: Record<string, Set<string>> = {};
  uniqueChordsData.forEach(chordData => {
    const activeSimplification = chordData.simplificationOptions.find(opt => opt.name === chordData.selectedSimplificationName);
    if (activeSimplification) {
      const voicing = activeSimplification.allVoicings[chordData.selectedVoicingIndex];
      if (voicing) {
        allSelectedVoicingsInSong[chordData.chordName] = new Set(voicing.map(normalizeNoteToSharp));
      }
    }
  });

  return (
    <div className="space-y-1 my-2 bg-card dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {songTitle && <h3 className="text-lg font-semibold text-textPrimary p-3 border-b border-gray-200 dark:border-gray-700">{songTitle} - Chord Grid</h3>}

      <div className="space-y-0">
        {uniqueChordsData.map((chordData) => {
          const activeSimplification = chordData.simplificationOptions.find(opt => opt.name === chordData.selectedSimplificationName);
          
          if (!activeSimplification) {
            console.warn(`Could not find active simplification '${chordData.selectedSimplificationName}' for chord '${chordData.chordName}'. Skipping render for this chord.`);
            return null; 
          }

          const currentVoicingNotes = activeSimplification.allVoicings[chordData.selectedVoicingIndex] || [];
          const noteDotColors: Record<string, 'red' | 'black'> = {};

          if (currentVoicingNotes.length > 0) {
            const currentVoicingNotesSet = new Set(currentVoicingNotes.map(normalizeNoteToSharp));
            const globallySharedNotesForThisChord = new Set<string>();

            uniqueChordsData.forEach(otherChordData => {
              if (otherChordData.chordName !== chordData.chordName) {
                const otherChordSelectedVoicing = allSelectedVoicingsInSong[otherChordData.chordName];
                if (otherChordSelectedVoicing) {
                  currentVoicingNotesSet.forEach(noteInCurrent => {
                    if (otherChordSelectedVoicing.has(noteInCurrent)) {
                      globallySharedNotesForThisChord.add(noteInCurrent);
                    }
                  });
                }
              }
            });

            currentVoicingNotes.forEach(note => {
              noteDotColors[normalizeNoteToSharp(note)] = globallySharedNotesForThisChord.has(normalizeNoteToSharp(note)) ? 'red' : 'black';
            });
          }
          
          const simplificationOptionsForSelect = chordData.simplificationOptions.map(opt => ({
            value: opt.name,
            label: opt.name,
          }));

          return (
            <div
              key={`${chordData.chordName}-grid-row`}
              className="flex items-center border-b border-gray-200 dark:border-gray-700 last:border-b-0 p-2 hover:bg-background dark:hover:bg-gray-700 transition-colors duration-100"
            >
              <div className="w-36 sm:w-48 md:w-56 flex-shrink-0 pr-2 space-y-1">
                <h4 className="text-sm sm:text-md font-medium text-textPrimary truncate" title={chordData.chordName}>{chordData.chordName}</h4>
                
                {chordData.simplificationOptions.length > 1 && (
                    <Select
                        options={simplificationOptionsForSelect}
                        value={chordData.selectedSimplificationName}
                        onChange={(e) => onSimplificationChange(songId, chordData.chordName, e.target.value)}
                        className="text-xs p-1 w-full"
                        containerClassName="mb-1"
                        aria-label={`Simplification for ${chordData.chordName}`}
                    />
                )}

                {activeSimplification.allVoicings.length > 1 && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1"
                      onClick={() => onVoicingChange(songId, chordData.chordName, (chordData.selectedVoicingIndex - 1 + activeSimplification.allVoicings.length) % activeSimplification.allVoicings.length)}
                      aria-label={`Previous voicing for ${chordData.chordName}`}
                    >
                      <ChevronLeftIcon className="w-3 h-3"/>
                    </Button>
                    <span className="text-xxs text-textSecondary tabular-nums">
                      {chordData.selectedVoicingIndex + 1}/{activeSimplification.allVoicings.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1"
                      onClick={() => onVoicingChange(songId, chordData.chordName, (chordData.selectedVoicingIndex + 1) % activeSimplification.allVoicings.length)}
                      aria-label={`Next voicing for ${chordData.chordName}`}
                    >
                      <ChevronRightIcon className="w-3 h-3"/>
                    </Button>
                  </div>
                )}
                <p className="text-xxs sm:text-xs text-textSecondary truncate" title={currentVoicingNotes.join(', ')}>{currentVoicingNotes.join(', ')}</p>
              </div>
              <div className="flex-grow min-w-0">
                <FullPianoKeyboard
                  highlightedNotes={currentVoicingNotes}
                  idSuffix={`${chordData.chordName}-grid`}
                  noteDotColors={noteDotColors}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SongGridView;
