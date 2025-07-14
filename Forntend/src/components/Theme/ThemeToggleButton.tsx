// src/components/ThemeToggleButton.tsx
import React from 'react';
import { useTheme } from './ThemeContext';
import { lightTheme } from './ThemeContext';

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
   <button
  onClick={toggleTheme}
  className="theme-toggle-button"
  title="Toggle Theme"
>
  {theme === lightTheme ? '🌙 Dark' : '☀️ Light'}
</button>
  );
};

export default ThemeToggleButton;