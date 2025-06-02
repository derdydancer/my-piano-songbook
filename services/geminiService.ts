import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SinglePersonGiftSuggestion, AISuggestedGiftItem, PianoAnalysisResult, UniqueChordDefinition, ChordProgressionItem } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';
import { DEFAULT_PERSON_SUGGESTION } from '../features/gift-assistant/giftAssistant.constants';

let ai: GoogleGenAI | null = null;
let apiKeyStatus: 'unknown' | 'valid' | 'missing' | 'error' = 'unknown';

const initializeGemini = (): GoogleGenAI | null => {
    if (ai) return ai;
    try {
        // Try localStorage first, then fallback to env
        let apiKey = '';
        try {
            apiKey = localStorage.getItem('geminiApiKey') || '';
        } catch {}
        if (!apiKey) {
            apiKey = process.env.API_KEY || '';
        }
        if (!apiKey) {
            console.warn("Gemini API key is not set. AI features will be disabled.");
            apiKeyStatus = 'missing';
            return null;
        }
        ai = new GoogleGenAI({ apiKey });
        apiKeyStatus = 'valid';
        return ai;
    } catch (error) {
        console.error("Error initializing GoogleGenAI:", error);
        apiKeyStatus = 'missing';
        return null;
    }
};


const parseJsonFromText = <T,>(text: string): T | null => {
  let jsonStr = text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; 
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }

  jsonStr = jsonStr.replace(/\\\$`/g, '$');

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini:", e, "Original text after pre-processing:", jsonStr, "Original text before pre-processing:", text);
    const jsonMaybe = jsonStr.match(/(\[.*\]|{.*})/s); 
    if (jsonMaybe && jsonMaybe[0]) {
      try {
        return JSON.parse(jsonMaybe[0]) as T;
      } catch (e2) {
        console.error("Secondary JSON parsing attempt failed:", e2);
      }
    }
    return null;
  }
};

const generateGiftIdeas = async (
  contents: any,
  targetPersonNameInput: string, 
  allRecipientNames: string[] = [],
  customKnowledge?: string, 
  customExistingGifts?: AISuggestedGiftItem[], 
  isImagePrompt: boolean = false,
  hasCustomContext: boolean = false, 
  model: string = GEMINI_MODEL_TEXT
): Promise<SinglePersonGiftSuggestion[] | null> => {
  const genAI = initializeGemini();
  if (!genAI) {
     if (apiKeyStatus === 'missing') {
        throw new Error("Gemini API key is not configured via process.env.API_KEY.");
     } else if (apiKeyStatus === 'error') {
        throw new Error("Gemini API initialization failed. Check console for details.");
     }
    throw new Error("Gemini API is not initialized.");
  }
  
  const primaryTargetPerson = targetPersonNameInput || (allRecipientNames.length > 0 ? allRecipientNames[0] : DEFAULT_PERSON_SUGGESTION);
  
  const jsonFormat = `
[
  {
    "personName": "string (MUST be from the existing names list: [${allRecipientNames.map(n => `"${n}"`).join(', ')}], or resolve to '${primaryTargetPerson}' if no clear match or if it's a general query for the primary target.)",
    "gifts": [ 
      { "itemName": "string (Specific product name or item described)", "details": "string (Detailed description. Include approximate price like '~\\$25' or 'range \\$50-\\$70', and potential vendor/store like 'from Amazon', 'local Etsy shop', 'Target', etc. If image prompt, extract this from image if possible.)" }
    ]
  }
]`;
  const existingNamesListString = allRecipientNames.length > 0 ? `[${allRecipientNames.map(n => `"${n}"`).join(', ')}]` : "[] (No existing people/lists)";

  let systemInstruction = `You are an expert gift idea curator.
You MUST ALWAYS associate gifts with an existing person from this list: ${existingNamesListString}.
If no specific person is mentioned or identifiable for a gift, associate it with "${primaryTargetPerson}".
NEVER suggest new people. The 'isNewPersonCandidate' concept is deprecated; all gifts are for known individuals or the primary target.

RESPONSE RULES:
1.  **Product Details:** For each gift, 'itemName' should be the specific product name or user-specified item. 'details' field: make descriptive, include approximate price and potential vendor/store. If image prompt, extract this from image.
2.  **JSON Structure:** Respond STRICTLY with a JSON array of objects in the format: ${jsonFormat}. 'responseMimeType' is 'application/json'.
3.  **Empty Result:** If no suitable gifts, return an empty array []. Do not add explanatory text outside the JSON.
`;

  if (hasCustomContext) { 
    systemInstruction += `
SPECIFIC TASK: GENERATE PERSONALIZED RECOMMENDATIONS for "${primaryTargetPerson}".
- Knowledge about this person: "${customKnowledge || 'Not specified'}"
- Their existing gift ideas (avoid exact duplicates, suggest complementary items): ${customExistingGifts && customExistingGifts.length > 0 ? JSON.stringify(customExistingGifts) : "None specified"}
- Focus new suggestions primarily for THIS person. Provide ONLY ONE highly specific recommendation unless the user explicitly asks for more.
`;
    if (isImagePrompt) {
      systemInstruction += `- If an image is provided, it's a product for "${primaryTargetPerson}". Identify it and provide details.`;
    }
  } else { 
    if (isImagePrompt) {
      systemInstruction += `
SPECIFIC TASK: ANALYZE IMAGE and associate with an EXISTING PERSON.
- If image is a product photo: Identify it and its details. Associate with "${primaryTargetPerson}".
- If image is a screenshot of text (e.g., a chat): Analyze text for gift wishes. If a recipient mentioned in the text matches a name in ${existingNamesListString}, associate the gift with them. Otherwise, associate with "${primaryTargetPerson}".
`;
    } else { 
      systemInstruction += `
SPECIFIC TASK: PARSE USER'S TEXT for gift items and assign to an EXISTING PERSON.
- User's prompt likely contains specific gift items and potentially for whom. Extract these.
- If a recipient mentioned in the prompt matches a name in ${existingNamesListString}, associate the gift with them.
- If no specific recipient matches, or none mentioned, associate gift(s) with "${primaryTargetPerson}".
- Do NOT generate new gift ideas beyond what the user explicitly states. Focus on parsing.
`;
    }
  }

  try {
    const response: GenerateContentResponse = await genAI.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: hasCustomContext ? 0.4 : 0.2, 
      },
    });
    
    const textResponse = response.text;
    if (!textResponse) {
      console.error("Gemini API returned no text response.");
      return null;
    }
    
    let parsedSuggestions = parseJsonFromText<any[]>(textResponse);
    
    if (parsedSuggestions && Array.isArray(parsedSuggestions)) {
        const validatedSuggestions: SinglePersonGiftSuggestion[] = [];
        for (const rawSuggestion of parsedSuggestions) {
            let finalPersonName = primaryTargetPerson; 
            if (rawSuggestion.personName && typeof rawSuggestion.personName === 'string') {
                const matchedName = allRecipientNames.find(name => name.toLowerCase() === rawSuggestion.personName.toLowerCase());
                if (matchedName) {
                    finalPersonName = matchedName;
                } else if (allRecipientNames.includes(rawSuggestion.personName)) {
                    finalPersonName = rawSuggestion.personName;
                }
            }

            if (finalPersonName && rawSuggestion.gifts && Array.isArray(rawSuggestion.gifts) && rawSuggestion.gifts.length > 0) {
                 const validGifts = rawSuggestion.gifts.filter((g: any) => g.itemName && typeof g.itemName === 'string' && g.itemName.trim() !== "")
                                                    .map((g: any) => ({ itemName: g.itemName, details: g.details || '' }));
                if (validGifts.length > 0) {
                    validatedSuggestions.push({
                        personName: finalPersonName,
                        gifts: validGifts
                    });
                }
            }
        }
        return validatedSuggestions;
    } else if (typeof parsedSuggestions === 'object' && parsedSuggestions !== null && 'personName' in parsedSuggestions && 'gifts' in parsedSuggestions) {
        console.warn("AI returned a single object, expected an array. Wrapping it.");
        const singleSuggestion = parsedSuggestions as any;
        let finalPersonName = primaryTargetPerson;
        if (singleSuggestion.personName && typeof singleSuggestion.personName === 'string') {
            const matchedName = allRecipientNames.find(name => name.toLowerCase() === singleSuggestion.personName.toLowerCase());
            if (matchedName) {
                finalPersonName = matchedName;
            } else if (allRecipientNames.includes(singleSuggestion.personName)) {
                finalPersonName = singleSuggestion.personName;
            }
        }

         if (finalPersonName && singleSuggestion.gifts && Array.isArray(singleSuggestion.gifts) && singleSuggestion.gifts.length > 0) {
            const validGifts = singleSuggestion.gifts.filter((g: any) => g.itemName && typeof g.itemName === 'string' && g.itemName.trim() !== "")
                                                  .map((g: any) => ({ itemName: g.itemName, details: g.details || '' }));
            if (validGifts.length > 0) {
                return [{ 
                    personName: finalPersonName, 
                    gifts: validGifts
                }];
            }
         }
         return null;
    } else {
        console.error("Parsed JSON is not in the expected SinglePersonGiftSuggestion[] format or is empty:", parsedSuggestions);
        return null;
    }

  } catch (error: any) {
    console.error("Error generating gift ideas with Gemini:", error.message, error.stack);
    if (error.message && (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID"))) {
        apiKeyStatus = 'error'; 
        throw new Error("Gemini API key is not valid or missing. Please ensure `process.env.API_KEY` is correctly set.");
    }
    throw error; 
  }
};

