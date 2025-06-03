

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SinglePersonGiftSuggestion, AISuggestedGiftItem, PianoAnalysisResult, UniqueChordDefinition, ChordProgressionItem } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';
import { DEFAULT_PERSON_SUGGESTION } from '../features/gift-assistant/giftAssistant.constants';

let ai: GoogleGenAI | null = null;
let apiKeyStatus: 'unknown' | 'valid' | 'missing' | 'error' = 'unknown';

const initializeGemini = (): GoogleGenAI | null => {
  if (ai && apiKeyStatus === 'valid') return ai;
  
  if (apiKeyStatus === 'missing' || apiKeyStatus === 'error') return null;

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("Gemini API key is not set in process.env.API_KEY. AI features will be disabled.");
      apiKeyStatus = 'missing';
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
    apiKeyStatus = 'valid';
    console.log("GoogleGenAI initialized successfully.");
    return ai;
  } catch (error: any) {
    console.error("Error initializing GoogleGenAI:", error.message);
    apiKeyStatus = 'error';
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

export type GiftOperationType = 'parse_and_assign' | 'recommend_for_person';

const generateGiftIdeas = async (
  promptContents: any, // This will be GenerateContentParameters.contents
  targetPersonNameInput: string, 
  allRecipientNames: string[] = [],
  customKnowledge?: string, 
  customExistingGifts?: AISuggestedGiftItem[], 
  isImagePrompt: boolean = false,
  hasCustomContext: boolean = false,
  operationType: GiftOperationType = 'parse_and_assign', 
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

  let systemInstruction = `You are a gift assistant.
You MUST ALWAYS associate gifts with an existing person from this list: ${existingNamesListString}.
If no specific person is mentioned or identifiable for a gift, associate it with "${primaryTargetPerson}".
NEVER suggest new people.

RESPONSE RULES:
1.  **Product Details:** For each gift, 'itemName' should be the specific product name or user-specified item. 'details' field: make descriptive, include approximate price and potential vendor/store. If image prompt, extract this from image.
2.  **JSON Structure:** Respond STRICTLY with a JSON array of objects in the format: ${jsonFormat}. 'responseMimeType' is 'application/json'.
3.  **Empty Result:** If no suitable gifts, return an empty array []. Do not add explanatory text outside the JSON.
`;
  
  let currentTemperature = 0.2; // Default temperature

  if (operationType === 'recommend_for_person') {
      systemInstruction += `
SPECIFIC TASK: GENERATE PERSONALIZED RECOMMENDATIONS for "${primaryTargetPerson}".
- User's text prompt (if any): "${isImagePrompt ? (promptContents.parts.find((p:any) => p.text)?.text || "Analyze image for gift.") : (promptContents.parts[0]?.text || "No specific request, general ideas.")}" provides guidance on what *kind* of gift they are looking for.
- Knowledge about this person: "${customKnowledge || 'Not specified'}"
- Their existing gift ideas (avoid exact duplicates, suggest complementary items): ${customExistingGifts && customExistingGifts.length > 0 ? JSON.stringify(customExistingGifts.map(g => g.itemName)) : "None specified"}
- Focus new suggestions primarily for THIS person. Provide 1-3 highly specific recommendations.
`;
      if (isImagePrompt) {
          systemInstruction += `- The provided image is a product idea for "${primaryTargetPerson}". Identify it and provide details.`;
      }
      currentTemperature = 0.5; // Higher temperature for creative recommendations
  } else { // operationType === 'parse_and_assign'
      systemInstruction += `
SPECIFIC TASK: PARSE USER'S TEXT/IMAGE for gift items and assign to an EXISTING PERSON.
- User's input (text or image analysis) likely contains specific gift items and potentially for whom. Extract these.
- If a recipient mentioned in the input matches a name in ${existingNamesListString}, associate the gift with them.
- If no specific recipient matches, or if it's a general product image without context, associate gift(s) with "${primaryTargetPerson}".
- Do NOT generate new gift ideas beyond what the user explicitly states or what is visible/described in an image. Focus on parsing and assignment.
- If the image is a screenshot of text (e.g., a chat), extract gift wishes and assign them appropriately.
`;
      currentTemperature = 0.1; // Lower temperature for deterministic parsing
  }


  try {
    const response: GenerateContentResponse = await genAI.models.generateContent({
      model: model,
      contents: promptContents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: currentTemperature, 
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
                } else if (allRecipientNames.includes(rawSuggestion.personName)) { // Case-sensitive match if no lowercase match
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
    hasCustomContext: boolean = false,
    operationType: GiftOperationType = 'parse_and_assign' 
    ): Promise<SinglePersonGiftSuggestion[] | null> => {
    return generateGiftIdeas({ parts: [{ text: text }] }, targetPersonName, allRecipientNames, customKnowledge, customExistingGifts, false, hasCustomContext, operationType);
  },

  generateGiftIdeasFromImage: async (
    base64ImageData: string,
    mimeType: string,
    targetPersonName: string, 
    allRecipientNames: string[],
    customKnowledge?: string,
    customExistingGifts?: AISuggestedGiftItem[],
    hasCustomContext: boolean = false,
    operationType: GiftOperationType = 'parse_and_assign'
  ): Promise<SinglePersonGiftSuggestion[] | null> => {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64ImageData,
      },
    };
    
    // The text prompt for image analysis is now mostly handled by the system instruction based on operationType.
    // We can provide a very generic text part if needed, or the user's text prompt if operationType is 'recommend'.
    // If user provided text along with image for "recommend", that text will be in promptContents.parts[0].text.
    // For "parse", text should generally be minimal/contextual.
    let textPromptForImage = "Analyze this image for gift ideas.";
    if (operationType === 'recommend_for_person') {
        // For recommend, text part is expected to be user's typed prompt (if any)
        // This generic text is a fallback if promptContents won't include user's actual text later
        textPromptForImage = `Gift ideas related to this image for ${targetPersonName}. If I provided more text, use that as primary guidance.`;
    }


    const textPart = { text: textPromptForImage }; 
    const contents = { parts: [imagePart, textPart] };

    return generateGiftIdeas(contents, targetPersonName, allRecipientNames, customKnowledge, customExistingGifts, true, hasCustomContext, operationType);
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
  "fullLyrics": :string (Optional if no lyrics are present: the complete text of the song as it is written in the given lyrics/chords/sheets. NO CHORDS here, only text.)
  "uniqueChords": [
    {
      "chordName": "string (Standard chord name, e.g., C, Gm7, F#dim, Am/G, Cmaj7. Each unique chord symbol from the input appears ONLY ONCE here)",
      "notes": ["string (e.g., C4)", "string (e.g., E4)", "string (G4)"] 
    }
  ],
  "chordProgression": [
    {
      "chordName": "string (The chord symbol as it appears in sequence. Must match a chordName in uniqueChords)",
      "originalContext": "string (Optional if no lyrics are present: snippet of lyrics/text where the chord appears and sounds until the next chord starts, e.g., 'My heart wants to...')"
    }
  ]
}`;

    const systemInstruction = `You are a musical assistant specializing in piano chords.
Given lyrics or an image of sheet music, identify musical chords, song metadata (title, lyricist, composer if available), and the chord progression.

RESPONSE RULES:
1.  **JSON Structure:** Respond STRICTLY with a SINGLE JSON object in the format: ${jsonFormat}. The 'responseMimeType' is 'application/json'.
2.  **Song Metadata:** 'songTitle', 'lyricsBy', 'musicBy' are optional. If you cant find them or do not recognize the song and know them yourself, they can be omitted or 'songTitle' can be 'Unknown Title'.
3.  **Unique Chords Array ('uniqueChords'):**
    a. This array MUST contain an inventory of all unique chord symbols identified in the input (e.g., C, G, Am/G, Fmaj7). Each unique chord symbol should appear EXACTLY ONCE in this array.
    b. Each object in 'uniqueChords' must have 'chordName' (string) and 'notes' (array of string pitch notations like "C4", "F#3").
    c. **Voicing for 'notes' in 'uniqueChords.notes':** For each chord, provide ONE representative, easy-to-play voicing (e.g., root position or a common, comfortable inversion). This will be the AI's suggested voicing.
        i. **7th Chords Voicing (for this single suggested voicing):**
            - For DOMINANT 7TH chords (e.g., C7, G7, A7 - major triad with a minor 7th), list ONLY THREE notes by OMITTING THE 5TH DEGREE. Example: G7 (G-B-D-F) -> ["G3", "B3", "F4"].
            - For ALL OTHER types of 7th chords (e.g., Cmaj7, Am7, F#m7b5, Cdim7), list ALL FOUR notes (root, 3rd, 5th, 7th), voiced appropriately. Example: Cmaj7 (C-E-G-B) -> ["C4", "E4", "G4", "B4"]; Am7 (A-C-E-G) -> ["A3", "C4", "E4", "G4"].
4.  **Chord Progression Array ('chordProgression'):**
    a. This array MUST list all identified chords in the EXACT SEQUENCE they appear in the input material.
    b. Each object in 'chordProgression' must have 'chordName' (string), which MUST match a 'chordName' from an entry in the 'uniqueChords' array.
    c. Include 'originalContext' (the snippet of lyrics/text over which the chord is played and sounds, e.g., 'Happy birthday to you'). Typically this can be copied from the given lyrics/chords/sheets. Refer to the fullLyrics to make sure that you do not miss any text and do not overlap any text. If no direct lyrics context, put [Instrumental].
    d. originalContext needs to contain only the part of the sentence/line that the chord is played for and sounds on until the next chord. When a line is split, indicate this with "...". 
5.  **Input Analysis:**
    a. If input is lyrics: Look for chord symbols (like C, G, Am/G, Fmaj7) typically found above or within the text. Extract these into 'originalContext'.
    b. If input is sheet music image: Analyze for explicit chord symbols, implied harmony, song title, composer, and lyricist.
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
          { text: "Analyze the following sheet music image. Provide song title, authors, an inventory of unique chords (following specific 7th chord voicing rules for the suggested notes), the complete lyrics, and the chord progression as per the specified JSON structure." },
          { inlineData: { mimeType: promptContent.mimeType, data: promptContent.base64ImageData } },
        ],
      };
    } else if (promptContent.text) {
      const firstLine = promptContent.text.split('\n')[0].trim();
      if (firstLine.length > 0 && firstLine.length < 50 && !firstLine.includes('[')) { 
        defaultTitle = firstLine;
      }
      contentsRequest = { parts: [{ text: `Analyze the following lyrics/chords. Provide song title, authors, an inventory of unique chords (following specific 7th chord voicing rules for the suggested notes), the complete lyrics, and the chord progression as per the specified JSON structure. Lyrics/Chords: ${promptContent.text}` }] };
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