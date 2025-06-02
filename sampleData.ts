
import { AppData, UtilitySetting, UtilityId } from './types';
import { DEFAULT_UTILITY_SETTINGS, UTILITY_IDS } from './constants'; // Global constants

// Import sample data slices from each utility
import { sampleWeightEntries } from './features/weight-tracker/weightTracker.sample';
import { sampleDisneyCollection } from './features/disney-collection/disneyCollection.sample';
import { sampleGiftRecipientLists } from './features/gift-assistant/giftAssistant.sample';
import { samplePlateInventory, sampleExerciseSettings, sampleWorkoutSessions } from './features/workout-tracker/workoutTracker.sample';
import { sampleBarLoaderTesterData } from './features/bar-loader-tester/barLoaderTester.sample';
import { sampleDocsViewerData } from './features/docs-viewer/docsViewer.sample';
import { samplePianoHelperData } from './features/piano-helper/pianoHelper.sample';
import { sampleSavedPianoSongs } from './features/songbook/songbook.sample';
import { sampleGuitarTunerData } from './features/guitar-tuner/guitarTuner.sample'; // New Utility

const sampleUtilitySettings: UtilitySetting[] = DEFAULT_UTILITY_SETTINGS.map(setting => ({ ...setting }));

export const AI_STUDIO_SAMPLE_DATA: AppData = {
  weightEntries: sampleWeightEntries,
  disneyCollection: sampleDisneyCollection,
  giftRecipientLists: sampleGiftRecipientLists.sort((a,b) => a.orderIndex - b.orderIndex),
  utilitySettings: sampleUtilitySettings,
  plateInventory: samplePlateInventory,
  exerciseSettings: sampleExerciseSettings,
  workoutSessions: sampleWorkoutSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  savedPianoSongs: sampleSavedPianoSongs,
  ...sampleBarLoaderTesterData, 
  ...sampleDocsViewerData,
  ...samplePianoHelperData,
  ...sampleGuitarTunerData, // New Utility
};
