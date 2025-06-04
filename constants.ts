
import { UtilityId, UtilitySetting } from './types';

export const GEMINI_MODEL_TEXT = "gemini-2.5-flash-preview-04-17";

// --- App Utilities Constants ---
export const UTILITY_IDS: Record<string, UtilityId> = {
  PIANO_HELPER: 'pianoHelper',
  SONGBOOK: 'songbook',
  SETTINGS: 'settings',
};

export const DEFAULT_UTILITY_SETTINGS: UtilitySetting[] = [
  { id: UTILITY_IDS.PIANO_HELPER as UtilityId, name: "Piano Chord Helper", enabled: true, showInMoreMenu: false },
  { id: UTILITY_IDS.SONGBOOK as UtilityId, name: "Songbook", enabled: true, showInMoreMenu: false },
  { id: UTILITY_IDS.SETTINGS as UtilityId, name: "Settings", enabled: true, showInMoreMenu: false }, // Settings should always be enabled
];
