
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SinglePersonGiftSuggestion, AISuggestedGiftItem } from '../types';
import { GEMINI_MODEL_TEXT } from '../constants';
import { DEFAULT_PERSON_SUGGESTION } from '../features/gift-assistant/giftAssistant.constants';

let ai: GoogleGenAI | null = null;
let apiKeyStatus: 'unknown' | 'valid' | 'missing' | 'error' = 'unknown';

const initializeGemini = (): GoogleGenAI | null => {
  if (ai && apiKeyStatus === 'valid') return ai;
  
  // Prevent re-initialization if already determined to be missing or error
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

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini:", e, "Original text:", text);
    const jsonMaybe = jsonStr.match(/(\[.*\]|{.*})/s); // Try to find array or object
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
    "personName": "string (Suggest a verbose name if possible, e.g., 'Triona (Wife)' based on query. If not in existing names, this is a new person candidate.)",
    "isNewPersonCandidate": boolean (Set to true if 'personName' is NOT from the provided existing names list AND the query implies a new person. Otherwise false or omit.)",
    "gifts": [
      { "itemName": "string", "details": "string (optional description)" }
    ]
  }
  // ... more entries if gifts for multiple people are found
]`;
  const existingNamesListString = allRecipientNames.length > 0 ? `[${allRecipientNames.map(n => `"${n}"`).join(', ')}]` : "[] (No existing lists)";

  let customContextPrompt = "";
  if (customKnowledge || (customExistingGifts && customExistingGifts.length > 0)) {
    customContextPrompt += `\n\nIMPORTANT: You are currently generating highly PERSONALIZED recommendations for: "${primaryTargetPerson}".\n`;
    if (customKnowledge) {
      customContextPrompt += `- Knowledge about this person: "${customKnowledge}"\n`;
    }
    if (customExistingGifts && customExistingGifts.length > 0) {
      customContextPrompt += `- Their existing gift ideas (avoid exact duplicates, suggest complementary items): ${JSON.stringify(customExistingGifts)}\n`;
    }
    customContextPrompt += "Focus your new suggestions primarily for THIS person, considering this specific knowledge and their existing gifts. General queries should also be tailored more towards this person if their custom context is active.\n";
  }


  const systemInstruction = `You are an expert gift idea curator.
The user has existing gift lists for these people: ${existingNamesListString}.${customContextPrompt}

Analyze the input (text or image).
- If the input suggests gifts for MULTIPLE people (whether existing or new), structure your response as a JSON array, one object per person.
- For VERBOSE person names: If the user says "My wife Triona needs flowers", try to use "personName": "Triona (Wife)".
- For EXISTING people: If "personName" matches an existing name from the list, "isNewPersonCandidate" MUST be false or omitted.
- For NEW people: If the query implies a new person NOT in the list (e.g., "My cousin Sarah"), "personName" should be their name (e.g., "Sarah (Cousin)"), and "isNewPersonCandidate" MUST be true.
- If the query is general (e.g., "ideas for everyone"), and multiple existing people are relevant, create entries for them. If it seems to imply a new person even in a general query, use "isNewPersonCandidate": true.
- If it's completely unclear or no specific person, you can attribute to "${primaryTargetPerson}" and set "isNewPersonCandidate": false (if "${primaryTargetPerson}" is an existing name and no custom context is active) or true (if it's a new default suggestion or custom context is active for a new person).
- If custom context for "${primaryTargetPerson}" is active, new suggestions should primarily be for them, even if the user's query is general.

