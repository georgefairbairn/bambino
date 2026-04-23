import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { type SkinToneKey, VALID_SKIN_TONES } from '@/constants/skin-tone';

const STORAGE_KEY = 'bambino_skin_tone';

interface SkinToneContextValue {
  skinTone: SkinToneKey;
  setSkinTone: (key: SkinToneKey) => Promise<void>;
  isLoading: boolean;
}

const SkinToneContext = createContext<SkinToneContextValue | undefined>(undefined);

interface SkinToneProviderProps {
  children: React.ReactNode;
}

export function SkinToneProvider({ children }: SkinToneProviderProps) {
  const [skinTone, setSkinToneState] = useState<SkinToneKey>('default');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSkinTone() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && VALID_SKIN_TONES.includes(stored as SkinToneKey)) {
          setSkinToneState(stored as SkinToneKey);
        }
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSkinTone();
  }, []);

  const setSkinTone = useCallback(async (key: SkinToneKey) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, key);
      setSkinToneState(key);
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }, []);

  return (
    <SkinToneContext.Provider value={{ skinTone, setSkinTone, isLoading }}>
      {children}
    </SkinToneContext.Provider>
  );
}

export function useSkinTone() {
  const context = useContext(SkinToneContext);
  if (context === undefined) {
    throw new Error('useSkinTone must be used within a SkinToneProvider');
  }
  return context;
}
