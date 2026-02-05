import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

const STORAGE_KEY = 'bambino_voice_settings';

interface VoiceSettingsContextValue {
  voiceIdentifier: string | null;
  setVoiceIdentifier: (identifier: string | null) => Promise<void>;
  resetToDefault: () => Promise<void>;
  getBestVoice: () => Promise<string | undefined>;
  isLoading: boolean;
}

const VoiceSettingsContext = createContext<VoiceSettingsContextValue | undefined>(undefined);

interface VoiceSettingsProviderProps {
  children: React.ReactNode;
}

export function VoiceSettingsProvider({ children }: VoiceSettingsProviderProps) {
  const [voiceIdentifier, setVoiceIdentifierState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    async function loadVoiceSettings() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setVoiceIdentifierState(stored);
        }
      } catch (error) {
        console.error('Failed to load voice settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadVoiceSettings();
  }, []);

  const setVoiceIdentifier = useCallback(async (identifier: string | null) => {
    try {
      if (identifier === null) {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, identifier);
      }
      setVoiceIdentifierState(identifier);
    } catch (error) {
      console.error('Failed to save voice settings:', error);
      throw error;
    }
  }, []);

  const resetToDefault = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setVoiceIdentifierState(null);
    } catch (error) {
      console.error('Failed to reset voice settings:', error);
      throw error;
    }
  }, []);

  // Helper to get the best available voice (user preference or auto-select)
  const getBestVoice = useCallback(async (): Promise<string | undefined> => {
    // If user has selected a specific voice, use it
    if (voiceIdentifier) {
      return voiceIdentifier;
    }

    // Auto-select best available English voice
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const englishVoices = voices.filter(
        (v) => v.language.startsWith('en') && v.quality === 'Enhanced',
      );
      return englishVoices[0]?.identifier;
    } catch (error) {
      console.error('Failed to get available voices:', error);
      return undefined;
    }
  }, [voiceIdentifier]);

  return (
    <VoiceSettingsContext.Provider
      value={{
        voiceIdentifier,
        setVoiceIdentifier,
        resetToDefault,
        getBestVoice,
        isLoading,
      }}
    >
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  const context = useContext(VoiceSettingsContext);
  if (context === undefined) {
    throw new Error('useVoiceSettings must be used within a VoiceSettingsProvider');
  }
  return context;
}
