
import { AppData, UtilitySetting, UtilityId } from './types';
import { DEFAULT_UTILITY_SETTINGS, UTILITY_IDS } from './constants'; // Global constants

// Import sample data slices from each utility
import { sampleWeightEntries } from './features/weight-tracker/weightTracker.sample';
import { sampleDisneyCollection } from './features/disney-collection/disneyCollection.sample';
import { sampleGiftRecipientLists } from './features/gift-assistant/giftAssistant.sample';
import { samplePlateInventory, sampleExerciseSettings, sampleWorkoutSessions } from './features/workout-tracker/workoutTracker.sample';
import { sampleBarLoaderTesterData } from './features/bar-loader-tester/barLoaderTester.sample';
import { sampleDocsViewerData } from './features/docs-viewer/docsViewer.sample';

// Initialize sampleUtilitySettings as a copy of DEFAULT_UTILITY_SETTINGS.
// This prevents circular dependency issues.
// The AppDataProvider will handle merging these with any saved user settings or further ensuring completeness.
const sampleUtilitySettings: UtilitySetting[] = DEFAULT_UTILITY_SETTINGS.map(setting => ({ ...setting }));

// Example of how to apply sample-specific overrides to utility settings for the sample data.
// This section can be modified if the AI_STUDIO_SAMPLE_DATA needs specific utilities
// to be configured differently from the global defaults.
/*
const giftsSettingIndex = sampleUtilitySettings.findIndex(s => s.id === UTILITY_IDS.GIFTS);
if (giftsSettingIndex > -1) {
    sampleUtilitySettings[giftsSettingIndex] = {
        ...sampleUtilitySettings[giftsSettingIndex],
        showInMoreMenu: true, // Example: make Gifts show in "More" for sample data
        // enabled: false, // Example: disable gifts in sample data
    };
}

const docsViewerSettingIndex = sampleUtilitySettings.findIndex(s => s.id === UTILITY_IDS.DOCS_VIEWER);
if (docsViewerSettingIndex > -1) {
    sampleUtilitySettings[docsViewerSettingIndex] = {
        ...sampleUtilitySettings[docsViewerSettingIndex],
        enabled: false, // Example: disable Docs Viewer in sample data
    };
}
*/

export const AI_STUDIO_SAMPLE_DATA: AppData = {
  weightEntries: sampleWeightEntries,
  disneyCollection: sampleDisneyCollection,
  giftRecipientLists: sampleGiftRecipientLists.sort((a,b) => a.orderIndex - b.orderIndex),
  utilitySettings: sampleUtilitySettings, // Use the correctly initialized sampleUtilitySettings
  plateInventory: samplePlateInventory,
  exerciseSettings: sampleExerciseSettings,
  workoutSessions: sampleWorkoutSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  ...sampleBarLoaderTesterData, 
  ...sampleDocsViewerData,
};
