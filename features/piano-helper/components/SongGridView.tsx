
import React from 'react';
import FullPianoKeyboard from './FullPianoKeyboard';

export interface SongGridChord {
  chordName: string;
  selectedNotes: string[];
}

interface SongGridViewProps {
  uniqueChords: SongGridChord[];
  songTitle?: string;
}

const SongGridView: React.FC<SongGridViewProps> = ({ uniqueChords, songTitle }) => {
  if (!uniqueChords || uniqueChords.length === 0) {
    return <p className="text-textSecondary text-center py-4">No chords to display in grid view.</p>;
  }

  return (
    <div className="space-y-1 my-2 bg-card dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {songTitle && <h3 className="text-lg font-semibold text-textPrimary p-3 border-b border-gray-200 dark:border-gray-700">{songTitle} - Chord Grid</h3>}
      
      <div className="space-y-0"> {/* Reduced space between rows for tighter grid */}
        {uniqueChords.map((chord, index) => (
          <div 
            key={`${chord.chordName}-${index}-grid-row`} 
            className="flex items-center border-b border-gray-200 dark:border-gray-700 last:border-b-0 p-2 hover:bg-background dark:hover:bg-gray-700 transition-colors duration-100"
          >
            <div className="w-24 sm:w-28 md:w-32 flex-shrink-0 pr-2"> {/* Fixed width for chord name */}
              <h4 className="text-sm sm:text-md font-medium text-textPrimary truncate" title={chord.chordName}>{chord.chordName}</h4>
              <p className="text-xs text-textSecondary truncate" title={chord.selectedNotes.join(', ')}>{chord.selectedNotes.join(', ')}</p>
            </div>
            <div className="flex-grow min-w-0"> {/* Keyboard takes remaining space */}
              <FullPianoKeyboard
                highlightedNotes={chord.selectedNotes}
                idSuffix={`${chord.chordName}-${index}-grid`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SongGridView;