export const geminiService = {
  generateGiftIdeasFromText: async (
    text: string, 
    targetPersonName: string, 
    allRecipientNames: string[],
    customKnowledge?: string,
    customExistingGifts?: AISuggestedGiftItem[],
    hasCustomContext: boolean = false 
    ): Promise<SinglePersonGiftSuggestion[] | null> => {
    return generateGiftIdeas({ parts: [{ text: text }] }, targetPersonName, allRecipientNames, customKnowledge, customExistingGifts, false, hasCustomContext);
  },

  generateGiftIdeasFromImage: async (
    base64ImageData: string,
    mimeType: string,
    targetPersonName: string, 
    allRecipientNames: string[],
    customKnowledge?: string,
    customExistingGifts?: AISuggestedGiftItem[],
    hasCustomContext: boolean = false 
  ): Promise<SinglePersonGiftSuggestion[] | null> => {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64ImageData,
      },
    };
    
    let textPromptForImage = "";
    if (hasCustomContext) {
      textPromptForImage = `This image contains a product idea for ${targetPersonName}. Identify it. Consider their interests: ${customKnowledge || 'N/A'}. They already have ideas: ${customExistingGifts && customExistingGifts.length > 0 ? customExistingGifts.map(g=>g.itemName).join(', ') : 'None'}.`;
    } else {
      textPromptForImage = `Analyze this image. If it's a product, describe it. If it's a screenshot with text (like a chat), extract any gift wishes mentioned in the text. For any items/wishes found, try to associate them with an existing person if mentioned (from list: ${allRecipientNames.join(', ')}), otherwise associate with ${targetPersonName}.`;
    }

    const textPart = { text: textPromptForImage };
    return generateGiftIdeas({ parts: [imagePart, textPart] }, targetPersonName, allRecipientNames, customKnowledge, customExistingGifts, true, hasCustomContext);
  },
  
  generatePianoChords: async (
    promptContent: { text?: string; base64ImageData?: string; mimeType?: string },
    model: string = GEMINI_MODEL_TEXT
  ): Promise<PianoAnalysisResult | null> => {
    const genAI = initializeGemini();
    if (!genAI) {
      if (apiKeyStatus === 'missing') {
        throw new Error("Gemini API key is not configured via process.env.API_KEY.");
      } else if (apiKeyStatus === 'error') {
        throw new Error("Gemini API initialization failed. Check console for details.");
      }
      throw new Error("Gemini API is not initialized.");
    }

    // The JSON structure the AI should return. 'notes' here will be mapped to 'aiSuggestedNotes'.
    const jsonFormat = `
{
  "songTitle": "string (Optional: The title of the song, if identifiable. If not, omit or use 'Unknown Title')",
  "lyricsBy": "string (Optional: Lyricist's name, if identifiable. If not, omit.)",
  "musicBy": "string (Optional: Composer's name, if identifiable. If not, omit.)",
  "uniqueChords": [
    {
      "chordName": "string (Standard chord name, e.g., C, Gm7, F#dim, Am/G, Cmaj7. Each unique chord symbol from the input appears ONLY ONCE here)",
      "notes": ["string (e.g., C4)", "string (e.g., E4)", "string (G4)"] 
    }
  ],
  "chordProgression": [
    {
      "chordName": "string (The chord symbol as it appears in sequence. Must match a chordName in uniqueChords)",
      "originalContext": "string (Optional: snippet of lyrics/text where the chord appeared, e.g., 'The [Cmaj]sun shines bright...')"
    }
  ]
}`;

    const systemInstruction = `You are a musical assistant specializing in piano chords.
Given lyrics or an image of sheet music, identify musical chords, song metadata (title, lyricist, composer if available), and the chord progression.

RESPONSE RULES:
1.  **JSON Structure:** Respond STRICTLY with a SINGLE JSON object in the format: ${jsonFormat}. The 'responseMimeType' is 'application/json'.
2.  **Song Metadata:** 'songTitle', 'lyricsBy', 'musicBy' are optional. If not found, they can be omitted or 'songTitle' can be 'Unknown Title'.
3.  **Unique Chords Array ('uniqueChords'):**
    a. This array MUST contain an inventory of all unique chord symbols identified in the input (e.g., C, G, Am). Each unique chord symbol should appear EXACTLY ONCE in this array.
    b. Each object in 'uniqueChords' must have 'chordName' (string) and 'notes' (array of string pitch notations like "C4", "F#3").
    c. **Voicing for 'notes' in 'uniqueChords.notes':** For each chord, provide ONE representative, easy-to-play voicing (e.g., root position or a common, comfortable inversion). This will be the AI's suggested voicing.
        i. **7th Chords Voicing (for this single suggested voicing):**
            - For DOMINANT 7TH chords (e.g., C7, G7, A7 - major triad with a minor 7th), list ONLY THREE notes by OMITTING THE 5TH DEGREE. Example: G7 (G-B-D-F) -> ["G3", "B3", "F4"].
            - For ALL OTHER types of 7th chords (e.g., Cmaj7, Am7, F#m7b5, Cdim7), list ALL FOUR notes (root, 3rd, 5th, 7th), voiced appropriately. Example: Cmaj7 (C-E-G-B) -> ["C4", "E4", "G4", "B4"]; Am7 (A-C-E-G) -> ["A3", "C4", "E4", "G4"].
4.  **Chord Progression Array ('chordProgression'):**
    a. This array MUST list all identified chords in the EXACT SEQUENCE they appear in the input material.
    b. Each object in 'chordProgression' must have 'chordName' (string), which MUST match a 'chordName' from an entry in the 'uniqueChords' array.
    c. Include 'originalContext' (a short snippet of lyrics/text showing the chord symbol *embedded within square brackets* in its original place, e.g., 'The [Cmaj]sun shines bright...'). If no direct lyrics context, use chord symbol.
5.  **Input Analysis:**
    a. If input is lyrics: Look for chord symbols (like C, G, Am/G, Fmaj7) typically found above or within the text. Extract these into 'originalContext' with the chord symbol embedded.
    b. If input is sheet music image: Analyze for explicit chord symbols, implied harmony, song title, composer, and lyricist. For 'originalContext' in 'chordProgression', if no lyrics, use just the chord symbol itself or a measure number if discernible.
6.  **Note Format:** Notes in 'uniqueChords.notes' must be standard pitch notation (Note name C-B, optional #/b, octave number e.g., 2-5). Typical piano range is A0-C8.
7.  **Chord Naming:** 'chordName' should be standard (e.g., "Cmaj7", "Am", "G/B", "C7").
8.  **B/H Notation Awareness:** Be aware that in some notation systems (especially German), 'H' may represent B natural, and 'B' may represent B flat. If the input's context (e.g., language of lyrics) suggests this, interpret accordingly. For standard English input, 'B' is B natural and 'Bb' is B flat.
9.  **Accuracy:** Prioritize accuracy in chord identification, note spelling, and progression sequence.
10. **Empty Result:** If no chords are reliably identified, 'uniqueChords' and 'chordProgression' should be empty arrays []. 'songTitle' can be 'Unknown Title'. Do not add explanatory text outside the JSON.
`;

    let contentsRequest: any;
    let defaultTitle = "Unknown Song";
    if (promptContent.base64ImageData && promptContent.mimeType) {
      contentsRequest = {
        parts: [
          { text: "Analyze the following sheet music image. Provide song title, authors, an inventory of unique chords (following specific 7th chord voicing rules for the suggested notes), and the chord progression as per the specified JSON structure." },
          { inlineData: { mimeType: promptContent.mimeType, data: promptContent.base64ImageData } },
        ],
      };
    } else if (promptContent.text) {
      const firstLine = promptContent.text.split('\n')[0].trim();
      if (firstLine.length > 0 && firstLine.length < 50 && !firstLine.includes('[')) { 
        defaultTitle = firstLine;
      }
      contentsRequest = { parts: [{ text: `Analyze the following lyrics/chords. Provide song title, authors, an inventory of unique chords (following specific 7th chord voicing rules for the suggested notes), and the chord progression as per the specified JSON structure. Lyrics/Chords: ${promptContent.text}` }] };
    } else {
      throw new Error("No content provided for piano chord generation (text or image).");
    }
    
    try {
      const response: GenerateContentResponse = await genAI.models.generateContent({
        model: model,
        contents: contentsRequest,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2, 
        },
      });

      const textResponse = response.text;
      if (!textResponse) {
        console.error("Gemini API returned no text response for piano chords.");
        return null;
      }

      const parsedJson = parseJsonFromText<any>(textResponse); // Parse as generic 'any' first
      
      if (parsedJson && Array.isArray(parsedJson.uniqueChords) && Array.isArray(parsedJson.chordProgression)) {
        const validatedUniqueChords: UniqueChordDefinition[] = parsedJson.uniqueChords
          .filter((chord: any) => 
            chord.chordName && 
            Array.isArray(chord.notes) && 
            chord.notes.every((note: any) => typeof note === 'string' && note.match(/^[A-Ga-g][#b]?\d$/)) &&
            chord.notes.length > 0 
          )
          .map((chord: any) => ({ // Map to the new UniqueChordDefinition structure
            chordName: chord.chordName,
            aiSuggestedNotes: chord.notes 
          }));

        const validatedChordProgression = parsedJson.chordProgression.filter((item: any) =>
            item.chordName && validatedUniqueChords.some(uc => uc.chordName === item.chordName)
        );

        return {
            songTitle: parsedJson.songTitle || defaultTitle,
            lyricsBy: parsedJson.lyricsBy,
            musicBy: parsedJson.musicBy,
            uniqueChords: validatedUniqueChords,
            chordProgression: validatedChordProgression
        };
      } else {
        console.error("Parsed JSON for piano analysis is not in the expected format (uniqueChords/chordProgression missing or invalid):", parsedJson);
        return { 
            songTitle: defaultTitle,
            uniqueChords: [],
            chordProgression: []
        };
      }

    } catch (error: any) {
      console.error("Error generating piano chords with Gemini:", error.message, error.stack);
      if (error.message && (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID"))) {
        apiKeyStatus = 'error'; 
        throw new Error("Gemini API key is not valid or missing. Please ensure `process.env.API_KEY` is correctly set.");
      }
      throw error;
    }
  },

  getApiKeyStatus: (): typeof apiKeyStatus => {
    if (apiKeyStatus === 'unknown') { 
        initializeGemini();
    }
    return apiKeyStatus;
  }
};
