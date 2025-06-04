
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
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('--primary-color', '#60a5fa');
      document.documentElement.style.setProperty('--secondary-color', '#9ca3af');
      document.documentElement.style.setProperty('--background-color', '#1f2937');
      document.documentElement.style.setProperty('--card-color', '#374151');
      document.documentElement.style.setProperty('--text-primary-color', '#f3f4f6');
      document.documentElement.style.setProperty('--text-secondary-color', '#d1d5db');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.setProperty('--primary-color', '#3b82f6');
      document.documentElement.style.setProperty('--secondary-color', '#6b7280');
      document.documentElement.style.setProperty('--background-color', '#f3f4f6');
      document.documentElement.style.setProperty('--card-color', '#ffffff');
      document.documentElement.style.setProperty('--text-primary-color', '#1f2937');
      document.documentElement.style.setProperty('--text-secondary-color', '#4b5563');
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
