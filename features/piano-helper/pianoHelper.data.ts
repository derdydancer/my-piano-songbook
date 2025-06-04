
import { AppData, SavedPianoSong, SavedUniqueChordDefinition } from '../../types'; // Ensure SavedUniqueChordDefinition is imported

export const initialPianoHelperData = {
  savedPianoSongs: [] as SavedPianoSong[],
};

export type PianoHelperActions = ReturnType<typeof createPianoHelperActions>;

export const createPianoHelperActions = (
  setAppData: React.Dispatch<React.SetStateAction<AppData>>,
  getAppData: () => AppData
) => {
  return {
    addSavedPianoSong: (songData: Omit<SavedPianoSong, 'id' | 'dateAdded'>) => {
      // songData comes from PianoHelperPage and should already have analysisResult.uniqueChords
      // structured as SavedUniqueChordDefinition[]
      const newSong: SavedPianoSong = {
        ...songData,
        id: Date.now().toString() + Math.random().toString(36).substring(2,9),
        dateAdded: new Date().toISOString(),
      };
      setAppData(prev => ({
        ...prev,
        savedPianoSongs: [...prev.savedPianoSongs, newSong].sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()),
      }));
    },
  };
};
