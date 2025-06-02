// features/piano-helper/pianoHelper.utils.ts

export const NOTE_MIDI_VALUES: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
    'F': 5, 'E#':5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
};

export const MIDI_NOTE_NAMES_SHARP: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MIDI_NOTE_NAMES_FLAT: string[] = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];


export const getNoteMidiValue = (note: string): number | null => {
    const match = note.match(/^([A-Ga-g][#b]?)([0-9])$/);
    if (!match) return null;
    const noteName = match[1].toUpperCase();
    const octave = parseInt(match[2], 10);

    const baseMidi = NOTE_MIDI_VALUES[noteName];
    if (baseMidi === undefined) return null;

    return baseMidi + (octave + 1) * 12; // MIDI C4 is 60, C0 is 12
};

export const getNoteFromMidiValue = (midi: number, preferSharp: boolean = true): string => {
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    const noteName = preferSharp ? MIDI_NOTE_NAMES_SHARP[noteIndex] : MIDI_NOTE_NAMES_FLAT[noteIndex];
    return `${noteName}${octave}`;
};


export interface ChordParseResult {
    rootNote: string; // e.g., "C", "F#"
    chordType: string; // e.g., "maj", "m", "7", "m7", "maj7", "dim", "aug", "m7b5"
    bassNote?: string; // e.g., "G" for "Am/G"
}

export const getChordRootAndType = (chordName: string): ChordParseResult | null => {
    // Regex to capture root, quality/type, and optional bass note
    // Supports: C, Cm, Cmaj7, C7, Cm7, Cdim, Caug, C#, Cb, C#m7, C/G, C#m7/G#
    const chordRegex = /^([A-Ga-g][#b]?)(maj7|m7b5|m7|7|dim7|dim|aug|m|M|maj|sus4|sus2|sus)?(?:add([0-9]+))?(?:\(([#b]?[0-9]+(?:,[#b]?[0-9]+)*)\))?(?:\/([A-Ga-g][#b]?))?$/;

    const match = chordName.match(chordRegex);
    if (!match) return null;

    let rootNote = match[1];
    let typePart = match[2] || ''; // e.g., m7, maj7, 7, dim, aug, m, M
    const addPart = match[3]; // e.g., 9 for add9
    const alterationsPart = match[4]; // e.g., b5,#9
    const bassNote = match[5];

    // Normalize root note (e.g., c# -> C#)
    rootNote = rootNote.charAt(0).toUpperCase() + (rootNote.length > 1 ? rootNote.substring(1) : '');

    // Normalize type
    if (typePart === 'M' || typePart === 'maj' || typePart === '') typePart = 'maj';
    if (typePart === 'm') typePart = 'min'; // Standardize to 'min' for minor
    // m7, maj7, 7, dim, aug are usually fine
    // m7b5 is also fine
    if (typePart === 'dim7') typePart = 'dim7'; // Keep distinct from 'dim' (triad)


    // Basic mapping, can be expanded for complex chords (sus, add, alterations)
    let finalChordType = typePart;
    if (typePart === 'maj' && !addPart && !alterationsPart) finalChordType = 'maj'; // Major triad
    else if (typePart === 'min' && !addPart && !alterationsPart) finalChordType = 'min'; // Minor triad
    else if (typePart === '7') finalChordType = 'dom7'; // Dominant 7th
    else if (typePart === 'maj7') finalChordType = 'maj7';
    else if (typePart === 'm7') finalChordType = 'min7';
    else if (typePart === 'm7b5') finalChordType = 'm7b5'; // Half-diminished
    else if (typePart === 'dim') finalChordType = 'dim'; // Diminished triad
    else if (typePart === 'dim7') finalChordType = 'dim7'; // Diminished 7th
    else if (typePart === 'aug') finalChordType = 'aug'; // Augmented triad
    // TODO: Handle sus, add, alterations if needed for more complex chords.

    return {
        rootNote,
        chordType: finalChordType,
        bassNote: bassNote ? (bassNote.charAt(0).toUpperCase() + (bassNote.length > 1 ? bassNote.substring(1) : '')) : undefined,
    };
};

// Returns MIDI intervals from the root note (0)
export const getIntervalsForChordType = (chordType: string): number[] => {
    switch (chordType) {
        case 'maj': return [0, 4, 7]; // Root, Major 3rd, Perfect 5th
        case 'min': return [0, 3, 7]; // Root, Minor 3rd, Perfect 5th
        case 'dom7': return [0, 4, 10]; // Root, Major 3rd, Minor 7th (5th omitted per rule)
        case 'maj7': return [0, 4, 7, 11]; // Root, Major 3rd, Perfect 5th, Major 7th
        case 'min7': return [0, 3, 7, 10]; // Root, Minor 3rd, Perfect 5th, Minor 7th
        case 'dim': return [0, 3, 6]; // Root, Minor 3rd, Diminished 5th
        case 'aug': return [0, 4, 8]; // Root, Major 3rd, Augmented 5th
        case 'm7b5': return [0, 3, 6, 10]; // Root, Minor 3rd, Diminished 5th, Minor 7th (Half-diminished)
        case 'dim7': return [0, 3, 6, 9]; // Root, Minor 3rd, Diminished 5th, Diminished 7th (Fully diminished)
        // Add more complex types as needed
        default: return [0, 4, 7]; // Default to major triad if type unknown
    }
};


export const generateChordVoicings = (
    chordNameStr: string,
    minMidi: number = 36, // C2
    maxMidi: number = 84, // C6
): string[][] => {
    const parsedChord = getChordRootAndType(chordNameStr);
    if (!parsedChord) return [];

    const rootMidiVal = getNoteMidiValue(parsedChord.rootNote + "0"); // Get root midi for octave 0 as base
    if (rootMidiVal === null) return [];
    
    const intervals = getIntervalsForChordType(parsedChord.chordType);
    const numNotesInChord = intervals.length;

    const allVoicingsSet = new Set<string>(); // To store stringified sorted voicings to ensure uniqueness

    // Iterate through possible octaves for the root note to start generating base voicings
    for (let octaveOffset = 2; octaveOffset <= 4; octaveOffset++) { // Start root around octave 2, 3, 4
        const currentRootMidi = rootMidiVal + octaveOffset * 12;
        
        const baseVoicingMidi = intervals.map(interval => currentRootMidi + interval);

        // Generate inversions for this base voicing
        for (let i = 0; i < numNotesInChord; i++) { // i is the number of notes to move to top
            let inversionMidi = [...baseVoicingMidi];
            for (let j = 0; j < i; j++) {
                inversionMidi[j] += 12; // Move the j-th note (originally lowest) up an octave
            }
            inversionMidi.sort((a, b) => a - b); // Keep notes in order

            // Generate octave shifts for this specific inversion
            for (let octaveShift = -1; octaveShift <= 1; octaveShift++) { // Shift up/down one octave
                const shiftedInversionMidi = inversionMidi.map(note => note + octaveShift * 12);

                // Check if this voicing is within the desired piano range
                const lowestNote = Math.min(...shiftedInversionMidi);
                const highestNote = Math.max(...shiftedInversionMidi);
                if (lowestNote >= minMidi && highestNote <= maxMidi) {
                    const voicingNotesStr = shiftedInversionMidi.map(midi => getNoteFromMidiValue(midi, true));
                    allVoicingsSet.add(JSON.stringify(voicingNotesStr.sort())); // Store sorted string to ensure uniqueness of note sets
                }
            }
        }
    }

    // Convert unique stringified voicings back to arrays of notes
    const uniqueVoicings: string[][] = Array.from(allVoicingsSet).map(strVoicing => JSON.parse(strVoicing));

    // Sort voicings: primary sort by lowest note, secondary by sum of MIDI values (as a tie-breaker for compactness)
    uniqueVoicings.sort((voicingA, voicingB) => {
        const midiA = voicingA.map(n => getNoteMidiValue(n) || 0);
        const midiB = voicingB.map(n => getNoteMidiValue(n) || 0);
        
        const lowestA = Math.min(...midiA);
        const lowestB = Math.min(...midiB);

        if (lowestA !== lowestB) {
            return lowestA - lowestB;
        }
        // Tie-breaker: sum of midi values (lower sum might mean more compact voicing for the same lowest note)
        const sumA = midiA.reduce((s, n) => s + n, 0);
        const sumB = midiB.reduce((s, n) => s + n, 0);
        return sumA - sumB;
    });

    return uniqueVoicings;
};


export const calculateRequiredOctavesAndStartForVoicing = (
  notes: string[], // A single voicing (array of note strings)
  preferredOctaveSpan?: number // The number of octaves you'd LIKE to display it in
): { numOctaves: number; startOctave: number } => {
  if (!notes || notes.length === 0) {
    return { numOctaves: preferredOctaveSpan || 2, startOctave: 3 }; // Default
  }

  const midiValues = notes.map(note => getNoteMidiValue(note) || 0).filter(mv => mv > 0);
  if (midiValues.length === 0) {
    return { numOctaves: preferredOctaveSpan || 2, startOctave: 3 };
  }

  const minMidi = Math.min(...midiValues);
  const maxMidi = Math.max(...midiValues);
  
  // Minimum number of octaves strictly required to show all notes in this single voicing
  const actualMinOctavesForVoicing = Math.max(1, Math.ceil((maxMidi - minMidi + 1) / 12));

  let targetNumOctaves = preferredOctaveSpan 
    ? Math.max(actualMinOctavesForVoicing, preferredOctaveSpan)
    : actualMinOctavesForVoicing;
  
  if (preferredOctaveSpan && preferredOctaveSpan < actualMinOctavesForVoicing) {
    targetNumOctaves = actualMinOctavesForVoicing;
  }

  const minNoteOctave = Math.floor((minMidi -12) / 12); 

  let optimalStartOctave;
  const centerOfVoicingMidi = (minMidi + maxMidi) / 2;
  const centerOfVoicingOctave = Math.floor((centerOfVoicingMidi -12) / 12);
  optimalStartOctave = centerOfVoicingOctave - Math.floor((targetNumOctaves - 1) / 2);
  
  if (minNoteOctave < optimalStartOctave) {
      optimalStartOctave = minNoteOctave;
  }
  const maxNoteOctave = Math.floor((maxMidi -12) / 12);
  if (maxNoteOctave >= optimalStartOctave + targetNumOctaves) {
      optimalStartOctave = maxNoteOctave - targetNumOctaves + 1;
  }
  
  optimalStartOctave = Math.max(0, Math.min(optimalStartOctave, 8 - targetNumOctaves + 1)); 

  return { numOctaves: targetNumOctaves, startOctave: optimalStartOctave };
};


/**
 * Calculates the overall octave range required to display a collection of note sets (voicings).
 * @param allNoteSets An array of note arrays (e.g., [["C4", "E4", "G4"], ["G3", "B3", "D4"]]).
 * @param defaultNumOctaves Fallback number of octaves if no notes are provided.
 * @param defaultStartOctave Fallback start octave if no notes are provided.
 * @returns An object { numOctaves: number, startOctave: number }.
 */
export const calculateOverallOctaveRange = (
  allNoteSets: string[][],
  defaultNumOctaves: number = 2,
  defaultStartOctave: number = 3
): { numOctaves: number; startOctave: number } => {
  const allMidiValues = allNoteSets
    .flat() // Flatten the array of arrays into a single array of notes
    .map(note => getNoteMidiValue(note))
    .filter(mv => mv !== null) as number[];

  if (allMidiValues.length === 0) {
    return { numOctaves: defaultNumOctaves, startOctave: defaultStartOctave };
  }

  const minMidi = Math.min(...allMidiValues);
  const maxMidi = Math.max(...allMidiValues);

  let numOctaves = Math.ceil((maxMidi - minMidi + 1) / 12);
  numOctaves = Math.max(1, numOctaves); // Ensure at least 1 octave

  // Calculate startOctave based on the absolute minMidi
  // MIDI C0 = 12, C1 = 24, ..., Octave 'o' starts at (o+1)*12
  // So, octave = floor(midi/12) - 1
  let startOctave = Math.floor((minMidi -12) / 12);

  // Clamp startOctave to valid range (e.g., 0 to 7 for C0-C7, if max 8 total octaves displayed)
  // The highest possible start octave is such that startOctave + numOctaves - 1 < 8 (max typical piano display)
  // So, startOctave < 8 - numOctaves + 1
  startOctave = Math.max(0, Math.min(startOctave, 8 - numOctaves)); 
  
  // Adjust numOctaves if clamping startOctave pushes maxMidi out of view
  if (startOctave + numOctaves -1 < Math.floor((maxMidi-12)/12) ) {
      numOctaves = Math.floor((maxMidi-12)/12) - startOctave + 1;
  }
  numOctaves = Math.max(1, numOctaves);


  return { numOctaves, startOctave };
};