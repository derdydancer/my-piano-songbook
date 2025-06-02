
import { SavedPianoSong, PianoAnalysisResult, SavedUniqueChordDefinition, ChordProgressionItem } from '../../types';
// Assuming generateChordVoicings is available for sample data generation or we precompute
// For simplicity, we'll manually define some selectedVoicingIndex values assuming a known generation order.

const today = new Date();
const daysAgo = (days: number): string => {
    const date = new Date(today);
    date.setDate(today.getDate() - days);
    return date.toISOString();
};

const sampleAnalysis1: PianoAnalysisResult = { // This is the AI's output structure
    songTitle: "Twinkle Twinkle Little Star",
    lyricsBy: "Jane Taylor (lyrics)",
    musicBy: "French Melody (traditional)",
    uniqueChords: [ // AIUniqueChordDefinition
        { chordName: "C", aiSuggestedNotes: ["C4", "E4", "G4"] },
        { chordName: "G", aiSuggestedNotes: ["G3", "B3", "D4"] },
        { chordName: "F", aiSuggestedNotes: ["F3", "A3", "C4"] },
    ],
    chordProgression: [
        { chordName: "C", originalContext: "[C]Twinkle, twinkle, little star," },
        { chordName: "G", originalContext: "How I [G]wonder what you are." },
        { chordName: "F", originalContext: "Up a[F]bove the world so [C]high," },
        { chordName: "C", originalContext: "Like a [C]diamond in the sky." },
        { chordName: "G", originalContext: "[G]Twinkle, twinkle, little [C]star," },
        { chordName: "C", originalContext: "How I [C]wonder what you are." }
    ]
};

const sampleSavedUniqueChords1: SavedUniqueChordDefinition[] = [
    { chordName: "C", selectedNotes: ["C4", "E4", "G4"], selectedVoicingIndex: 0 }, // Assume 0 is root position
    { chordName: "G", selectedNotes: ["G3", "B3", "D4"], selectedVoicingIndex: 0 },
    { chordName: "F", selectedNotes: ["F3", "A3", "C4"], selectedVoicingIndex: 0 },
];

const sampleAnalysis2: PianoAnalysisResult = {
    songTitle: "Ode to Joy (Simplified)",
    musicBy: "Ludwig van Beethoven",
    uniqueChords: [
        { chordName: "C", aiSuggestedNotes: ["C4","E4","G4"] },
        { chordName: "G", aiSuggestedNotes: ["G3","B3","D4"] },
        { chordName: "Am", aiSuggestedNotes: ["A3","C4","E4"] },
        { chordName: "F", aiSuggestedNotes: ["F3","A3","C4"] },
    ],
    chordProgression: [
        { chordName: "C" }, { chordName: "C" }, { chordName: "G" }, { chordName: "G" },
        { chordName: "Am" }, { chordName: "Am" }, { chordName: "F" }, { chordName: "F" },
        { chordName: "C" }, { chordName: "G" }, { chordName: "C" }
    ]
};
const sampleSavedUniqueChords2: SavedUniqueChordDefinition[] = [
    { chordName: "C", selectedNotes: ["C4","E4","G4"], selectedVoicingIndex: 0 },
    { chordName: "G", selectedNotes: ["G3","B3","D4"], selectedVoicingIndex: 0 },
    { chordName: "Am", selectedNotes: ["A3","C4","E4"], selectedVoicingIndex: 0 },
    { chordName: "F", selectedNotes: ["F3","A3","C4"], selectedVoicingIndex: 0 },
];


const sampleAnalysisHappyBirthday: PianoAnalysisResult = {
    songTitle: "Happy Birthday",
    uniqueChords: [
      { chordName: "G", aiSuggestedNotes: ["G3", "B3", "D4"] },
      { chordName: "C", aiSuggestedNotes: ["C4", "E4", "G4"] },
      { chordName: "D7", aiSuggestedNotes: ["D4", "F#4", "C5"] }, // AI suggests simplified 7th
    ],
    chordProgression: [
      { chordName: "G", originalContext: "Happy [G]Birthday to you," },
      { chordName: "G", originalContext: "Happy [G]Birthday to you," },
      { chordName: "C", originalContext: "Happy [C]Birthday dear Friend," },
      { chordName: "G", originalContext: "Happy [G]Birthday to [D7]you." },
      { chordName: "D7", originalContext: "Happy Birthday to [G]you." },
      { chordName: "G", originalContext: "Happy Birthday to [G]you." },
    ]
};
const sampleSavedUniqueChordsHB: SavedUniqueChordDefinition[] = [
    { chordName: "G", selectedNotes: ["G3", "B3", "D4"], selectedVoicingIndex: 0 },
    { chordName: "C", selectedNotes: ["C4", "E4", "G4"], selectedVoicingIndex: 0 },
    // For D7, let's assume the first generated voicing for ["D4", "F#4", "C5"] is index 0.
    // Actual voicings would be D F# C, F# C D, C D F# in various octaves.
    { chordName: "D7", selectedNotes: ["D4", "F#4", "C5"], selectedVoicingIndex: 0 }, 
];


export const sampleSavedPianoSongs: SavedPianoSong[] = [
  {
    id: 'song1',
    songTitle: sampleAnalysis1.songTitle!,
    lyricsBy: sampleAnalysis1.lyricsBy,
    musicBy: sampleAnalysis1.musicBy,
    sourceText: "[C]Twinkle, twinkle, little star,\nHow I [G]wonder what you are.\n[F]Up above the world so [C]high,\n[G]Like a diamond in the [C]sky.",
    analysisResult: { // Nested structure for SavedPianoSong
        songTitle: sampleAnalysis1.songTitle,
        lyricsBy: sampleAnalysis1.lyricsBy,
        musicBy: sampleAnalysis1.musicBy,
        uniqueChords: sampleSavedUniqueChords1,
        chordProgression: sampleAnalysis1.chordProgression,
    },
    dateAdded: daysAgo(5),
  },
  {
    id: 'song2',
    songTitle: "Happy Birthday",
    analysisResult: {
        songTitle: sampleAnalysisHappyBirthday.songTitle,
        uniqueChords: sampleSavedUniqueChordsHB,
        chordProgression: sampleAnalysisHappyBirthday.chordProgression,
    },
    dateAdded: daysAgo(2),
  },
  {
    id: 'song3',
    songTitle: sampleAnalysis2.songTitle!,
    musicBy: sampleAnalysis2.musicBy,
     analysisResult: {
        songTitle: sampleAnalysis2.songTitle,
        musicBy: sampleAnalysis2.musicBy,
        uniqueChords: sampleSavedUniqueChords2,
        chordProgression: sampleAnalysis2.chordProgression,
    },
    dateAdded: daysAgo(10)
  }
].sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
