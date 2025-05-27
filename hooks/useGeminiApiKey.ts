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
