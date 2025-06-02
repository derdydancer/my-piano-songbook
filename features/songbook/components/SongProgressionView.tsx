import React from 'react';
import { SavedPianoSong, ChordProgressionItem } from '../../../types';
import PianoChordVisualizer from '../../piano-helper/components/PianoChordVisualizer';
import { DisplayableSongChordInfo } from '../SongbookPage';
import { calculateOverallOctaveRange } from '../../piano-helper/pianoHelper.utils';

interface SongProgressionViewProps {
  song: SavedPianoSong;
  interactiveChords: Record<string, DisplayableSongChordInfo>;
  onVoicingChange: (chordName: string, newIndex: number) => void;
}

const SongProgressionView: React.FC<SongProgressionViewProps> = ({ song, interactiveChords, onVoicingChange }) => {
  if (!song.analysisResult.chordProgression || song.analysisResult.chordProgression.length === 0) {
    return <p className="text-textSecondary text-center py-4">No chord progression available for this song.</p>;
  }

  // 1. Collect all notes from all selected voicings for the current song
  const allSelectedNotesInSong: string[][] = React.useMemo(() => 
    song.analysisResult.uniqueChords
    .map(uniqueChord => {
        const chordInfo = interactiveChords[uniqueChord.chordName];
        if (chordInfo && chordInfo.allPossibleVoicings[chordInfo.currentVoicingIndex]) {
        return chordInfo.allPossibleVoicings[chordInfo.currentVoicingIndex];
        }
        return uniqueChord.selectedNotes || []; // Fallback to saved notes if interactive not fully ready
    })
    .filter(notes => notes.length > 0),
    [song.analysisResult.uniqueChords, interactiveChords]
  );


  // 2. Calculate the global display parameters
  const { numOctaves: globalNumOctavesForDisplay, startOctave: globalStartOctave } = React.useMemo(() => {
      if (allSelectedNotesInSong.length === 0 && song.analysisResult.uniqueChords.length > 0) {
          // Fallback if interactiveChords might not be populated yet, use saved notes
          const fallbackNotes = song.analysisResult.uniqueChords.map(uc => uc.selectedNotes).filter(sn => sn && sn.length > 0);
          return calculateOverallOctaveRange(fallbackNotes as string[][], 2, 3);
      }
      return calculateOverallOctaveRange(allSelectedNotesInSong, 2, 3); // Default 2 octaves from C3 if no notes
  }, [allSelectedNotesInSong, song.analysisResult.uniqueChords]);


  return (
    <div className="space-y-1 my-2">
      <h3 className="text-lg font-semibold text-textPrimary p-2 border-b border-gray-200 dark:border-gray-700">
        {song.songTitle || "Song"} - Progression
      </h3>
      {song.analysisResult.chordProgression.map((progItem: ChordProgressionItem, index: number) => {
        const chordInfo = interactiveChords[progItem.chordName];
        
        if (!chordInfo) {
            console.warn(`SongProgressionView: Chord info for "${progItem.chordName}" not found in interactiveChords for song "${song.songTitle}".`);
            return (
                <div key={`${song.id}-${progItem.chordName}-${index}-error`} className="text-xs text-red-500 p-2">
                    Error: Chord details for "{progItem.chordName}" missing. Please ensure the song is fully loaded.
                </div>
            );
        }

        let notesInNextChord: string[] | undefined = undefined;
        if (index + 1 < song.analysisResult.chordProgression.length) {
          const nextProgItem = song.analysisResult.chordProgression[index + 1];
          const nextChordInfo = interactiveChords[nextProgItem.chordName];
          if (nextChordInfo && nextChordInfo.allPossibleVoicings[nextChordInfo.currentVoicingIndex]) {
            notesInNextChord = nextChordInfo.allPossibleVoicings[nextChordInfo.currentVoicingIndex];
          }
        }
        
        const contextMatch = progItem.originalContext?.match(/(\[.*?\])/); // More generic regex for brackets
        const chordSymbolInContext = contextMatch ? contextMatch[0] : `[${progItem.chordName}]`;
        
        let lyricText = progItem.originalContext || "";
        if (contextMatch) { // Only replace if a match was found
            lyricText = lyricText.replace(contextMatch[0], '').trim();
        } else { // If no bracketed chord, the whole context is lyrics, but we prepend our own chord
             lyricText = progItem.originalContext || " ";
        }
        if (lyricText === "" && chordSymbolInContext === `[${progItem.chordName}]`) lyricText = " "; // ensure some space if only chord


        return (
          <div key={`${song.id}-${progItem.chordName}-${index}-progression`} className="flex items-stretch border-b border-gray-200 dark:border-gray-700 last:border-b-0 py-3 hover:bg-background dark:hover:bg-gray-700 transition-colors duration-100">
            <div className="w-1/2 pr-2 box-border flex flex-col justify-center">
              <PianoChordVisualizer
                chordName={progItem.chordName}
                allVoicings={chordInfo.allPossibleVoicings}
                currentVoicingIndex={chordInfo.currentVoicingIndex}
                onVoicingChange={(newIdx) => onVoicingChange(progItem.chordName, newIdx)}
                numOctavesToDisplay={globalNumOctavesForDisplay}
                fixedStartOctave={globalStartOctave}
                nextChordNotes={notesInNextChord}
              />
            </div>
            <div className="w-1/2 pl-2 box-border flex items-center">
              <div 
                className="text-sm text-textPrimary prose prose-sm max-w-none dark:prose-invert" 
                style={{ 
                  overflowWrap: 'break-word', 
                  wordBreak: 'break-word',
                  // Attempt to shrink text if too long
                  fontSize: lyricText.length > 80 ? '0.65rem' : (lyricText.length > 50 ? '0.75rem' : '0.875rem'),
                  lineHeight: lyricText.length > 80 ? '0.9rem' : (lyricText.length > 50 ? '1rem' : '1.25rem'),
                }}
              >
                <span className="font-bold text-primary text-lg">{chordSymbolInContext}</span>
                <span className="ml-2">{lyricText}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SongProgressionView;