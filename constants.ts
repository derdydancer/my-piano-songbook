import { DisneyClassic, Plate, ExerciseSettings, WorkoutDefinition, LiftType, UtilityId, UtilitySetting } from './types';

export const DISNEY_ANIMATED_CLASSICS: DisneyClassic[] = [
  { id: 1, title: "Snow White and the Seven Dwarfs", year: 1937 },
  { id: 2, title: "Pinocchio", year: 1940 },
  { id: 3, title: "Fantasia", year: 1940 },
  { id: 4, title: "Dumbo", year: 1941 },
  { id: 5, title: "Bambi", year: 1942 },
  { id: 6, title: "Saludos Amigos", year: 1942 },
  { id: 7, title: "The Three Caballeros", year: 1944 },
  { id: 8, title: "Make Mine Music", year: 1946 },
  { id: 9, title: "Fun and Fancy Free", year: 1947 },
  { id: 10, title: "Melody Time", year: 1948 },
  { id: 11, title: "The Adventures of Ichabod and Mr. Toad", year: 1949 },
  { id: 12, title: "Cinderella", year: 1950 },
  { id: 13, title: "Alice in Wonderland", year: 1951 },
  { id: 14, title: "Peter Pan", year: 1953 },
  { id: 15, title: "Lady and the Tramp", year: 1955 },
  { id: 16, title: "Sleeping Beauty", year: 1959 },
  { id: 17, title: "One Hundred and One Dalmatians", year: 1961 },
  { id: 18, title: "The Sword in the Stone", year: 1963 },
  { id: 19, title: "The Jungle Book", year: 1967 },
  { id: 20, title: "The Aristocats", year: 1970 },
  { id: 21, title: "Robin Hood", year: 1973 },
  { id: 22, title: "The Many Adventures of Winnie the Pooh", year: 1977 },
  { id: 23, title: "The Rescuers", year: 1977 },
  { id: 24, title: "The Fox and the Hound", year: 1981 },
  { id: 25, title: "The Black Cauldron", year: 1985 },
  { id: 26, title: "The Great Mouse Detective", year: 1986 },
  { id: 27, title: "Oliver & Company", year: 1988 },
  { id: 28, title: "The Little Mermaid", year: 1989 },
  { id: 29, title: "The Rescuers Down Under", year: 1990 },
  { id: 30, title: "Beauty and the Beast", year: 1991 },
  { id: 31, title: "Aladdin", year: 1992 },
  { id: 32, title: "The Lion King", year: 1994 },
  { id: 33, title: "Pocahontas", year: 1995 },
  { id: 34, title: "The Hunchback of Notre Dame", year: 1996 },
  { id: 35, title: "Hercules", year: 1997 },
  { id: 36, title: "Mulan", year: 1998 },
  { id: 37, title: "Tarzan", year: 1999 },
  { id: 38, title: "Fantasia 2000", year: 1999 },
  { id: 39, title: "Dinosaur", year: 2000 },
  { id: 40, title: "The Emperor's New Groove", year: 2000 },
  { id: 41, title: "Atlantis: The Lost Empire", year: 2001 },
  { id: 42, title: "Lilo & Stitch", year: 2002 },
  { id: 43, title: "Treasure Planet", year: 2002 },
  { id: 44, title: "Brother Bear", year: 2003 },
  { id: 45, title: "Home on the Range", year: 2004 },
  { id: 46, title: "Chicken Little", year: 2005 },
  { id: 47, title: "Meet the Robinsons", year: 2007 },
  { id: 48, title: "Bolt", year: 2008 },
  { id: 49, title: "The Princess and the Frog", year: 2009 },
  { id: 50, title: "Tangled", year: 2010 },
  { id: 51, title: "Winnie the Pooh", year: 2011 },
  { id: 52, title: "Wreck-It Ralph", year: 2012 },
  { id: 53, title: "Frozen", year: 2013 },
  { id: 54, title: "Big Hero 6", year: 2014 },
  { id: 55, title: "Zootopia", year: 2016 },
  { id: 56, title: "Moana", year: 2016 },
  { id: 57, title: "Ralph Breaks the Internet", year: 2018 },
  { id: 58, title: "Frozen II", year: 2019 },
  { id: 59, title: "Raya and the Last Dragon", year: 2021 },
  { id: 60, title: "Encanto", year: 2021 },
  { id: 61, title: "Strange World", year: 2022 },
  { id: 62, title: "Wish", year: 2023 }
];

export const DEFAULT_PERSON_SUGGESTION = "Wife";
export const GEMINI_MODEL_TEXT = "gemini-2.5-flash-preview-04-17";

