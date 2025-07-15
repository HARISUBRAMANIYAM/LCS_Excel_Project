// src/contexts/ThemeContext.ts
import { createContext, useContext } from 'react';

export interface Theme {
  background: string;
  text: string;
  // Add other theme-related properties
}

export const lightTheme: Theme = {
  background: '#ffffff',
  text: '#000000',
};

export const darkTheme: Theme = {
  background: '#333333',
  text: '#ffffff',
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};