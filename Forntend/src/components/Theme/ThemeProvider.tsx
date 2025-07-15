// src/contexts/ThemeProvider.tsx
import React, { useState, useEffect } from 'react';
import { ThemeContext, lightTheme, darkTheme } from '../../interface/ThemeContext';
import type { Theme } from '../../interface/ThemeContext';


interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(lightTheme);

  useEffect(() => {
    // Optionally load theme from local storage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setCurrentTheme(darkTheme);
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setCurrentTheme(lightTheme);
         document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    setCurrentTheme((prevTheme:any) => {
      const newTheme = prevTheme === lightTheme ? darkTheme : lightTheme;
       const newThemeName = newTheme === darkTheme ? 'dark' : 'light';
      localStorage.setItem('theme', newThemeName);
       document.documentElement.setAttribute('data-theme', newThemeName);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};