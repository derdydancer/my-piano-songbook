
import { AppData, SavedPianoSong } from '../../types';

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
    updateSavedSongChordVoicing: (
      songId: string, 
      chordName: string, 
      newSelectedNotes: string[], 
      newSelectedVoicingIndex: number
    ) => {
      setAppData(prev => ({
        ...prev,
        savedPianoSongs: prev.savedPianoSongs.map(song => {
          if (song.id === songId) {
            const updatedUniqueChords = song.analysisResult.uniqueChords.map(chord => {
              if (chord.chordName === chordName) {
                return {
                  ...chord,
                  selectedNotes: newSelectedNotes,
                  selectedVoicingIndex: newSelectedVoicingIndex,
                };
              }
              return chord;
            });
            return {
              ...song,
              analysisResult: {
                ...song.analysisResult,
                uniqueChords: updatedUniqueChords,
              },
            };
          }
          return song;
        }),
      }));
    },
  };
};
