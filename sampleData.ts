import { AppData, UtilitySetting, UtilityId } from './types';
import { DEFAULT_UTILITY_SETTINGS, UTILITY_IDS, DEFAULT_PLAY_ALONG_SETTINGS } from './constants'; 

// Import sample data slices from each utility
import { samplePianoHelperData } from './features/piano-helper/pianoHelper.sample';
import { sampleSavedPianoSongs } from './features/songbook/songbook.sample';

const sampleUtilitySettings: UtilitySetting[] = DEFAULT_UTILITY_SETTINGS.map(setting => ({ ...setting }));

export const AI_STUDIO_SAMPLE_DATA: AppData = {
  utilitySettings: sampleUtilitySettings,
  savedPianoSongs: sampleSavedPianoSongs,
  playAlongSettings: DEFAULT_PLAY_ALONG_SETTINGS, // Added
  ...samplePianoHelperData, 
  // Note: sampleSongbookData is implicitly covered by sampleSavedPianoSongs if songbook.data.ts doesn't define its own unique slice
};