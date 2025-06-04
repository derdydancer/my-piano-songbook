
import { AppData, SavedPianoSong, ChordSimplificationOption, SavedUniqueChordDefinition } from '../../types';
import { findBestMatchingVoicingIndex, countSharedNotes } from '../piano-helper/pianoHelper.utils';


// initialSongbookData is handled by initialPianoHelperData for savedPianoSongs
export const initialSongbookData = {
  // No separate AppData slice specifically for songbook if savedPianoSongs is in pianoHelperData
};

export type SongbookActions = ReturnType<typeof createSongbookActions>;

export const createSongbookActions = (
  setAppData: React.Dispatch<React.SetStateAction<AppData>>,
  getAppData: () => AppData
) => {
  return {
    deleteSavedPianoSong: (songId: string) => {
      setAppData(prev => ({
        ...prev,
        savedPianoSongs: prev.savedPianoSongs.filter(song => song.id !== songId),
      }));
    },
    getSavedPianoSongs: (): SavedPianoSong[] => {
      const appData = getAppData();
      return [...appData.savedPianoSongs]; 
    },
    updateSavedSongChordSimplification: (songId: string, chordName: string, newSimplificationName: string) => {
      setAppData(prev => {
        const songIndex = prev.savedPianoSongs.findIndex(s => s.id === songId);
        if (songIndex === -1) return prev;

        const songToUpdate = { ...prev.savedPianoSongs[songIndex] };
        const uniqueChordIndex = songToUpdate.analysisResult.uniqueChords.findIndex(c => c.chordName === chordName);
        if (uniqueChordIndex === -1) return prev;
        
        const chordToUpdate = { ...songToUpdate.analysisResult.uniqueChords[uniqueChordIndex] };
        chordToUpdate.simplificationOptions = chordToUpdate.simplificationOptions.map(opt => ({...opt})); // Deep clone options array

        const previousSimplificationName = chordToUpdate.selectedSimplificationName;
        const previousVoicingIndex = chordToUpdate.selectedVoicingIndex;

        const newSimplOpt = chordToUpdate.simplificationOptions.find(opt => opt.name === newSimplificationName);
        if (!newSimplOpt) return prev; // Should not happen

        let newSelectedVoicingIndex = 0;

        if (newSimplOpt.lastSelectedVoicingIndex !== undefined && newSimplOpt.lastSelectedVoicingIndex < newSimplOpt.allVoicings.length) {
          newSelectedVoicingIndex = newSimplOpt.lastSelectedVoicingIndex;
        } else {
          // Determine sourceVoicingForMapping
          let sourceVoicingForMapping: string[] = [];
          const originalSimplOpt = chordToUpdate.simplificationOptions.find(opt => opt.isOriginal);
          const previousSimplOpt = chordToUpdate.simplificationOptions.find(opt => opt.name === previousSimplificationName);

          if (originalSimplOpt) {
            if (originalSimplOpt.lastSelectedVoicingIndex !== undefined && originalSimplOpt.lastSelectedVoicingIndex < originalSimplOpt.allVoicings.length) {
              sourceVoicingForMapping = originalSimplOpt.allVoicings[originalSimplOpt.lastSelectedVoicingIndex];
            } else if (previousSimplOpt && previousSimplOpt.allVoicings[previousVoicingIndex]) {
              // Original has no memory, derive it from current simplification (SimplA)
              const currentVoicingOfPrevious = previousSimplOpt.allVoicings[previousVoicingIndex];
              const closestOriginalIndex = findBestMatchingVoicingIndex(currentVoicingOfPrevious, originalSimplOpt.allVoicings);
              
              // Update Original's memory
              const originalOptIndex = chordToUpdate.simplificationOptions.findIndex(opt => opt.isOriginal);
              if (originalOptIndex !== -1) {
                chordToUpdate.simplificationOptions[originalOptIndex] = {
                    ...chordToUpdate.simplificationOptions[originalOptIndex],
                    lastSelectedVoicingIndex: closestOriginalIndex
                };
              }
              sourceVoicingForMapping = originalSimplOpt.allVoicings[closestOriginalIndex] || [];
            }
          }
          
          if (sourceVoicingForMapping.length > 0 && newSimplOpt.allVoicings.length > 0) {
            newSelectedVoicingIndex = findBestMatchingVoicingIndex(sourceVoicingForMapping, newSimplOpt.allVoicings);
          } else if (newSimplOpt.allVoicings.length > 0) {
            newSelectedVoicingIndex = 0; // Default if no source or target voicings
          }
        }
        
        // Ensure index is valid
        if (newSimplOpt.allVoicings.length === 0) newSelectedVoicingIndex = 0;
        else newSelectedVoicingIndex = Math.max(0, Math.min(newSelectedVoicingIndex, newSimplOpt.allVoicings.length - 1));

        chordToUpdate.selectedSimplificationName = newSimplificationName;
        chordToUpdate.selectedVoicingIndex = newSelectedVoicingIndex;
        
        songToUpdate.analysisResult.uniqueChords[uniqueChordIndex] = chordToUpdate;
        const updatedSongs = [...prev.savedPianoSongs];
        updatedSongs[songIndex] = songToUpdate;
        return { ...prev, savedPianoSongs: updatedSongs };
      });
    },
    updateSavedSongChordVoicing: (
      songId: string, 
      chordName: string, 
      newSelectedVoicingIndex: number
    ) => {
      setAppData(prev => {
        const songIndex = prev.savedPianoSongs.findIndex(s => s.id === songId);
        if (songIndex === -1) return prev;
        
        const songToUpdate = { ...prev.savedPianoSongs[songIndex] };
        songToUpdate.analysisResult = { ...songToUpdate.analysisResult };
        songToUpdate.analysisResult.uniqueChords = songToUpdate.analysisResult.uniqueChords.map(chord => {
            if (chord.chordName === chordName) {
                const updatedChord: SavedUniqueChordDefinition = { ...chord, simplificationOptions: chord.simplificationOptions.map(o => ({...o})) }; // Deep clone options
                const activeSimplification = updatedChord.simplificationOptions.find(opt => opt.name === updatedChord.selectedSimplificationName);

                if (activeSimplification && newSelectedVoicingIndex >= 0 && newSelectedVoicingIndex < activeSimplification.allVoicings.length) {
                    updatedChord.selectedVoicingIndex = newSelectedVoicingIndex;
                    
                    updatedChord.simplificationOptions = updatedChord.simplificationOptions.map(opt => {
                        if (opt.name === updatedChord.selectedSimplificationName) {
                            return { ...opt, lastSelectedVoicingIndex: newSelectedVoicingIndex };
                        }
                        // Clear memory for all OTHER simplifications of this chord
                        return { ...opt, lastSelectedVoicingIndex: undefined };
                    });
                } else {
                    console.warn(`Invalid voicing index ${newSelectedVoicingIndex} for ${chordName} (simplification: ${activeSimplification?.name}). Retaining previous index ${chord.selectedVoicingIndex}.`);
                    return chord; // Return original if invalid
                }
                return updatedChord;
            }
            return chord;
        });

        const updatedSongs = [...prev.savedPianoSongs];
        updatedSongs[songIndex] = songToUpdate;
        return { ...prev, savedPianoSongs: updatedSongs };
      });
    },
  };
};
