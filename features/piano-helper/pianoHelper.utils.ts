// features/piano-helper/pianoHelper.utils.ts
import { ChordAnalysis, ChordSimplificationOption } from '../../types'; // Import ChordAnalysis type

export const NOTE_MIDI_VALUES: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
    'F': 5, 'E#':5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
};

export const MIDI_NOTE_NAMES_SHARP: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MIDI_NOTE_NAMES_FLAT: string[] = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const MAX_SPAN_SEMITONES = 14; // Increased from 12 to 14 for more voicing options


export const getNoteMidiValue = (note: string): number | null => {
    const match = note.match(/^([A-Ga-g][#b]?)([0-9])$/);
    if (!match) return null;
    const noteNamePart = match[1];
    // Ensure first letter is uppercase for NOTE_MIDI_VALUES lookup
    const normalizedNoteName = noteNamePart.charAt(0).toUpperCase() + noteNamePart.slice(1);
    const octave = parseInt(match[2], 10);

    const baseMidi = NOTE_MIDI_VALUES[normalizedNoteName];
    if (baseMidi === undefined) return null;

    return baseMidi + ((octave + 1) * 12);
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
    // Fallback for notes without octave, though less common in this context
    const simpleFlatToSharp: Record<string, string> = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    const noteMatch = noteNameWithOctave.match(/^([A-Ga-g][#b]?)([0-9]?)$/); // Octave is optional
    if (noteMatch) {
        const notePart = noteMatch[1].charAt(0).toUpperCase() + noteMatch[1].slice(1);
        const octavePart = noteMatch[2] || ''; // Handle no octave
        if (simpleFlatToSharp[notePart]) {
            return `${simpleFlatToSharp[notePart]}${octavePart}`;
        }
         // Ensure note part itself is sharp if it's like "C"
        if (notePart.length === 1 && MIDI_NOTE_NAMES_SHARP.includes(notePart)) {
            return `${notePart}${octavePart}`;
        }
    }
    return noteNameWithOctave; 
};

/**
 * Given a root note (with octave) and a list of semitone intervals from that root,
 * returns an array of note names.
 * @param rootNoteWithOctave The root note string, e.g., "C4", "G#3".
 * @param intervals Array of semitone numbers (e.g., 0 for root, 4 for M3, 7 for P5).
 * @returns Array of note name strings.
 */
const getNotesFromIntervals = (rootNoteWithOctave: string, intervals: number[]): string[] => {
    const rootMidi = getNoteMidiValue(rootNoteWithOctave);
    if (rootMidi === null) {
        console.warn(`Could not get MIDI value for root note: ${rootNoteWithOctave}`);
        return [];
    }

    return intervals.map(interval => {
        const targetMidi = rootMidi + interval;
        return getNoteFromMidiValue(targetMidi, true); // preferSharp = true
    });
};


export const generateChordVoicings = (
    _chordNameStr: string,
    minMidi: number = 36, // C2
    maxMidi: number = 84, // C6
    baseNotesInput?: string[],
    targetVoicingToFind?: string[]
): { voicings: string[][], targetVoicingIndex: number } => {
    const allResultVoicingsSet = new Set<string>();

    if (!baseNotesInput || baseNotesInput.length === 0) {
        return { voicings: [], targetVoicingIndex: -1 };
    }
    
    const uniquePitchClasses: number[] = Array.from(new Set(
        baseNotesInput
            .map(n => getNoteMidiValue(normalizeNoteToSharp(n)))
            .filter(m => m !== null)
            .map(m => (m as number) % 12)
    )).sort((a, b) => a - b);

    if (uniquePitchClasses.length === 0) {
        return { voicings: [], targetVoicingIndex: -1 };
    }

    const numNotesInChord = uniquePitchClasses.length;

    const findVoicingCombinationsRecursive = (
        pitchClassIdx: number,
        currentMidiVoicing: number[]
    ) => {
        if (allResultVoicingsSet.size >= 150) return; // Increased limit slightly

        if (pitchClassIdx === numNotesInChord) {
            const sortedVoicing = [...currentMidiVoicing].sort((a, b) => a - b);
            if (sortedVoicing.length === 0) return; // Should not happen if numNotesInChord > 0
            const lowestNote = sortedVoicing[0];
            const highestNote = sortedVoicing[sortedVoicing.length - 1];
            const span = highestNote - lowestNote;

            if (lowestNote >= minMidi && highestNote <= maxMidi && span <= MAX_SPAN_SEMITONES) {
                allResultVoicingsSet.add(JSON.stringify(sortedVoicing.map(m => getNoteFromMidiValue(m, true))));
            }
            return;
        }

        const currentPitchClass = uniquePitchClasses[pitchClassIdx];
        const startOctaveSearch = Math.max(0, Math.floor(minMidi / 12) - 2); 
        const endOctaveSearch = Math.min(8, Math.ceil(maxMidi / 12) + 2);

        for (let octaveNum = startOctaveSearch; octaveNum <= endOctaveSearch; octaveNum++) {
            const midiValue = currentPitchClass + ((octaveNum + 1) * 12);
            if (midiValue >= minMidi - 12 && midiValue <= maxMidi + 12) { // Slightly wider search before span check
                currentMidiVoicing.push(midiValue);
                findVoicingCombinationsRecursive(pitchClassIdx + 1, currentMidiVoicing);
                currentMidiVoicing.pop();
            }
        }
    };

    findVoicingCombinationsRecursive(0, []);

    let finalVoicings: string[][] = Array.from(allResultVoicingsSet).map(s => JSON.parse(s));
    
    finalVoicings.sort((voicingA, voicingB) => {
        const midiA = voicingA.map(n => getNoteMidiValue(n) || 0);
        const midiB = voicingB.map(n => getNoteMidiValue(n) || 0);
        const lowestA = Math.min(...midiA);
        const lowestB = Math.min(...midiB);
        if (lowestA !== lowestB) return lowestA - lowestB;

        const spanA = Math.max(...midiA) - lowestA;
        const spanB = Math.max(...midiB) - lowestB;
        if (spanA !== spanB) return spanA - spanB;
        
        const sumA = midiA.reduce((s, n) => s + n, 0);
        const sumB = midiB.reduce((s, n) => s + n, 0);
        return sumA - sumB;
    });


    let foundTargetIndex = -1;
    if (targetVoicingToFind && targetVoicingToFind.length > 0 && targetVoicingToFind.length === numNotesInChord) {
        const normalizedTargetVoicing = targetVoicingToFind.map(normalizeNoteToSharp).sort((a,b) => (getNoteMidiValue(a)??0) - (getNoteMidiValue(b)??0));
        
        foundTargetIndex = finalVoicings.findIndex(v => 
            v.length === normalizedTargetVoicing.length &&
            v.every((note, idx) => normalizeNoteToSharp(note) === normalizedTargetVoicing[idx])
        );
        
        if (foundTargetIndex !== -1) {
            const [target] = finalVoicings.splice(foundTargetIndex, 1);
            finalVoicings.unshift(target);
            foundTargetIndex = 0; 
        }
    }
    
    return { voicings: finalVoicings, targetVoicingIndex: foundTargetIndex };
};


export const calculateRequiredOctavesAndStartForVoicing = (
  voicing: string[],
  minOctavesToShow: number = 2,
  preferredMaxOctaves: number = 3
): { numOctaves: number; startOctave: number } => {
    if (!voicing || voicing.length === 0) {
        return { numOctaves: minOctavesToShow, startOctave: 3 }; // Default view
    }

    const midiValues = voicing.map(n => getNoteMidiValue(normalizeNoteToSharp(n))).filter(m => m !== null) as number[];
    if (midiValues.length === 0) {
        return { numOctaves: minOctavesToShow, startOctave: 3 };
    }

    const minMidi = Math.min(...midiValues);
    const maxMidi = Math.max(...midiValues);

    const minOctave = Math.floor(minMidi / 12) -1;
    const maxOctave = Math.floor(maxMidi / 12) -1;

    let numOctaves = Math.max(minOctavesToShow, maxOctave - minOctave + 1);
    numOctaves = Math.min(numOctaves, preferredMaxOctaves); 

    let startOctave = minOctave;
    if (numOctaves > (maxOctave - minOctave + 1)) { 
        startOctave = Math.max(1, Math.floor(minOctave - (numOctaves - (maxOctave - minOctave + 1)) / 2) );
    }
    
    if (startOctave + numOctaves -1 < maxOctave) {
        startOctave = Math.max(1, maxOctave - numOctaves + 1);
    }
     startOctave = Math.max(1, Math.min(startOctave, 6 - numOctaves +1 )); 


    return { numOctaves, startOctave };
};


const INTERVALS = {
    P1: 0, m2: 1, M2: 2, m3: 3, M3: 4, P4: 5, A4: 6, d5: 6, P5: 7, A5: 8, m6: 8, M6: 9, d7: 9, m7: 10, M7: 11, P8: 12
};

export const getChordAnalysisFromNotes = (notes: string[]): ChordAnalysis | null => {
    if (!notes || notes.length === 0 || notes.length > 7) return null;

    const uniqueNormalizedNotes = Array.from(new Set(notes.map(normalizeNoteToSharp)))
        .sort((a, b) => (getNoteMidiValue(a) ?? 0) - (getNoteMidiValue(b) ?? 0));

    if (uniqueNormalizedNotes.length === 0) return null;
  
    const pitchClasses = Array.from(new Set(uniqueNormalizedNotes.map(n => (getNoteMidiValue(n) ?? 0) % 12))).sort((a,b)=>a-b);
    if (pitchClasses.length === 0) return null;
    if (pitchClasses.length === 1) { 
        const singleNoteName = MIDI_NOTE_NAMES_SHARP[pitchClasses[0]];
        return {
            name: singleNoteName, root: singleNoteName, type: 'single', intervals: [0], notes: uniqueNormalizedNotes,
            extensions: [], alterations: [], hasSeventh: false, hasNinth: false, hasEleventh: false, hasThirteenth: false, isAltered: false
        };
    }

    for (let i = 0; i < pitchClasses.length; i++) {
        const rootPc = pitchClasses[i];
        const rootNoteName = MIDI_NOTE_NAMES_SHARP[rootPc];
        
        const intervalsFromRoot: number[] = pitchClasses.map(pc => (pc - rootPc + 12) % 12).sort((a,b)=>a-b);
        
        let qualityStr = "";
        let type: ChordAnalysis['type'] = 'other';
        let extensions: string[] = [];
        let alterations: string[] = [];
        let hasSeventh = false, hasNinth = false, hasEleventh = false, hasThirteenth = false, hasSixth = false;

        const has = (semitones: number) => intervalsFromRoot.includes(semitones);

        // Basic Triads
        if (has(INTERVALS.M3) && has(INTERVALS.P5)) { qualityStr = ""; type = 'maj'; }
        else if (has(INTERVALS.m3) && has(INTERVALS.P5)) { qualityStr = "m"; type = 'min'; }
        else if (has(INTERVALS.M3) && has(INTERVALS.A5)) { qualityStr = "aug"; type = 'aug'; alterations.push("#5")}
        else if (has(INTERVALS.m3) && has(INTERVALS.d5)) { qualityStr = "dim"; type = 'dim'; alterations.push("b5")}
        // Suspended
        else if (has(INTERVALS.P4) && has(INTERVALS.P5) && !has(INTERVALS.M3) && !has(INTERVALS.m3)) { qualityStr = "sus4"; type = 'sus'; }
        else if (has(INTERVALS.M2) && has(INTERVALS.P5) && !has(INTERVALS.M3) && !has(INTERVALS.m3)) { qualityStr = "sus2"; type = 'sus'; }

        if (type !== 'other') { 
            // Sevenths & Sixths
            if (has(INTERVALS.M7)) { 
                qualityStr = (type === 'maj' ? "maj7" : (type === 'min' ? "m(maj7)" : (type === 'aug' ? "aug(maj7)" : "maj7"))); 
                hasSeventh = true;
            } else if (has(INTERVALS.m7)) {
                qualityStr = (type === 'maj' ? "7" : (type === 'min' ? "m7" : (type === 'dim' ? "m7b5" : (type === 'sus' && qualityStr === 'sus4' ? "7sus4" : (type === 'sus' && qualityStr === 'sus2' ? "7sus2" : "7")))));
                if (type === 'dim' && !qualityStr.includes("m7b5")) qualityStr = "m7b5"; // Ensure dim becomes m7b5 with m7
                hasSeventh = true;
            } else if (has(INTERVALS.d7) && type === 'dim') { 
                qualityStr = "dim7"; 
                hasSeventh = true;
            } else if (has(INTERVALS.M6) && !hasSeventh) { // M6 chord
                qualityStr = (type === 'maj' ? "6" : (type === 'min' ? "m6" : qualityStr + "6"));
                hasSixth = true;
            }
            
            if (type === 'maj' && qualityStr === "7") type = 'dom'; // Major triad + minor 7th = Dominant

            // Extensions (9, 11, 13) - only if a 7th or 6th is present, or if it's an "add" chord
            const canHaveNumericExtensions = hasSeventh || hasSixth;

            if (has(INTERVALS.M2)) { // 9th or add9
                if (!hasSeventh && !hasSixth && (type==='maj' || type==='min')) extensions.push("add9");
                else if (canHaveNumericExtensions && !extensions.includes("9")) extensions.push("9");
                hasNinth = true;
            }
            if (has(INTERVALS.m2) && canHaveNumericExtensions && !extensions.includes("b9")) { alterations.push("b9"); hasNinth = true; }
            if (has(INTERVALS.m3) && type === 'dom' && !alterations.includes("#9") && !has(INTERVALS.m3)) { alterations.push("#9"); hasNinth = true; } // #9 on dominant

            if (has(INTERVALS.P4) && type !== 'sus' && canHaveNumericExtensions) { // 11th
                if (!extensions.includes("11")) extensions.push("11");
                hasEleventh = true;
            }
            if (has(INTERVALS.A4) && (qualityStr.includes('maj') || qualityStr.includes('7')) && canHaveNumericExtensions && !alterations.includes("#11")) { 
                alterations.push("#11"); 
                hasEleventh = true; 
            }
            
            // 13th (M6 interval if 7th is present) or plain 6th if no 7th (handled above)
            if (has(INTERVALS.M6) && hasSeventh && !extensions.includes("13")) { 
                extensions.push("13"); 
                hasThirteenth = true; 
            }
            if (has(INTERVALS.m6) && hasSeventh && !alterations.includes("b13")) { alterations.push("b13"); hasThirteenth = true; }


            // Other alterations (b5, #5 already partially handled by dim/aug quality strings)
            if (has(INTERVALS.d5) && !qualityStr.includes("dim") && !qualityStr.includes("m7b5") && !alterations.includes("b5")) alterations.push("b5");
            if (has(INTERVALS.A5) && !qualityStr.includes("aug") && !alterations.includes("#5")) alterations.push("#5");
            
            let finalName = rootNoteName + qualityStr;
            // Consolidate extensions: take the highest one (9, 11, 13) for the name, and add others if appropriate (like add9)
            if (extensions.includes("13") && !finalName.includes("13")) finalName += "13";
            else if (extensions.includes("11") && !finalName.includes("11")) finalName += "11";
            else if (extensions.includes("9") && !finalName.includes("9")) finalName += "9";
            else if (extensions.includes("add9") && !finalName.includes("add9")) finalName += "add9";
            // Note: "6" is part of qualityStr now.

            if (alterations.length > 0) {
                const distinctAlterations = [...new Set(alterations)].filter(alt => !(finalName.includes(alt))); // Avoid double #5 for aug etc.
                if (distinctAlterations.length > 0) finalName += `(${distinctAlterations.sort().join('')})`;
            }

            const lowestNoteFullName = uniqueNormalizedNotes[0];
            const lowestNotePc = (getNoteMidiValue(lowestNoteFullName) ?? 0) % 12;
            if (lowestNotePc !== rootPc) {
                finalName += `/${MIDI_NOTE_NAMES_SHARP[lowestNotePc]}`;
            }
            
            return {
                name: finalName, root: rootNoteName,
                bass: lowestNotePc !== rootPc ? MIDI_NOTE_NAMES_SHARP[lowestNotePc] : undefined,
                type: type, intervals: intervalsFromRoot, notes: uniqueNormalizedNotes,
                hasSeventh, hasNinth, hasEleventh, hasThirteenth, isAltered: alterations.length > 0,
                extensions, alterations
            };
        }
    }
    
    const fallbackName = uniqueNormalizedNotes.map(n => MIDI_NOTE_NAMES_SHARP[(getNoteMidiValue(n)??0)%12]).join('/') + (uniqueNormalizedNotes.length > 1 ? " cluster" : "");
    return {
        name: fallbackName, root: MIDI_NOTE_NAMES_SHARP[(getNoteMidiValue(uniqueNormalizedNotes[0])??0)%12],
        type: 'other', intervals: uniqueNormalizedNotes.map(n => ((getNoteMidiValue(n)??0) - (getNoteMidiValue(uniqueNormalizedNotes[0])??0) + 12) % 12).sort((a,b)=>a-b),
        notes: uniqueNormalizedNotes,
        extensions: [], alterations: [], hasSeventh: false, hasNinth: false, hasEleventh: false, hasThirteenth: false, isAltered: false
    };
};


const addUniqueSimplification = (
    collection: ChordSimplificationOption[],
    name: string,
    baseNotes: string[],
    isOriginal: boolean = false
): void => {
    if (baseNotes.length < 2) return; 

    const sortedNotes = [...baseNotes].sort((a,b) => (getNoteMidiValue(a)??0) - (getNoteMidiValue(b)??0));
    const notesKey = sortedNotes.join(',');
    
    const analysisForVoicingName = getChordAnalysisFromNotes(sortedNotes);
    const nameForVoicingGen = analysisForVoicingName ? analysisForVoicingName.name : name;

    const { voicings: generatedVoicings } = generateChordVoicings(nameForVoicingGen, undefined, undefined, sortedNotes);

    if (generatedVoicings.length === 0 && sortedNotes.length > 0) {
        generatedVoicings.push([...sortedNotes]);
    }
    
    if (generatedVoicings.length === 0) return;


    if (!collection.some(opt => opt.name === nameForVoicingGen && opt.baseNotes.join(',') === notesKey)) {
        collection.push({ name: nameForVoicingGen, baseNotes: sortedNotes, allVoicings: generatedVoicings, isOriginal, lastSelectedVoicingIndex: isOriginal ? 0 : undefined });
    }
};

export const generateChordSimplifications = (originalAINotes: string[]): ChordSimplificationOption[] => {
    const simplifications: ChordSimplificationOption[] = [];
    if (!originalAINotes || originalAINotes.length === 0) return simplifications;

    const normalizedOriginalNotes = originalAINotes.map(normalizeNoteToSharp);
    const initialAnalysis = getChordAnalysisFromNotes(normalizedOriginalNotes);

    if (!initialAnalysis || initialAnalysis.notes.length < 2) return simplifications;

    let currentAnalysis = initialAnalysis;
    let currentNotes = [...initialAnalysis.notes];

    const generateStep = (notesToSimplify: string[], targetType: '11th' | '9th' | '7th' | 'triad' | '6th_to_triad' | 'add9_to_triad' | '7sus_to_sus_or_7th' | 'dom7_to_triad' | 'dim_to_triad' | 'm7b5_to_dim_triad'): string[] | null => {
        const analysis = getChordAnalysisFromNotes(notesToSimplify);
        if (!analysis || analysis.type === 'single') return null;

        const rootPc = (getNoteMidiValue(analysis.root + '0') ?? 0) % 12; // Use a default octave for root to get PC
        
        // Find the actual root note instance from the chord to determine its octave.
        const actualRootNoteInChord = analysis.notes
            .filter(note => (getNoteMidiValue(note) ?? -1) % 12 === rootPc)
            .sort((a, b) => (getNoteMidiValue(a) ?? 0) - (getNoteMidiValue(b) ?? 0))[0]
            || analysis.notes[0]; // Fallback to the first note if specific root not found (should generally not happen)

        const buildNotesFromCurrentChordRootOctave = (intervals: number[]): string[] => {
            return getNotesFromIntervals(actualRootNoteInChord, intervals);
        };
        
        let simplifiedIntervals: number[] | null = null;

        switch (targetType) {
            case '11th': // From 13th
                if (analysis.hasThirteenth) {
                    simplifiedIntervals = analysis.intervals.filter(i => i !== INTERVALS.M6 && i !== INTERVALS.m6); // Remove 13th (M6 or m6)
                    if (!analysis.hasEleventh && simplifiedIntervals.includes(INTERVALS.P4)) simplifiedIntervals = simplifiedIntervals.filter(i => i !== INTERVALS.P4); // if no #11, remove natural 11 too
                }
                break;
            case '9th': // From 11th (or 13th if directly simplifying)
                if (analysis.hasEleventh || analysis.hasThirteenth) {
                    simplifiedIntervals = analysis.intervals.filter(i => i !== INTERVALS.P4 && i !== INTERVALS.A4 && i !== INTERVALS.M6 && i !== INTERVALS.m6);
                }
                break;
            case '7th': // From 9th (or 11th/13th)
                if (analysis.hasNinth || analysis.hasEleventh || analysis.hasThirteenth) {
                     simplifiedIntervals = analysis.intervals.filter(i => i !== INTERVALS.M2 && i !== INTERVALS.m2 && i !== INTERVALS.P4 && i !== INTERVALS.A4 && i !== INTERVALS.M6 && i !== INTERVALS.m6);
                }
                break;
            case 'triad': // From 7th, 6th, add9
                 if (analysis.hasSeventh || analysis.intervals.includes(INTERVALS.M6) || analysis.intervals.includes(INTERVALS.M2)) {
                    simplifiedIntervals = [0]; // Root
                    if (analysis.intervals.includes(INTERVALS.M3)) simplifiedIntervals.push(INTERVALS.M3);
                    else if (analysis.intervals.includes(INTERVALS.m3)) simplifiedIntervals.push(INTERVALS.m3);
                    if (analysis.intervals.includes(INTERVALS.P5)) simplifiedIntervals.push(INTERVALS.P5);
                    else if (analysis.intervals.includes(INTERVALS.d5)) simplifiedIntervals.push(INTERVALS.d5);
                    else if (analysis.intervals.includes(INTERVALS.A5)) simplifiedIntervals.push(INTERVALS.A5);
                }
                break;
             case '6th_to_triad': // Specific C6 -> C
                if (analysis.intervals.includes(INTERVALS.M6) && !analysis.hasSeventh && analysis.notes.length > 3) { // e.g. C6
                    simplifiedIntervals = [0, analysis.intervals.includes(INTERVALS.M3) ? INTERVALS.M3 : INTERVALS.m3, INTERVALS.P5];
                }
                break;
            case 'add9_to_triad': // Specific Cadd9 -> C
                if (analysis.extensions.includes("add9") && !analysis.hasSeventh && analysis.notes.length > 3) {
                    simplifiedIntervals = [0, analysis.intervals.includes(INTERVALS.M3) ? INTERVALS.M3 : INTERVALS.m3, INTERVALS.P5];
                }
                break;
            case 'dom7_to_triad': // G7 -> G
                if (analysis.type === 'dom' && analysis.hasSeventh) {
                     simplifiedIntervals = [0, INTERVALS.M3, INTERVALS.P5];
                }
                break;
            case '7sus_to_sus_or_7th': // G7sus4 -> Gsus4 or G7
                if (analysis.name.includes("7sus4")) {
                     // Option 1: Gsus4
                    const sus4Notes = buildNotesFromCurrentChordRootOctave([0, INTERVALS.P4, INTERVALS.P5]);
                    const sus4Analysis = getChordAnalysisFromNotes(sus4Notes);
                    if(sus4Analysis) addUniqueSimplification(simplifications, sus4Analysis.name, sus4Notes);
                    // Option 2: G7
                    const g7Notes = buildNotesFromCurrentChordRootOctave([0, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7]);
                     const g7Analysis = getChordAnalysisFromNotes(g7Notes);
                    if(g7Analysis) addUniqueSimplification(simplifications, g7Analysis.name, g7Notes);
                    return null; // Handled multiple additions
                }
                break;
             case 'dim_to_triad': // Cdim7 -> Cdim, Co -> Co (no change if already triad)
                if (analysis.type === 'dim') {
                    if(analysis.hasSeventh) simplifiedIntervals = [0, INTERVALS.m3, INTERVALS.d5]; // Cdim
                    // if already a dim triad, no further simplification by this rule
                }
                break;
            case 'm7b5_to_dim_triad': // Cm7b5 -> Cdim
                if (analysis.name.includes("m7b5")) {
                     simplifiedIntervals = [0, INTERVALS.m3, INTERVALS.d5]; // Cdim
                }
                break;


        }
        return simplifiedIntervals ? buildNotesFromCurrentChordRootOctave(Array.from(new Set(simplifiedIntervals)).sort((a,b)=>a-b)) : null;
    };
    
    const simplificationHierarchy: Array<('11th' | '9th' | '7th' | 'triad')> = ['11th', '9th', '7th', 'triad'];
    
    let notesForNextStep = [...currentNotes];
    for (const stepType of simplificationHierarchy) {
        const simplified = generateStep(notesForNextStep, stepType);
        if (simplified && simplified.length > 0 && simplified.join(',') !== notesForNextStep.join(',')) {
            const simplifiedAnalysis = getChordAnalysisFromNotes(simplified);
            if (simplifiedAnalysis) {
                addUniqueSimplification(simplifications, simplifiedAnalysis.name, simplified);
                notesForNextStep = [...simplified];
            } else {
                break; 
            }
        }
    }
    
    // Apply specific one-step simplifications from guide based on initial analysis
    const specificSimplifications: ('6th_to_triad' | 'add9_to_triad' | 'dom7_to_triad' | '7sus_to_sus_or_7th'| 'dim_to_triad' | 'm7b5_to_dim_triad')[] = [
        '6th_to_triad', 'add9_to_triad', 'dom7_to_triad', '7sus_to_sus_or_7th', 'dim_to_triad', 'm7b5_to_dim_triad'
    ];

    for (const specificType of specificSimplifications) {
        // Use original notes for these specific one-step checks
        const simplified = generateStep(initialAnalysis.notes, specificType); 
        if (simplified && simplified.length > 0 && simplified.join(',') !== initialAnalysis.notes.join(',')) {
             const simplifiedAnalysis = getChordAnalysisFromNotes(simplified);
             if (simplifiedAnalysis) addUniqueSimplification(simplifications, simplifiedAnalysis.name, simplified);
        }
    }


    // Special G13 handling from guide: G13 -> G9 OR G13 -> G7(13)
    if (initialAnalysis.name.includes("13") && initialAnalysis.type === 'dom') {
        // G13 -> G9 (remove 13th)
        const g9Notes = generateStep(initialAnalysis.notes, '9th');
        if (g9Notes) {
            const g9Analysis = getChordAnalysisFromNotes(g9Notes);
            if(g9Analysis) addUniqueSimplification(simplifications, g9Analysis.name, g9Notes);
        }
        // G13 -> G7(13) (remove 9th and 11th, keep 13th)
        const g7_13_Intervals = [0, INTERVALS.M3, INTERVALS.P5, INTERVALS.m7, INTERVALS.M6]; // R,3,5,7,13
        
        const rootPcForInitialAnalysis = (getNoteMidiValue(initialAnalysis.root + "0") ?? 0) % 12; 
        const actualRootNoteForInitialChord = initialAnalysis.notes
            .filter(note => (getNoteMidiValue(note) ?? -1) % 12 === rootPcForInitialAnalysis)
            .sort((a,b) => (getNoteMidiValue(a)??0) - (getNoteMidiValue(b)??0))[0] 
            || initialAnalysis.notes[0];

        const g7_13_Notes = getNotesFromIntervals(actualRootNoteForInitialChord, g7_13_Intervals.filter(i => initialAnalysis.intervals.includes(i)));
         if (g7_13_Notes.length >= 4) { // Ensure it's at least a 7th + 13th
            const g7_13_Analysis = getChordAnalysisFromNotes(g7_13_Notes);
            if(g7_13_Analysis) addUniqueSimplification(simplifications, g7_13_Analysis.name, g7_13_Notes);
        }
    }


    const uniqueSimplificationsMap = new Map<string, ChordSimplificationOption>();
    simplifications.forEach(s => {
        const key = `${s.name}_${s.baseNotes.join(',')}`; // Use baseNotes for uniqueness key
        if (!uniqueSimplificationsMap.has(key)) {
            uniqueSimplificationsMap.set(key, s);
        }
    });

    return Array.from(uniqueSimplificationsMap.values());
};

export const countSharedNotes = (voicing1: string[], voicing2: string[]): number => {
    if (!voicing1 || !voicing2 || voicing1.length === 0 || voicing2.length === 0) return 0;

    const set1 = new Set(voicing1.map(n => normalizeNoteToSharp(n)));
    const set2 = new Set(voicing2.map(n => normalizeNoteToSharp(n)));

    let count = 0;
    for (const note of set1) {
        if (set2.has(note)) {
            count++;
        }
    }
    return count;
};

export const findBestMatchingVoicingIndex = (currentVoicing: string[], targetVoicings: string[][]): number => {
    if (!targetVoicings || targetVoicings.length === 0) return 0;
    if (!currentVoicing || currentVoicing.length === 0) return 0;

    let bestIndex = 0;
    let maxSharedNotes = -1;
    let minNoteCountDiff = Infinity; 
    let minLowestNoteMidi = Infinity; 

    targetVoicings.forEach((targetV, index) => {
        const shared = countSharedNotes(currentVoicing, targetV);
        const noteCountDiff = Math.abs(currentVoicing.length - targetV.length);
        const lowestTargetMidi = Math.min(...targetV.map(n => getNoteMidiValue(normalizeNoteToSharp(n)) ?? Infinity));

        if (shared > maxSharedNotes) {
            maxSharedNotes = shared;
            bestIndex = index;
            minNoteCountDiff = noteCountDiff;
            minLowestNoteMidi = lowestTargetMidi;
        } else if (shared === maxSharedNotes) {
            if (noteCountDiff < minNoteCountDiff) {
                minNoteCountDiff = noteCountDiff;
                bestIndex = index;
                minLowestNoteMidi = lowestTargetMidi;
            } else if (noteCountDiff === minNoteCountDiff) {
                if (lowestTargetMidi < minLowestNoteMidi) {
                    minLowestNoteMidi = lowestTargetMidi;
                    bestIndex = index;
                }
            }
        }
    });

    return bestIndex;
};

export const calculateOverallOctaveRange = (
  voicings: string[][],
  minOctavesToShow: number = 2,
  preferredMaxOctaves: number = 3
): { numOctaves: number; startOctave: number } => {
  if (!voicings || voicings.length === 0 || voicings.every(v => v.length === 0)) {
    return { numOctaves: minOctavesToShow, startOctave: 3 }; 
  }

  const allMidiValues: number[] = voicings.flat()
    .map(n => getNoteMidiValue(normalizeNoteToSharp(n)))
    .filter(m => m !== null) as number[];

  if (allMidiValues.length === 0) {
    return { numOctaves: minOctavesToShow, startOctave: 3 };
  }

  const overallMinMidi = Math.min(...allMidiValues);
  const overallMaxMidi = Math.max(...allMidiValues);

  const minOctave = Math.floor(overallMinMidi / 12) - 1;
  const maxOctave = Math.floor(overallMaxMidi / 12) - 1;

  let numOctaves = Math.max(minOctavesToShow, maxOctave - minOctave + 1);
  numOctaves = Math.min(numOctaves, preferredMaxOctaves);

  let startOctave = minOctave;
  if (numOctaves > (maxOctave - minOctave + 1)) {
    startOctave = Math.max(1, Math.floor(minOctave - (numOctaves - (maxOctave - minOctave + 1)) / 2));
  }
  if (startOctave + numOctaves - 1 < maxOctave) {
    startOctave = Math.max(1, maxOctave - numOctaves + 1);
  }
  startOctave = Math.max(1, Math.min(startOctave, 6 - numOctaves + 1));

  return { numOctaves, startOctave };
};