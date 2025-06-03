
import React from 'react';
import FullPianoKeyboard from './FullPianoKeyboard';
import { DisplayableSongChordInfo } from '../../songbook/SongbookPage';
import Button from '../../../components/common/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '../../../components/common/Icons';

interface SongGridViewProps {
  songId: string;
  chords: Record<string, DisplayableSongChordInfo>;
  onVoicingChange: (songId: string, chordName: string, newIndex: number) => void;
  songTitle?: string;
}

const SongGridView: React.FC<SongGridViewProps> = ({ songId, chords, onVoicingChange, songTitle }) => {
  const displayableChords = Object.values(chords);

  if (!displayableChords || displayableChords.length === 0) {
    return <p className="text-textSecondary text-center py-4">No chords to display in grid view.</p>;
  }

  // Pre-calculate all selected voicings for efficient sharing check
  const allSelectedVoicingsInSong: Record<string, Set<string>> = {};
  displayableChords.forEach(chordInfo => {
    const voicing = chordInfo.allPossibleVoicings[chordInfo.currentVoicingIndex];
    if (voicing) {
      allSelectedVoicingsInSong[chordInfo.chordName] = new Set(voicing);
    }
  });

  return (
    <div className="space-y-1 my-2 bg-card dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {songTitle && <h3 className="text-lg font-semibold text-textPrimary p-3 border-b border-gray-200 dark:border-gray-700">{songTitle} - Chord Grid</h3>}

      <div className="space-y-0">
        {displayableChords.map((chordInfo, index) => {
          const currentVoicingNotes = chordInfo.allPossibleVoicings[chordInfo.currentVoicingIndex] || [];
          const noteDotColors: Record<string, 'red' | 'black'> = {};

          if (currentVoicingNotes.length > 0) {
            const currentVoicingNotesSet = new Set(currentVoicingNotes);
            const globallySharedNotesForThisChord = new Set<string>();

            // Check against all *other* unique chords in the song
            displayableChords.forEach(otherChordInfo => {
              if (otherChordInfo.chordName !== chordInfo.chordName) {
                const otherChordSelectedVoicing = allSelectedVoicingsInSong[otherChordInfo.chordName];
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
              noteDotColors[note] = globallySharedNotesForThisChord.has(note) ? 'red' : 'black';
            });
          }

          return (
            <div
              key={`${chordInfo.chordName}-${index}-grid-row`}
              className="flex items-center border-b border-gray-200 dark:border-gray-700 last:border-b-0 p-2 hover:bg-background dark:hover:bg-gray-700 transition-colors duration-100"
            >
              <div className="w-32 sm:w-40 md:w-48 flex-shrink-0 pr-2 space-y-1">
                <h4 className="text-sm sm:text-md font-medium text-textPrimary truncate" title={chordInfo.chordName}>{chordInfo.chordName}</h4>
                {chordInfo.allPossibleVoicings.length > 1 && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1"
                      onClick={() => onVoicingChange(songId, chordInfo.chordName, (chordInfo.currentVoicingIndex - 1 + chordInfo.allPossibleVoicings.length) % chordInfo.allPossibleVoicings.length)}
                      aria-label={`Previous voicing for ${chordInfo.chordName}`}
                    >
                      <ChevronLeftIcon className="w-3 h-3"/>
                    </Button>
                    <span className="text-xxs text-textSecondary tabular-nums">
                      {chordInfo.currentVoicingIndex + 1}/{chordInfo.allPossibleVoicings.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1"
                      onClick={() => onVoicingChange(songId, chordInfo.chordName, (chordInfo.currentVoicingIndex + 1) % chordInfo.allPossibleVoicings.length)}
                      aria-label={`Next voicing for ${chordInfo.chordName}`}
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
                  idSuffix={`${chordInfo.chordName}-${index}-grid`}
                  noteDotColors={noteDotColors} // Pass calculated dot colors
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
