export interface WeightEntry {
  id: string;
  date: string; // ISO string
  weight: number; // in kg or lbs, user context dependent
  notes?: string;
}

export interface DisneyClassic {
  id: number;
  title: string;
  year: number;
}

export interface DisneyOwnedStatus {
  classicId: number;
  ownedDvd: boolean;
  ownedBluRay: boolean;
}

export enum GiftItemStatus {
  Idea = 'idea',
  Considered = 'considered',
  Purchased = 'purchased',
  Wrapped = 'wrapped',
  Gifted = 'gifted',
}

export interface GiftItem {
  id: string;
  itemName: string;
  details?: string;
  status: GiftItemStatus;
  imageUrl?: string; // Optional: if an image was associated
  isNew?: boolean; // To indicate recently AI-added items
  dateNewClearTimestamp?: number; // Timestamp when the "New!" status should be cleared
  tags?: string[]; // For categorizing/filtering gifts
  dateAdded?: string; // ISO string, could be useful for robust sorting
}

export interface GiftRecipientList {
  id: string;
  personName: string; // Can be verbose, e.g., "Triona (Wife)"
  gifts: GiftItem[];
  knowledge?: string; // New field for storing knowledge about the person
  orderIndex: number; // For persistent ordering of lists
}

// For Gemini interaction with structured JSON
export interface AISuggestedGiftItem {
  itemName: string;
  details?: string;
}

export interface SinglePersonGiftSuggestion {
  personName: string; // AI's suggested name, could be verbose.
  isNewPersonCandidate?: boolean; // AI sets this to true if it thinks this is a new person.
  gifts: AISuggestedGiftItem[];
}
// The Gemini service will return an array: SinglePersonGiftSuggestion[]

export type ActivePage = 'weight' | 'disney' | 'gifts' | 'settings' | 'train' | 'workouts' | 'more' | 'bar-loader-tester' | 'docs-viewer' | 'piano-helper' | 'songbook' | 'guitar-tuner';

// --- App Utilities Settings ---
export type UtilityId = 'weight' | 'disney' | 'gifts' | 'train' | 'settings' | 'barLoaderTester' | 'docsViewer' | 'pianoHelper' | 'songbook' | 'guitarTuner';

export interface UtilitySetting {
  id: UtilityId;
  name: string;
  enabled: boolean;
  showInMoreMenu: boolean;
}

// --- Workout Tracker Types ---
export interface Plate {
  denomination: number; // e.g., 25, 20, 10, 5, 2.5, 1.25, 0.5 (in kg)
  quantity: number; // Total number of this plate owned
}

export type LiftType = 'Squat' | 'Press' | 'Deadlift' | 'Bench Press';

export interface ExerciseSetting {
  // Stores the last successfully completed workset weight for progression
  lastAchievedWorksetWeight: number;
  progressionIncrement: number;
  // Optional: configurable timer durations per lift (not fully implemented in UI yet)
  defaultTimerWarmup?: number; // in seconds
  defaultTimerWorkset?: number; // in seconds
}

export type ExerciseSettings = Record<LiftType, ExerciseSetting>;

export interface SetDetails {
  id: string;
  type: 'warmup' | 'workset';
  targetWeight: number;
  targetReps: number;
  completedReps?: number; // Only if failed or different from target
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  actualWeight: number; // If rounded from target or determined by findClosestLoadableWeight
  plateConfiguration?: PlateCombination; // How the bar was loaded
  timerState?: { // Added to persist timer state with the set
    timeLeft: number;
    isRunning: boolean;
  };
}

export interface PlateCombinationItem {
  denomination: number;
  countPerSide: number;
}
export type PlateCombination = PlateCombinationItem[];


export interface ExerciseLog {
  lift: LiftType;
  worksetWeight: number; // The main weight for the 3x5 or 1x5 for this session
  sets: SetDetails[];
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO string
  workoutDefinitionName: string; // e.g., "Workout A"
  exercises: ExerciseLog[];
  notes?: string;
  isPaused?: boolean; // Flag to indicate if the session is paused
}

export interface WorkoutExerciseDefinition {
  lift: LiftType;
  worksetSets: number;
  worksetReps: number;
}

export interface WorkoutDefinition {
  name: string; // "Workout A", "Workout B"
  exercises: WorkoutExerciseDefinition[];
}

export type WorkoutMode = 'setup' | 'active' | 'completed' | 'paused';

export interface ActiveSetInfo {
  exerciseIndex: number;
  setIndex: number;
  currentLift: LiftType;
  currentSet: SetDetails;
}

// For persisting active workout
export interface ActiveWorkoutState {
  mode: 'active' | 'paused'; // Indicates if workout is active or paused
  session: WorkoutSession; // The current in-progress session data
  activeSetInfo: ActiveSetInfo; // Info about the specific set being performed
  // Timer state might be better managed within SetDetails or locally in SetTimer if reset on set change
}


// --- Piano Chord Helper & Songbook Types ---

