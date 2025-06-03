
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
    const noteNamePart = match[1];
    // Ensure first letter is uppercase for NOTE_MIDI_VALUES lookup
    const normalizedNoteName = noteNamePart.charAt(0).toUpperCase() + noteNamePart.slice(1);
    const octave = parseInt(match[2], 10);

    const baseMidi = NOTE_MIDI_VALUES[normalizedNoteName];
    if (baseMidi === undefined) return null;

    return baseMidi + (octave + 1) * 12; // MIDI C4 is 60, C0 is 12
};

export const getNoteFromMidiValue = (midi: number, preferSharp: boolean = true): string => {
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    const noteName = preferSharp ? MIDI_NOTE_NAMES_SHARP[noteIndex] : MIDI_NOTE_NAMES_FLAT[noteIndex];
    return `${noteName}${octave}`;
};

export const normalizeNoteToSharp = (noteNameWithOctave: string): string => {
    const midiValue = getNoteMidiValue(noteNameWithOctave);
    if (midiValue !== null) {
        return getNoteFromMidiValue(midiValue, true); // true for preferSharp
    }
    // Fallback for notes that can't be converted to MIDI (e.g., malformed)
    const simpleFlatToSharp: Record<string, string> = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    const noteMatch = noteNameWithOctave.match(/^([A-Ga-g][#b]?)([0-9])$/);
    if (noteMatch) {
        const notePart = noteMatch[1];
        const octavePart = noteMatch[2];
        if (simpleFlatToSharp[notePart]) {
            return `${simpleFlatToSharp[notePart]}${octavePart}`;
        }
    }
    return noteNameWithOctave; // Return original if no conversion possible
};


export interface ChordParseResult {
    rootNote: string; // e.g., "C", "F#"
    chordType: string; // e.g., "maj", "m", "7", "m7", "maj7", "dim", "aug", "m7b5"
    bassNote?: string; // e.g., "G" for "Am/G"
}

export const getChordRootAndType = (chordName: string): ChordParseResult | null => {
    // Order matters: longer/more specific alternatives first
    // Changed \/ to [/] for matching the slash in bass notes
    const chordRegex = /^([A-Ga-g][#b]?)(min7b5|dom7b5|m7-5|dom7#5|maj7|maj6|min6|sus4|sus2|dim7|m7b5|7b5|7-5|7#5|7\+5|m7|m6|dim|aug|maj|sus|M|m|7|6)?(?:add([0-9]+))?(?:\(([#b]?[0-9]+(?:,[#b]?[0-9]+)*)\))?(?:[/]([A-Ga-g][#b]?))?$/;

    const match = chordName.match(chordRegex);
    if (!match) return null;

    let rootNote = match[1];
    let typePart = match[2] || ''; 
    const bassNote = match[5];

    rootNote = rootNote.charAt(0).toUpperCase() + (rootNote.length > 1 ? rootNote.substring(1) : '');

    let finalChordType = typePart;
    if (typePart === 'M' || typePart === 'maj' || typePart === '') {
        finalChordType = 'maj';
    } else if (typePart === 'm') {
        finalChordType = 'min';
    } else if (typePart === '7') {
        finalChordType = 'dom7';
    } else if (typePart === '6' || typePart === 'maj6') {
        finalChordType = 'maj6';
    } else if (typePart === 'm6' || typePart === 'min6') {
        finalChordType = 'min6';
    } else if (typePart === '7-5' || typePart === '7b5' || typePart === 'dom7b5') {
        finalChordType = 'dom7b5';
    } else if (typePart === '7#5' || typePart === '7+5' || typePart === 'dom7#5') {
        finalChordType = 'dom7#5';
    } else if (typePart === 'm7-5' || typePart === 'min7b5' || typePart === 'm7b5') { // ensure m7b5 from regex is covered
        finalChordType = 'min7b5'; // Normalized type
    } else if (typePart === 'sus') {
        finalChordType = 'sus4'; // Default 'sus' to 'sus4'
    }
    // Other types like maj7, min7, dim, aug, dim7, sus4, sus2 remain as captured by regex if not normalized above.

    return {
        rootNote,
        chordType: finalChordType,
        bassNote: bassNote ? (bassNote.charAt(0).toUpperCase() + (bassNote.length > 1 ? bassNote.substring(1) : '')) : undefined,
    };
};

// Returns MIDI intervals from the root note (0)
export const getIntervalsForChordType = (chordType: string): number[] => {
    switch (chordType) {
        case 'maj': return [0, 4, 7]; 
        case 'min': return [0, 3, 7]; 
        case 'dom7': return [0, 4, 10]; // Omitting 5th for 3-note voicing
        case 'maj7': return [0, 4, 7, 11]; 
        case 'min7': return [0, 3, 7, 10]; 
        case 'dim': return [0, 3, 6]; 
        case 'aug': return [0, 4, 8]; 
        case 'min7b5': return [0, 3, 6, 10]; // also m7b5
        case 'dim7': return [0, 3, 6, 9]; 
        case 'maj6': return [0, 4, 7, 9]; 
        case 'min6': return [0, 3, 7, 9]; 
        case 'dom7b5': return [0, 4, 6, 10]; // Root, M3, b5, m7
        case 'dom7#5': return [0, 4, 8, 10]; // Root, M3, #5, m7
        case 'sus4': return [0, 5, 7]; 
        case 'sus2': return [0, 2, 7];
        default: return []; // Return empty for unknown types, generateChordVoicings will then use AI notes if available.
    }
};


export const generateChordVoicings = (
    chordNameStr: string,
    minMidi: number = 36, // C2
    maxMidi: number = 84, // C6
    aiSuggestedNotesInput?: string[]
): string[][] => {
    const allVoicingsSet = new Set<string>();
    const parsedChord = getChordRootAndType(chordNameStr);

    if (parsedChord) {
        const rootMidiVal = getNoteMidiValue(parsedChord.rootNote + "0"); 
        const intervals = getIntervalsForChordType(parsedChord.chordType);

        if (rootMidiVal !== null && intervals.length > 0) {
            const numNotesInChord = intervals.length;
            for (let octaveOffset = 2; octaveOffset <= 4; octaveOffset++) { 
                const currentRootMidi = rootMidiVal + octaveOffset * 12;
                const baseVoicingMidi = intervals.map(interval => currentRootMidi + interval);

                for (let i = 0; i < numNotesInChord; i++) { 
                    let inversionMidi = [...baseVoicingMidi];
                    for (let j = 0; j < i; j++) {
                        inversionMidi[j] += 12; 
                    }
                    inversionMidi.sort((a, b) => a - b); 

                    for (let octaveShift = -1; octaveShift <= 1; octaveShift++) { 
                        const shiftedInversionMidi = inversionMidi.map(note => note + octaveShift * 12);
                        const lowestNote = Math.min(...shiftedInversionMidi);
                        const highestNote = Math.max(...shiftedInversionMidi);
                        if (lowestNote >= minMidi && highestNote <= maxMidi) {
                            const voicingNotesStr = shiftedInversionMidi.map(midi => getNoteFromMidiValue(midi, true));
                            allVoicingsSet.add(JSON.stringify(voicingNotesStr.sort())); 
                        }
                    }
                }
            }
        } else if (aiSuggestedNotesInput && aiSuggestedNotesInput.length > 0) {
            // Fallback to AI suggested notes if intervals are unknown for a parsed chord type
            const normalizedAiNotes = aiSuggestedNotesInput.map(normalizeNoteToSharp);
            const normalizedAiNotesMidi = normalizedAiNotes.map(n => getNoteMidiValue(n)).filter(m => m !== null) as number[];

            if (normalizedAiNotesMidi.length === normalizedAiNotes.length && normalizedAiNotesMidi.length > 0) {
                normalizedAiNotesMidi.sort((a, b) => a - b);
                const baseLowestMidi = normalizedAiNotesMidi[0];
                const relativeIntervals = normalizedAiNotesMidi.map(midi => midi - baseLowestMidi);
                const maxRelativeInterval = Math.max(...relativeIntervals);

                for (let currentLowestNoteMidi = minMidi; currentLowestNoteMidi <= maxMidi - maxRelativeInterval; currentLowestNoteMidi++) {
                    const potentialVoicingMidi = relativeIntervals.map(interval => currentLowestNoteMidi + interval);
                    if (potentialVoicingMidi.every(midi => midi >= minMidi && midi <= maxMidi)) {
                        const voicingNotesStr = potentialVoicingMidi.map(midi => getNoteFromMidiValue(midi, true));
                        allVoicingsSet.add(JSON.stringify(voicingNotesStr.sort()));
                    }
                }
            }
        }
    } else if (aiSuggestedNotesInput && aiSuggestedNotesInput.length > 0) {
        // Fallback if chordNameStr is not parseable at all, but AI notes are provided
        const normalizedAiNotes = aiSuggestedNotesInput.map(normalizeNoteToSharp);
        const normalizedAiNotesMidi = normalizedAiNotes.map(n => getNoteMidiValue(n)).filter(m => m !== null) as number[];

        if (normalizedAiNotesMidi.length === normalizedAiNotes.length && normalizedAiNotesMidi.length > 0) {
            normalizedAiNotesMidi.sort((a, b) => a - b);
            const baseLowestMidi = normalizedAiNotesMidi[0];
            const relativeIntervals = normalizedAiNotesMidi.map(midi => midi - baseLowestMidi);
            const maxRelativeInterval = Math.max(...relativeIntervals);
            
            for (let currentLowestNoteMidi = minMidi; currentLowestNoteMidi <= maxMidi - maxRelativeInterval; currentLowestNoteMidi++) {
                const potentialVoicingMidi = relativeIntervals.map(interval => currentLowestNoteMidi + interval);
                 // Check if all notes in the potential voicing are within the maxMidi range as well.
                // The loop condition `currentLowestNoteMidi <= maxMidi - maxRelativeInterval` ensures the highest note won't exceed maxMidi.
                // The `currentLowestNoteMidi >= minMidi` part is implicitly handled by loop start.
                if (potentialVoicingMidi.every(midi => midi <= maxMidi)) { // Simplified check
                    const voicingNotesStr = potentialVoicingMidi.map(midi => getNoteFromMidiValue(midi, true));
                    allVoicingsSet.add(JSON.stringify(voicingNotesStr.sort()));
                }
            }
        }
    }


    const uniqueVoicings: string[][] = Array.from(allVoicingsSet).map(strVoicing => JSON.parse(strVoicing));
    uniqueVoicings.sort((voicingA, voicingB) => {
        const midiA = voicingA.map(n => getNoteMidiValue(n) || 0);
        const midiB = voicingB.map(n => getNoteMidiValue(n) || 0);
        const lowestA = Math.min(...midiA);
        const lowestB = Math.min(...midiB);
        if (lowestA !== lowestB) return lowestA - lowestB;
        const sumA = midiA.reduce((s, n) => s + n, 0);
        const sumB = midiB.reduce((s, n) => s + n, 0);
        return sumA - sumB;
    });

    return uniqueVoicings;
};


export const calculateRequiredOctavesAndStartForVoicing = (
  notes: string[], 
  preferredOctaveSpan?: number 
): { numOctaves: number; startOctave: number } => {
  if (!notes || notes.length === 0) {
    return { numOctaves: preferredOctaveSpan || 2, startOctave: 3 }; 
  }

  const midiValues = notes.map(note => getNoteMidiValue(note) || 0).filter(mv => mv > 0);
  if (midiValues.length === 0) {
    return { numOctaves: preferredOctaveSpan || 2, startOctave: 3 };
  }

  const minMidi = Math.min(...midiValues);
  const maxMidi = Math.max(...midiValues);
  
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
    .flat() 
    .map(note => getNoteMidiValue(note))
    .filter(mv => mv !== null) as number[];

  if (allMidiValues.length === 0) {
    return { numOctaves: defaultNumOctaves, startOctave: defaultStartOctave };
  }

  const minMidi = Math.min(...allMidiValues);
  const maxMidi = Math.max(...allMidiValues);

  let numOctaves = Math.ceil((maxMidi - minMidi + 1) / 12);
  numOctaves = Math.max(1, numOctaves); 

  let startOctave = Math.floor((minMidi -12) / 12);

  startOctave = Math.max(0, Math.min(startOctave, 8 - numOctaves)); 
  
  if (startOctave + numOctaves -1 < Math.floor((maxMidi-12)/12) ) {
      numOctaves = Math.floor((maxMidi-12)/12) - startOctave + 1;
  }
  numOctaves = Math.max(1, numOctaves);


  return { numOctaves, startOctave };
};
