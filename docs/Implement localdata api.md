# Implement Local Data API

Apply the following changes to the specified files to support storing the Gemini API key in local storage and updating the settings UI.

---

## 1. `services/GeminiService.ts`

**Replace the `initializeGemini` function with:**

```ts
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
```

---

## 2. `features/settings/SettingsPage.tsx`

**At the top of the file, add:**

```ts
import useGeminiApiKey from '../../hooks/useGeminiApiKey';
```

**In your component, add:**

```ts
const [geminiApiKey, setGeminiApiKey] = useGeminiApiKey();
const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
```

**Replace the original Gemini API section:**

```jsx
<div>
        <h3 className="text-lg font-semibold text-textPrimary mb-2">AI Assistant (Gemini API)</h3>
        <div className="flex items-center p-3 rounded-md bg-background dark:bg-gray-700">
        <InformationCircleIcon className={`w-6 h-6 mr-3 ${apiKeyStatus === 'valid' ? 'text-green-500' : apiKeyStatus === 'missing' ? 'text-red-500' : 'text-yellow-500'}`} />
        <div>
                <p className="text-sm font-medium text-textPrimary">
                        API Key Status: <span className={`font-bold ${apiKeyStatus === 'valid' ? 'text-green-500' : apiKeyStatus === 'missing' ? 'text-red-500' : 'text-yellow-500'}`}>{apiKeyStatus.toUpperCase()}</span>
                </p>
                <p className="text-xs text-textSecondary mt-1">
                        The Gemini API key must be provided via <code>process.env.API_KEY</code>.
                        {apiKeyStatus === 'missing' && " AI features in 'Gifts' may not function."}
                </p>
        </div>
</div>
```

**With the following updated section:**

```jsx
<div>
        <h3 className="text-lg font-semibold text-textPrimary mb-2">AI Assistant (Gemini API)</h3>
        <div className="flex items-center p-3 rounded-md bg-background dark:bg-gray-700">
                <InformationCircleIcon className={`w-6 h-6 mr-3 ${apiKeyStatus === 'valid' ? 'text-green-500' : apiKeyStatus === 'missing' ? 'text-red-500' : 'text-yellow-500'}`} />
                <div>
                        <p className="text-sm font-medium text-textPrimary">
                                API Key Status: <span className={`font-bold ${apiKeyStatus === 'valid' ? 'text-green-500' : apiKeyStatus === 'missing' ? 'text-red-500' : 'text-yellow-500'}`}>{apiKeyStatus.toUpperCase()}</span>
                        </p>
                        <p className="text-xs text-textSecondary mt-1">
                                You can set your Gemini API key below. This is stored in your browser only.
                                {apiKeyStatus === 'missing' && " AI features in 'Gifts' may not function."}
                        </p>
                </div>
        </div>
        <div className="mt-4">
                <h4 className="text-md font-semibold text-textPrimary mb-2">Set Gemini API Key</h4>
                <div className="flex space-x-2">
                        <Input
                                type="password"
                                value={apiKeyInput}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKeyInput(e.target.value)}
                                placeholder="Enter Gemini API Key"
                                className="w-full"
                        />
                        <Button onClick={handleApiKeySave} type="button">Save</Button>
                </div>
                <p className="mt-2 text-xs text-textSecondary">
                        Your key is stored locally and never sent anywhere except to Gemini when you use AI features.
                </p>
        </div>
</div>
```

---

## 3. `hooks/useGeminiApiKey.ts`

**Create this file if it does not exist, and add:**

```ts
import { useState } from 'react';

export default function useGeminiApiKey() {
    const [apiKey, setApiKey] = useState(() => {
        return localStorage.getItem('geminiApiKey') || '';
    });

    const saveApiKey = (key: string) => {
        setApiKey(key);
        localStorage.setItem('geminiApiKey', key);
    };

    return [apiKey, saveApiKey] as const;
}
```

---

**Summary:**  
- The Gemini API key is now stored in local storage if set by the user.
- The settings page allows users to enter and save their API key, which is only stored in their browser.
- The `initializeGemini` function checks local storage before falling back to environment variables.
- A custom React hook (`useGeminiApiKey`) is provided for managing the API key in components.