// --- App Utilities Constants ---
export const UTILITY_IDS: Record<string, UtilityId> = {
  WEIGHT: 'weight',
  DISNEY: 'disney',
  GIFTS: 'gifts',
  TRAIN: 'train',
};

export const DEFAULT_UTILITY_SETTINGS: UtilitySetting[] = [
  { id: UTILITY_IDS.WEIGHT, name: "Weight Tracker", enabled: true, showInMoreMenu: false },
  { id: UTILITY_IDS.DISNEY, name: "Disney Collection", enabled: true, showInMoreMenu: false },
  { id: UTILITY_IDS.GIFTS, name: "Gift Assistant", enabled: true, showInMoreMenu: false },
  { id: UTILITY_IDS.TRAIN, name: "Workout Tracker", enabled: true, showInMoreMenu: false },
];


// --- Workout Tracker Constants ---
export const BAR_WEIGHT = 20; // in kg

export const ALL_LIFTS: LiftType[] = ['Squat', 'Press', 'Deadlift', 'Bench Press'];

export const DEFAULT_PLATE_DENOMINATIONS: number[] = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];

export const getDefaultPlateInventory = (): Plate[] => {
  return DEFAULT_PLATE_DENOMINATIONS.map(d => ({ denomination: d, quantity: 2 })); // Default to 1 pair of each
};

export const getDefaultExerciseSettings = (): ExerciseSettings => {
  const settings: Partial<ExerciseSettings> = {};
  ALL_LIFTS.forEach(lift => {
    settings[lift] = {
      lastAchievedWorksetWeight: BAR_WEIGHT, // Start with the bar
      progressionIncrement: 2.5,
      defaultTimerWarmup: 90, // Default 90 seconds for warmup
      defaultTimerWorkset: 180, // Default 180 seconds for workset
    };
  });
  return settings as ExerciseSettings;
};

export const WORKOUT_DEFINITIONS: WorkoutDefinition[] = [
  {
    name: "Workout A",
    exercises: [
      { lift: 'Squat', worksetSets: 3, worksetReps: 5 },
      { lift: 'Press', worksetSets: 3, worksetReps: 5 },
      { lift: 'Deadlift', worksetSets: 1, worksetReps: 5 },
    ],
  },
  {
    name: "Workout B",
    exercises: [
      { lift: 'Squat', worksetSets: 3, worksetReps: 5 },
      { lift: 'Bench Press', worksetSets: 3, worksetReps: 5 },
      { lift: 'Deadlift', worksetSets: 1, worksetReps: 5 },
    ],
  },
];

// Smallest increment you can add to the bar (e.g., two 0.5kg plates = 1kg)
export const SMALLEST_BAR_INCREMENT = 1;

// For BarbellVisualizer.tsx
export interface PlateVisualStyle { color: string; height: number; thickness: number; }

export const PLATE_VISUAL_STYLES: Record<number, PlateVisualStyle> = {
  25:    { color: '#FF0000', height: 100, thickness: 20 }, // Red
  20:    { color: '#0000FF', height: 95,  thickness: 18 }, // Blue
  15:    { color: '#FFFF00', height: 90,  thickness: 16 }, // Yellow
  10:    { color: '#008000', height: 85,  thickness: 14 }, // Green
  5:     { color: '#FFFFFF', height: 80,  thickness: 12 }, // White (stroke will be needed)
  2.5:   { color: '#333333', height: 75,  thickness: 10 }, // Black/Dark Grey
  1.25:  { color: '#808080', height: 70,  thickness: 8 },  // Grey
  0.5:   { color: '#A9A9A9', height: 65,  thickness: 6 },  // Darker Grey / Silver
};

export const DEFAULT_PLATE_VISUAL_STYLE: PlateVisualStyle = { color: '#CCCCCC', height: 60, thickness: 5 };

export const getPlateVisualStyle = (denomination: number): PlateVisualStyle => {
  return PLATE_VISUAL_STYLES[denomination] || DEFAULT_PLATE_VISUAL_STYLE;
};

export const BAR_VISUAL_COLOR = '#AAAAAA';
export const BAR_SLEEVE_COLOR = '#999999';
export const BAR_TEXT_COLOR = '#000000'; // For text on light plates
export const BAR_TEXT_COLOR_DARK_BG = '#FFFFFF'; // For text on dark plates

// Workout Timer Defaults
export const DEFAULT_TIMER_WARMUP_SECONDS = 90;
export const DEFAULT_TIMER_WORKSET_SECONDS = 180;
