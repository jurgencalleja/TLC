import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeColors {
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  accent: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

const darkColors: ThemeColors = {
  bg: {
    primary: '#0a0a0b',
    secondary: '#141416',
    tertiary: '#1e1e21',
  },
  text: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    muted: '#71717a',
  },
  accent: '#3b82f6',
  border: '#27272a',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  info: '#06b6d4',
};

const lightColors: ThemeColors = {
  bg: {
    primary: '#ffffff',
    secondary: '#f4f4f5',
    tertiary: '#e4e4e7',
  },
  text: {
    primary: '#09090b',
    secondary: '#52525b',
    muted: '#a1a1aa',
  },
  accent: '#2563eb',
  border: '#e4e4e7',
  success: '#16a34a',
  warning: '#ca8a04',
  error: '#dc2626',
  info: '#0891b2',
};

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  useSystemTheme: boolean;
  setUseSystemTheme: (use: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [useSystemTheme, setUseSystemTheme] = useState(false);

  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // Persist to localStorage if available
  useEffect(() => {
    if (typeof localStorage !== 'undefined' && !useSystemTheme) {
      localStorage.setItem('tlc-theme', theme);
    }
  }, [theme, useSystemTheme]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('tlc-theme') as Theme | null;
      if (saved) {
        setThemeState(saved);
      }
    }
  }, []);

  const value: ThemeContextValue = {
    theme,
    isDark,
    isLight,
    colors,
    toggleTheme,
    setTheme,
    useSystemTheme,
    setUseSystemTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default values if used outside provider
    return {
      theme: 'dark',
      isDark: true,
      isLight: false,
      colors: darkColors,
      toggleTheme: () => {},
      setTheme: () => {},
      useSystemTheme: false,
      setUseSystemTheme: () => {},
    };
  }
  return context;
}

export default useTheme;
