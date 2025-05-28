
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SinglePersonGiftSuggestion, AISuggestedGiftItem } from '../types';
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
    console.log("GoogleGenAI initialized successfully.");
    return ai;
  } catch (error: any) {
    console.error("Error initializing GoogleGenAI:", error.message);
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

  // Pre-process to replace invalid escape sequence \$ with just $
  // This addresses the "Bad escaped character in JSON" error for dollar signs.
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
  hasCustomContext: boolean = false, // New parameter
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
  // isNewPersonCandidate is always false. The AI will map to existing names or the primaryTargetPerson.
  
  const jsonFormat = `
[
  {
    "personName": "string (MUST be from the existing names list: [${allRecipientNames.map(n => `"${n}"`).join(', ')}], or resolve to '${primaryTargetPerson}' if no clear match or if it's a general query for the primary target.)",
    "gifts": [ 
      { "itemName": "string (Specific product name or item described)", "details": "string (Detailed description. Include approximate price like '~\\$25' or 'range \\$50-\\$70', and potential vendor/store like 'from Amazon', 'local Etsy shop', 'Target', etc. If image prompt, extract this from image if possible.)" }
    ]
  }
  // ... more entries if gifts for multiple existing people are clearly identified.
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

  if (hasCustomContext) { // Person is selected - AI should GENERATE recommendations
    systemInstruction += `
SPECIFIC TASK: GENERATE PERSONALIZED RECOMMENDATIONS for "${primaryTargetPerson}".
- Knowledge about this person: "${customKnowledge || 'Not specified'}"
- Their existing gift ideas (avoid exact duplicates, suggest complementary items): ${customExistingGifts && customExistingGifts.length > 0 ? JSON.stringify(customExistingGifts) : "None specified"}
- Focus new suggestions primarily for THIS person. Provide ONLY ONE highly specific recommendation unless the user explicitly asks for more.
`;
    if (isImagePrompt) {
      systemInstruction += `- If an image is provided, it's a product for "${primaryTargetPerson}". Identify it and provide details.`;
    }
  } else { // No person selected - AI should PARSE information or IDENTIFY from image
    if (isImagePrompt) {
      systemInstruction += `
SPECIFIC TASK: ANALYZE IMAGE and associate with an EXISTING PERSON.
- If image is a product photo: Identify it and its details. Associate with "${primaryTargetPerson}".
- If image is a screenshot of text (e.g., a chat): Analyze text for gift wishes. If a recipient mentioned in the text matches a name in ${existingNamesListString}, associate the gift with them. Otherwise, associate with "${primaryTargetPerson}".
`;
    } else { // Text prompt, no custom context
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
        temperature: hasCustomContext ? 0.4 : 0.2, // Lower temp for parsing, slightly higher for generation
      },
    });
    
    const textResponse = response.text;
    if (!textResponse) {
      console.error("Gemini API returned no text response.");
      return null;
    }
    // console.warn("System Instruction (Gemini Service):", systemInstruction); // For debugging
    // console.warn("AI Raw Response (Gemini Service):", textResponse); // For debugging
    
    let parsedSuggestions = parseJsonFromText<any[]>(textResponse); // Use any[] initially for flexibility
    
    if (parsedSuggestions && Array.isArray(parsedSuggestions)) {
        const validatedSuggestions: SinglePersonGiftSuggestion[] = [];
        for (const rawSuggestion of parsedSuggestions) {
            // Ensure personName is valid and from the existing list, or defaults to primaryTargetPerson
            let finalPersonName = primaryTargetPerson; // Default
            if (rawSuggestion.personName && typeof rawSuggestion.personName === 'string') {
                const matchedName = allRecipientNames.find(name => name.toLowerCase() === rawSuggestion.personName.toLowerCase());
                if (matchedName) {
                    finalPersonName = matchedName;
                } else if (allRecipientNames.includes(rawSuggestion.personName)) {
                    finalPersonName = rawSuggestion.personName;
                }
                // If no match, it defaults to primaryTargetPerson as initialized
            }

            if (finalPersonName && rawSuggestion.gifts && Array.isArray(rawSuggestion.gifts) && rawSuggestion.gifts.length > 0) {
                 const validGifts = rawSuggestion.gifts.filter((g: any) => g.itemName && typeof g.itemName === 'string' && g.itemName.trim() !== "")
                                                    .map((g: any) => ({ itemName: g.itemName, details: g.details || '' }));
                if (validGifts.length > 0) {
                    validatedSuggestions.push({
                        personName: finalPersonName,
                        // isNewPersonCandidate will be omitted or always false client-side
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
    targetPersonName: string, // This is primaryTargetPerson
    allRecipientNames: string[],
    customKnowledge?: string,
    customExistingGifts?: AISuggestedGiftItem[],
    hasCustomContext: boolean = false // Pass this down
    ): Promise<SinglePersonGiftSuggestion[] | null> => {
    return generateGiftIdeas({ parts: [{ text: text }] }, targetPersonName, allRecipientNames, customKnowledge, customExistingGifts, false, hasCustomContext);
  },

  generateGiftIdeasFromImage: async (
    base64ImageData: string,
    mimeType: string,
    targetPersonName: string, // This is primaryTargetPerson
    allRecipientNames: string[],
    customKnowledge?: string,
    customExistingGifts?: AISuggestedGiftItem[],
    hasCustomContext: boolean = false // Pass this down
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
  
  getApiKeyStatus: (): typeof apiKeyStatus => {
    if (apiKeyStatus === 'unknown') { 
        initializeGemini();
    }
    return apiKeyStatus;
  }
};
