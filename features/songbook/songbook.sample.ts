
import { SavedPianoSong, PianoAnalysisResult, SavedUniqueChordDefinition, ChordProgressionItem, ChordSimplificationOption } from '../../types';
import { generateChordVoicings, normalizeNoteToSharp } from '../piano-helper/pianoHelper.utils';

const today = new Date();
const daysAgo = (days: number): string => {
    const date = new Date(today);
    date.setDate(today.getDate() - days);
    return date.toISOString();
};

const createSampleSimplificationOptions = (chordName: string, aiNotes: string[]): ChordSimplificationOption[] => {
    const normalizedAiNotes = aiNotes.map(normalizeNoteToSharp);
    const { voicings, targetVoicingIndex } = generateChordVoicings(normalizedAiNotes, undefined, undefined, normalizedAiNotes);
    // For sample data, ensure at least one voicing, even if it's just the base notes if generateChordVoicings returns empty.
    const finalVoicings = voicings.length > 0 ? voicings : (normalizedAiNotes.length > 0 ? [normalizedAiNotes] : []);
    const effectiveVoicingIndex = targetVoicingIndex !== -1 ? targetVoicingIndex : 0;

    return [
        {
            name: `Original (${chordName})`,
            baseNotes: normalizedAiNotes,
            allVoicings: finalVoicings,
            isOriginal: true,
            lastSelectedVoicingIndex: effectiveVoicingIndex,
        }
    ];
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

const sampleSavedUniqueChords1: SavedUniqueChordDefinition[] = sampleAnalysis1.uniqueChords.map(uc => {
    const simplOptions = createSampleSimplificationOptions(uc.chordName, uc.aiSuggestedNotes);
    const originalOption = simplOptions.find(opt => opt.isOriginal);
    return {
        chordName: uc.chordName,
        aiSuggestedNotes: uc.aiSuggestedNotes,
        selectedSimplificationName: originalOption ? originalOption.name : `Original (${uc.chordName})`,
        selectedVoicingIndex: originalOption?.lastSelectedVoicingIndex ?? 0,
        simplificationOptions: simplOptions,
    };
});


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
const sampleSavedUniqueChords2: SavedUniqueChordDefinition[] = sampleAnalysis2.uniqueChords.map(uc => {
    const simplOptions = createSampleSimplificationOptions(uc.chordName, uc.aiSuggestedNotes);
    const originalOption = simplOptions.find(opt => opt.isOriginal);
    return {
        chordName: uc.chordName,
        aiSuggestedNotes: uc.aiSuggestedNotes,
        selectedSimplificationName: originalOption ? originalOption.name : `Original (${uc.chordName})`,
        selectedVoicingIndex: originalOption?.lastSelectedVoicingIndex ?? 0,
        simplificationOptions: simplOptions,
    };
});


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
const sampleSavedUniqueChordsHB: SavedUniqueChordDefinition[] = sampleAnalysisHappyBirthday.uniqueChords.map(uc => {
    const simplOptions = createSampleSimplificationOptions(uc.chordName, uc.aiSuggestedNotes);
    const originalOption = simplOptions.find(opt => opt.isOriginal);
    return {
        chordName: uc.chordName,
        aiSuggestedNotes: uc.aiSuggestedNotes,
        selectedSimplificationName: originalOption ? originalOption.name : `Original (${uc.chordName})`,
        selectedVoicingIndex: originalOption?.lastSelectedVoicingIndex ?? 0,
        simplificationOptions: simplOptions,
    };
});


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