// This is what the AI returns and what PianoHelperPage initially works with
export interface UniqueChordDefinition {
  chordName: string;
  // AI's initially suggested/parsed notes for this chord.
  // This will be used to find the initial selectedVoicingIndex.
  aiSuggestedNotes: string[];
  // The initial selectedVoicingIndex is determined by finding aiSuggestedNotes in all programmatically generated voicings.
  // This field might not be strictly needed on this type if PianoHelperPage manages it transiently.
  // However, if AI could suggest an index, it might go here. For now, PianoHelperPage will calculate it.
}

// This is what gets stored in SavedPianoSong (persisted state)
export interface SavedUniqueChordDefinition {
  chordName: string;
  selectedNotes: string[];     // The actual notes of the chosen voicing
  selectedVoicingIndex: number; // Index of selectedNotes in the programmatically generated list of all voicings
}


export interface ChordProgressionItem {
  chordName: string; // References a chordName in UniqueChordDefinition[] or SavedUniqueChordDefinition[]
  originalContext?: string; // e.g., "The [Cmaj]sun shines bright..."
}

// This is the structure returned by the AI service
export interface PianoAnalysisResult {
  songTitle?: string;
  lyricsBy?: string;
  musicBy?: string;
  uniqueChords: UniqueChordDefinition[]; // AI provides its best guess for each unique chord
  chordProgression: ChordProgressionItem[];
}

export interface PianoKey {
  note: string; // e.g., "C", "C#", "D"
  octave: number;
  type: 'white' | 'black';
  x: number;
  y: number;
  width: number;
  height: number;
  isPressed?: boolean;
  fullName: string; // e.g., "C4"
}

export interface SavedPianoSong {
  id: string;
  songTitle: string;
  lyricsBy?: string;
  musicBy?: string;
  sourceText?: string;
  sourceImageBase64?: string;
  sourceImageMimeType?: string;
  analysisResult: { // Nested structure for analysis specific to this saved song
    songTitle?: string; // Can be redundant with SavedPianoSong.songTitle but keeps structure from AI
    lyricsBy?: string;
    musicBy?: string;
    uniqueChords: SavedUniqueChordDefinition[]; // Uses the "saved" version of chord definition
    chordProgression: ChordProgressionItem[];
  };
  dateAdded: string; // ISO string
}

// --- Guitar Tuner Types ---
export interface StandardNote {
  name: string; // e.g., "E2", "A4"
  frequency: number;
}

export interface TuningInfo {
  detectedFrequency: number | null;
  targetNote: string | null; // e.g. "E", "A#"
  targetFrequency: number | null;
  deviationInCents: number | null; // e.g. -10 (flat), +5 (sharp)
  clarity?: number; // Optional: A measure of how clear the note is (0-1)
}


export interface AppData {
  weightEntries: WeightEntry[];
  disneyCollection: DisneyOwnedStatus[];
  giftRecipientLists: GiftRecipientList[];
  utilitySettings: UtilitySetting[];
  // Workout Tracker Data
  plateInventory: Plate[];
  exerciseSettings: ExerciseSettings;
  workoutSessions: WorkoutSession[];
  activeWorkoutState?: ActiveWorkoutState | null; // Added for persisting active workout
  // Piano Helper & Songbook Data
  savedPianoSongs: SavedPianoSong[];
  // Bar Loader Tester specific data (if any becomes persistent)
  // barLoaderTesterData?: any; 
  // Docs Viewer specific data (if any becomes persistent)
  // docsViewerData?: any;
  // Guitar Tuner specific data (if any becomes persistent)
  // guitarTunerData?: any;
}

export type MoreMenuPosition = 'bottom' | 'top'; // Example, might not be needed if popover fixed

// For AppDataContext return type from processing AI suggestions
export interface ProcessedAIResults {
  giftsAddedDirectly: Array<{ listId: string; personName: string; giftsAddedCount: number }>;
  needsUserConfirmation: SinglePersonGiftSuggestion[];
}

export interface ManualGiftItemData {
  itemName: string;
  details?: string;
  tags?: string[];
  status?: GiftItemStatus; // For editing
}

export interface CustomAIContext {
  listId: string;
  personName: string;
  knowledge?: string;
  existingGifts: AISuggestedGiftItem[];
}

export interface PlateVisualStyle {
  color: string;
  height: number;
  thickness: number;
}

// --- Bar Loading Optimizer Types ---
export interface LoadableConfiguration {
  plateConfig: PlateCombination;
  actualWeight: number; // Total weight on bar
}

export interface SetLoadingDetail {
  targetWeight: number;
  actualWeight: number;
  plateConfig: PlateCombination;
  transitionEffortFromPrevious: number;
  // Optional: Store the set type (warmup/workset) and reps for display
  setType?: 'warmup' | 'workset';
  reps?: number;
}
export interface OptimalLoadingResult {
  totalEffort: number;
  setLoadings: SetLoadingDetail[];
}