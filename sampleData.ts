
import { AppData, UtilitySetting, UtilityId } from './types';
import { DEFAULT_UTILITY_SETTINGS, UTILITY_IDS } from './constants'; // Global constants

// Import sample data slices from each utility
import { sampleWeightEntries } from './features/weight-tracker/weightTracker.sample';
import { sampleDisneyCollection } from './features/disney-collection/disneyCollection.sample';
import { sampleGiftRecipientLists } from './features/gift-assistant/giftAssistant.sample';
import { samplePlateInventory, sampleExerciseSettings, sampleWorkoutSessions } from './features/workout-tracker/workoutTracker.sample';
import { sampleBarLoaderTesterData } from './features/bar-loader-tester/barLoaderTester.sample'; // New Utility

// Ensure utility settings in sample data cover all defined utilities
const sampleUtilitySettings: UtilitySetting[] = [];
const existingSampleSettingIds = new Set<UtilityId>();

DEFAULT_UTILITY_SETTINGS.forEach(setting => {
    sampleUtilitySettings.push({...setting}); 
    existingSampleSettingIds.add(setting.id);
});

const giftsSetting = sampleUtilitySettings.find(s => s.id === UTILITY_IDS.GIFTS as UtilityId);
if (giftsSetting) {
    // giftsSetting.showInMoreMenu = true; 
}


export const AI_STUDIO_SAMPLE_DATA: AppData = {
  weightEntries: sampleWeightEntries,
  disneyCollection: sampleDisneyCollection,
  giftRecipientLists: sampleGiftRecipientLists.sort((a,b) => a.orderIndex - b.orderIndex),
  utilitySettings: sampleUtilitySettings,
  plateInventory: samplePlateInventory,
  exerciseSettings: sampleExerciseSettings,
  workoutSessions: sampleWorkoutSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  // ...sampleBarLoaderTesterData, // if it had any persistent data
};