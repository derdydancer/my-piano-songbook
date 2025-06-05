import { UtilityId, UtilitySetting, PlayAlongSettings } from './types';

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

export const DEFAULT_PLAY_ALONG_SETTINGS: PlayAlongSettings = {
  lyricsPosition: 'top',
  baseWhiteKeyWidth: 25, // Matches current PlayAlongView dynamicBaseWhiteKeyWidth default
  animationSpeedFactor: 1.0, // Matches current PlayAlongView animationSpeedFactor default
  laneHighlightColor: 'rgba(59, 130, 246, 0.65)', // Corresponds to primary color with opacity
  playedChordHighlightColor: 'rgba(59, 130, 246, 0.85)', // Corresponds to primary color with higher opacity
  noteDotColor: 'rgba(59, 130, 246, 1.0)', // Corresponds to primary color solid
  whiteKeyColor: '#FFFFFF',
  blackKeyColor: '#282c34', // Darker than default black key for better contrast in 3D
  keyStrokeColor: '#A0AEC0',
  showPlayedChordName: true,
  playedChordNameColor: '#FFFFFF',
  playedChordNameFontSize: 28,
  showUpcomingChordName: true,
  upcomingChordNameColor: '#E0E0E0',
  upcomingChordNameFontSize: 20,
  noteDotRadius: 4,
};