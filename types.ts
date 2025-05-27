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
  tags?: string[]; // For categorizing/filtering gifts
  dateAdded?: string; // ISO string, could be useful for robust sorting
}

export interface GiftRecipientList {
  id: string;
  personName: string; // Can be verbose, e.g., "Triona (Wife)"
  gifts: GiftItem[];
  knowledge?: string; // New field for storing knowledge about the person
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

export type ActivePage = 'weight' | 'disney' | 'gifts' | 'settings' | 'train' | 'workouts' | 'more';

// --- App Utilities Settings ---
export type UtilityId = 'weight' | 'disney' | 'gifts' | 'train'; // 'train' covers 'workouts'

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

export type WorkoutMode = 'setup' | 'active' | 'completed';

export interface ActiveSetInfo {
  exerciseIndex: number;
  setIndex: number;
  currentLift: LiftType;
  currentSet: SetDetails;
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