import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import {
  type ThemeKey,
  type CandyColorsType,
  type GradientsType,
  getThemeColors,
  getThemeGradients,
} from '@/constants/theme';

const STORAGE_KEY = 'bambino_candy_theme';
const VALID_THEMES: ThemeKey[] = ['pink', 'mint', 'blue', 'yellow'];

interface ThemeContextValue {
  themeKey: ThemeKey;
  setTheme: (key: ThemeKey) => Promise<void>;
  colors: CandyColorsType;
  gradients: GradientsType;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeKey, setThemeKey] = useState<ThemeKey>('pink');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTheme() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && VALID_THEMES.includes(stored as ThemeKey)) {
          setThemeKey(stored as ThemeKey);
        }
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTheme();
  }, []);

  const setTheme = useCallback(async (key: ThemeKey) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, key);
      setThemeKey(key);
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }, []);

  const colors = useMemo(() => getThemeColors(themeKey), [themeKey]);
  const gradients = useMemo(() => getThemeGradients(themeKey), [themeKey]);

  return (
    <ThemeContext.Provider value={{ themeKey, setTheme, colors, gradients, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
