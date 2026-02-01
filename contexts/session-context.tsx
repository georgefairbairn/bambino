import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Id } from '@/convex/_generated/dataModel';

const STORAGE_KEY = 'bambino_active_session';

interface SessionContextValue {
  activeSessionId: Id<'sessions'> | null;
  setActiveSession: (sessionId: Id<'sessions'>) => Promise<void>;
  clearActiveSession: () => Promise<void>;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [activeSessionId, setActiveSessionId] = useState<Id<'sessions'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    async function loadActiveSession() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setActiveSessionId(stored as Id<'sessions'>);
        }
      } catch (error) {
        console.error('Failed to load active session:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadActiveSession();
  }, []);

  const setActiveSession = useCallback(async (sessionId: Id<'sessions'>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, sessionId);
      setActiveSessionId(sessionId);
    } catch (error) {
      console.error('Failed to save active session:', error);
      throw error;
    }
  }, []);

  const clearActiveSession = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setActiveSessionId(null);
    } catch (error) {
      console.error('Failed to clear active session:', error);
      throw error;
    }
  }, []);

  return (
    <SessionContext.Provider
      value={{
        activeSessionId,
        setActiveSession,
        clearActiveSession,
        isLoading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}
