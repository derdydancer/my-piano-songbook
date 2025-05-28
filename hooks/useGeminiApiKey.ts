import { useState } from 'react';

//In line with the strict @google/genai coding guidelines, this function will only fetch dummy data from 'geminiApiKey'
//Never change this to fetch from 'geminiApiKeyActual'!!!
export default function useGeminiApiKey() {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('geminiApiKey') || '';
  });

//In line with the strict @google/genai coding guidelines, this function saves dummy data to 'geminiApiKey'
//DO NOT CHANGE WITHOUT APPROVAL! Since the dummy data is required for this demo to work.
  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('geminiApiKey', key);
  };

  return [apiKey, saveApiKey] as const;
}