export interface SinglePersonGiftSuggestion {
  personName: string; 
  isNewPersonCandidate?: boolean; 
  gifts: AISuggestedGiftItem[];
}
export interface AISuggestedGiftItem {
  itemName: string;
  details?: string;
}

export type ActivePage = 'settings' | 'piano-helper' | 'songbook' | 'more';

// --- App Utilities Settings ---
export type UtilityId = 'pianoHelper' | 'songbook' | 'settings';

export interface UtilitySetting {
  id: UtilityId;
  name: string;
  enabled: boolean;
  showInMoreMenu: boolean;
}

// --- Piano Chord Helper & Songbook Types ---
export interface UniqueChordDefinition {
  chordName: string; 
  aiSuggestedNotes: string[];
}
export interface ChordSimplificationOption {
  name: string; 
  baseNotes: string[]; 
  allVoicings: string[][]; 
  isOriginal: boolean; 
  lastSelectedVoicingIndex?: number; 
}
export interface SavedUniqueChordDefinition {
  chordName: string; 
  aiSuggestedNotes: string[]; 
  selectedSimplificationName: string; 
  selectedVoicingIndex: number;     
  simplificationOptions: ChordSimplificationOption[]; 
}
export interface ChordProgressionItem {
  chordName: string; 
  originalContext?: string; 
}
export interface PianoAnalysisResult {
  songTitle?: string;
  lyricsBy?: string;
  musicBy?: string;
  uniqueChords: UniqueChordDefinition[]; 
  chordProgression: ChordProgressionItem[];
}
export interface PianoKey {
  note: string; 
  octave: number;
  type: 'white' | 'black';
  x: number;
  y: number;
  width: number;
  height: number;
  isPressed?: boolean;
  fullName: string; 
}
export interface SavedPianoSong {
  id: string;
  songTitle: string;
  lyricsBy?: string;
  musicBy?: string;
  sourceText?: string;
  sourceImageBase64?: string;
  sourceImageMimeType?: string;
  analysisResult: { 
    songTitle?: string; 
    lyricsBy?: string;
    musicBy?: string;
    uniqueChords: SavedUniqueChordDefinition[]; 
    chordProgression: ChordProgressionItem[];
  };
  dateAdded: string; 
}

export interface PlayAlongSettings {
  lyricsPosition: 'top' | 'bottom';
  baseWhiteKeyWidth: number;
  animationSpeedFactor: number;
  laneHighlightColor: string; // e.g., 'rgba(59, 130, 246, 0.7)'
  playedChordHighlightColor: string; // e.g., 'rgba(59, 130, 246, 0.85)'
  noteDotColor: string; // e.g., 'rgba(59, 130, 246, 1.0)'
  whiteKeyColor: string; // e.g., '#FFFFFF'
  blackKeyColor: string; // e.g., '#282c34'
  keyStrokeColor: string; // e.g., '#A0AEC0'
  showPlayedChordName: boolean;
  playedChordNameColor: string;
  playedChordNameFontSize: number;
  showUpcomingChordName: boolean;
  upcomingChordNameColor: string;
  upcomingChordNameFontSize: number;
  noteDotRadius: number;
}

export interface AppData {
  utilitySettings: UtilitySetting[];
  savedPianoSongs: SavedPianoSong[];
  playAlongSettings: PlayAlongSettings; // Added new settings
}

export type MoreMenuPosition = 'bottom' | 'top';

export interface ChordAnalysis {
  name: string;
  root: string;
  bass?: string;
  type: 'maj' | 'min' | 'aug' | 'dim' | 'dom' | 'sus' | 'single' | 'other';
  intervals: number[];
  notes: string[];
  hasSeventh?: boolean;
  hasNinth?: boolean;
  hasEleventh?: boolean;
  hasThirteenth?: boolean;
  isAltered?: boolean;
  extensions: string[];
  alterations: string[];
}