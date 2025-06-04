
import React from 'react';
import { SavedPianoSong, ChordProgressionItem } from '../../../types';
import PianoChordVisualizer from '../../piano-helper/components/PianoChordVisualizer';
import { DisplayableSongChordInfo } from '../SongbookPage';
import { selectBestTwoOctaveRange, normalizeNoteToSharp } from '../../piano-helper/pianoHelper.utils';

interface SongProgressionViewProps {
  song: SavedPianoSong;
  interactiveChords: Record<string, DisplayableSongChordInfo>;
  onVoicingChange: (chordName: string, newIndex: number) => void;
}

const SongProgressionView: React.FC<SongProgressionViewProps> = ({ song, interactiveChords, onVoicingChange }) => {
  if (!song.analysisResult.chordProgression || song.analysisResult.chordProgression.length === 0) {
    return <p className="text-textSecondary text-center py-4">No chord progression available for this song.</p>;
  }

  return (
    <div className="space-y-3 my-2">
      <h3 className="text-lg font-semibold text-textPrimary p-2 border-b border-gray-200 dark:border-gray-700">
        {song.songTitle || "Song"} - Progression
      </h3>
      <div className="flex flex-wrap gap-3">
        {song.analysisResult.chordProgression.map((progItem: ChordProgressionItem, index: number) => {
          const chordInfo = interactiveChords[progItem.chordName];

          if (!chordInfo) {
              console.warn(`SongProgressionView: Chord info for "${progItem.chordName}" not found in interactiveChords for song "${song.songTitle}".`);
              return (
                  <div key={`${song.id}-${progItem.chordName}-${index}-error`} className="text-xs text-red-500 p-2 bg-card rounded shadow w-full sm:w-auto flex-grow basis-full sm:basis-[calc(50%-0.75rem)] md:basis-[calc(33.33%-0.75rem)] lg:basis-[calc(25%-0.75rem)] min-w-[280px]">
                      Error: Chord details for "{progItem.chordName}" missing.
                  </div>
              );
          }

          const currentVoicingNotes = chordInfo.allPossibleVoicings[chordInfo.currentVoicingIndex] || [];
          const { startOctave: optimalStartOctave } = selectBestTwoOctaveRange(currentVoicingNotes);
          
          const noteDotColors: Record<string, 'red' | 'black'> = {};
          let notesInNextChordSet: Set<string> | undefined = undefined;
          if (index + 1 < song.analysisResult.chordProgression.length) {
            const nextProgItem = song.analysisResult.chordProgression[index + 1];
            const nextChordInfo = interactiveChords[nextProgItem.chordName];
            if (nextChordInfo && nextChordInfo.allPossibleVoicings[nextChordInfo.currentVoicingIndex]) {
              notesInNextChordSet = new Set(nextChordInfo.allPossibleVoicings[nextChordInfo.currentVoicingIndex].map(normalizeNoteToSharp));
            }
          }

          currentVoicingNotes.forEach(note => {
            const normalizedNote = normalizeNoteToSharp(note);
            if (notesInNextChordSet && notesInNextChordSet.has(normalizedNote)) {
              noteDotColors[normalizedNote] = 'red';
            } else {
              noteDotColors[normalizedNote] = 'black';
            }
          });
          
          const activeSimplificationNameForDisplay = chordInfo.activeSimplificationName.replace(/^Original \((.*)\)$/, '$1');
          const chordSymbolInContext = `[${activeSimplificationNameForDisplay}]`;

          let lyricText = progItem.originalContext || "";
          const originalAiChordRegex = new RegExp(`\\[${progItem.chordName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\s*`, 'i');
          lyricText = lyricText.replace(originalAiChordRegex, '').trim();
          if (lyricText === "" && chordSymbolInContext === `[${activeSimplificationNameForDisplay}]`) lyricText = " "; 

          return (
            <div 
              key={`${song.id}-${progItem.chordName}-${index}-progression`} 
              className="bg-card dark:bg-gray-800 p-3 rounded-lg shadow-md flex flex-col w-full sm:w-auto flex-grow basis-full sm:basis-[calc(50%-0.375rem)] md:basis-[calc(33.33%-0.5rem)] lg:basis-[calc(25%-0.5625rem)] xl:basis-[calc(20%-0.6rem)] min-w-[280px] overflow-hidden"
            >
              <PianoChordVisualizer
                chordName={chordInfo.activeSimplificationName}
                allVoicings={chordInfo.allPossibleVoicings}
                currentVoicingIndex={chordInfo.currentVoicingIndex}
                onVoicingChange={(newIdx) => onVoicingChange(progItem.chordName, newIdx)}
                numOctavesToDisplay={2}
                fixedStartOctave={optimalStartOctave}
                noteDotColors={noteDotColors} 
              />
              <div className="mt-2 text-sm text-textPrimary overflow-hidden"> {/* Added overflow-hidden */}
                  <span className="font-bold text-primary text-lg block truncate">{chordSymbolInContext}</span> {/* Added block truncate */}
                  <span className="mt-1 block truncate">{lyricText}</span> {/* Added block truncate and mt-1 */}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SongProgressionView;
