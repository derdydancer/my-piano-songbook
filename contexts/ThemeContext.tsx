
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useLocalStorage<Theme>('app-theme', 'light');

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  useEffect(() => {
    const rootStyle = document.documentElement.style;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      rootStyle.setProperty('--primary-color', '#60a5fa'); // blue-400
      rootStyle.setProperty('--primary-color-rgb', '96, 165, 250');
      rootStyle.setProperty('--secondary-color', '#9ca3af'); // gray-400
      rootStyle.setProperty('--background-color', '#1f2937'); // gray-800
      rootStyle.setProperty('--card-color', '#374151'); // gray-700
      rootStyle.setProperty('--text-primary-color', '#f3f4f6'); // gray-100
      rootStyle.setProperty('--text-secondary-color', '#d1d5db'); // gray-300
    } else {
      document.documentElement.classList.remove('dark');
      rootStyle.setProperty('--primary-color', '#3b82f6'); // blue-500
      rootStyle.setProperty('--primary-color-rgb', '59, 130, 246');
      rootStyle.setProperty('--secondary-color', '#6b7280'); // gray-500
      rootStyle.setProperty('--background-color', '#f3f4f6'); // gray-100
      rootStyle.setProperty('--card-color', '#ffffff');
      rootStyle.setProperty('--text-primary-color', '#1f2937'); // gray-800
      rootStyle.setProperty('--text-secondary-color', '#4b5563'); // gray-600
    }
  }, [theme]);


  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