Respond STRICTLY with a JSON array of objects in the format: ${jsonFormat}
If no gift ideas are found, return an empty array []. Do not add explanatory text outside the JSON.`;


  try {
    const response: GenerateContentResponse = await genAI.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: customKnowledge || customExistingGifts ? 0.5 : 0.6, // Be more focused if custom context
      },
    });
    
    const textResponse = response.text;
    if (!textResponse) {
      console.error("Gemini API returned no text response.");
      return null;
    }
    
    const parsedSuggestions = parseJsonFromText<SinglePersonGiftSuggestion[]>(textResponse);
    
    if (parsedSuggestions && Array.isArray(parsedSuggestions)) {
        const validatedSuggestions: SinglePersonGiftSuggestion[] = [];
        for (const suggestion of parsedSuggestions) {
            if (suggestion.personName && suggestion.gifts && Array.isArray(suggestion.gifts)) {
                let currentPersonName = suggestion.personName;
                let isNewCandidate = suggestion.isNewPersonCandidate || false;

                if (isNewCandidate && allRecipientNames.length > 0 && allRecipientNames.includes(currentPersonName)) {
                    isNewCandidate = false;
                }
                
                if (currentPersonName) {
                    validatedSuggestions.push({
                        personName: currentPersonName,
                        isNewPersonCandidate: isNewCandidate,
                        gifts: suggestion.gifts.filter(g => g.itemName && g.itemName.trim() !== "") 
                    });
                }
            }
        }
        return validatedSuggestions;
    } else if (typeof parsedSuggestions === 'object' && parsedSuggestions !== null && 'personName' in parsedSuggestions && 'gifts' in parsedSuggestions) {
        console.warn("AI returned a single object, expected an array. Wrapping it.");
        const singleSuggestion = parsedSuggestions as SinglePersonGiftSuggestion;
         let currentPersonName = singleSuggestion.personName;
         let isNewCandidate = singleSuggestion.isNewPersonCandidate || false;
         if (isNewCandidate && allRecipientNames.length > 0 && allRecipientNames.includes(currentPersonName)) {
            isNewCandidate = false;
         }
         if (currentPersonName && singleSuggestion.gifts && Array.isArray(singleSuggestion.gifts)) {
            return [{ 
                personName: currentPersonName, 
                isNewPersonCandidate: isNewCandidate, 
                gifts: singleSuggestion.gifts.filter(g => g.itemName && g.itemName.trim() !== "") 
            }];
         }
         return null;
    } else {
        console.error("Parsed JSON is not in the expected SinglePersonGiftSuggestion[] format:", parsedSuggestions);
        return null;
    }

  } catch (error: any) {
    console.error("Error generating gift ideas with Gemini:", error.message);
    // Check for specific API key error messages if the SDK throws them directly
    if (error.message && (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID"))) {
        apiKeyStatus = 'error'; // Or 'missing' if that's more appropriate
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
    customExistingGifts?: AISuggestedGiftItem[]
    ): Promise<SinglePersonGiftSuggestion[] | null> => {
    return generateGiftIdeas({ parts: [{ text: text }] }, targetPersonName, allRecipientNames, customKnowledge, customExistingGifts);
  },

  generateGiftIdeasFromImage: async (
    base64ImageData: string,
    mimeType: string,
    targetPersonName: string,
    allRecipientNames: string[],
    customKnowledge?: string,
    customExistingGifts?: AISuggestedGiftItem[]
  ): Promise<SinglePersonGiftSuggestion[] | null> => {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64ImageData,
      },
    };
    // Construct a more targeted text part if custom context is available
    let textPromptForImage = `Analyze this image for potential gift ideas.`;
    if (customKnowledge || customExistingGifts) {
        textPromptForImage += ` Focus on suggestions suitable for ${targetPersonName}.`;
        if (customKnowledge) textPromptForImage += ` This person's interests include: ${customKnowledge}.`;
        if (customExistingGifts && customExistingGifts.length > 0) textPromptForImage += ` They already have these ideas: ${customExistingGifts.map(g=>g.itemName).join(', ')}.`;
    } else {
        textPromptForImage += ` Consider items for people like ${targetPersonName} or others in this list: ${allRecipientNames.join(', ')}.`;
    }
     textPromptForImage += ` If you identify a new person, use the 'isNewPersonCandidate' flag.`;


    const textPart = { text: textPromptForImage };
    return generateGiftIdeas({ parts: [imagePart, textPart] }, targetPersonName, allRecipientNames, customKnowledge, customExistingGifts);
  },
  
  getApiKeyStatus: (): typeof apiKeyStatus => {
    if (apiKeyStatus === 'unknown') { 
        initializeGemini(); // Attempt to initialize if status is unknown
    }
    return apiKeyStatus;
  }
};