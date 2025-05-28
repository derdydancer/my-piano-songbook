
import { UtilityId, UtilitySetting } from './types'; // LiftType might not be needed here anymore

export const GEMINI_MODEL_TEXT = "gemini-2.5-flash-preview-04-17";

// --- App Utilities Constants ---
export const UTILITY_IDS: Record<string, UtilityId> = {
  WEIGHT: 'weight',
  DISNEY: 'disney',
  GIFTS: 'gifts',
  TRAIN: 'train',
  SETTINGS: 'settings',
  BAR_LOADER_TESTER: 'barLoaderTester',
};

export const DEFAULT_UTILITY_SETTINGS: UtilitySetting[] = [
  { id: UTILITY_IDS.WEIGHT as UtilityId, name: "Weight Tracker", enabled: true, showInMoreMenu: false },
  { id: UTILITY_IDS.DISNEY as UtilityId, name: "Disney Collection", enabled: true, showInMoreMenu: false },
  { id: UTILITY_IDS.GIFTS as UtilityId, name: "Gift Assistant", enabled: true, showInMoreMenu: false },
  { id: UTILITY_IDS.TRAIN as UtilityId, name: "Workout Tracker", enabled: true, showInMoreMenu: false },
  { id: UTILITY_IDS.SETTINGS as UtilityId, name: "Settings", enabled: true, showInMoreMenu: false }, // Settings should always be enabled
  { id: UTILITY_IDS.BAR_LOADER_TESTER as UtilityId, name: "Bar Loading Tester", enabled: true, showInMoreMenu: true }, // New utility
];

// Other truly global constants can remain here.
// For example, if there was a global API URL or a version number.
// Constants related to specific features (like Disney movie list, workout bar weight)
// have been moved to their respective feature's constants file (e.g., features/disney-collection/disneyCollection.constants.ts)