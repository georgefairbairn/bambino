import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { Id } from '@/convex/_generated/dataModel';

const STORAGE_KEY = 'bambino_active_search';

interface SearchContextValue {
  activeSearchId: Id<'searches'> | null;
  setActiveSearch: (searchId: Id<'searches'>) => Promise<void>;
  clearActiveSearch: () => Promise<void>;
  isLoading: boolean;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

interface SearchProviderProps {
  children: React.ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [activeSearchId, setActiveSearchId] = useState<Id<'searches'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    async function loadActiveSearch() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setActiveSearchId(stored as Id<'searches'>);
        }
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        setIsLoading(false);
      }
    }
    loadActiveSearch();
  }, []);

  const setActiveSearch = useCallback(async (searchId: Id<'searches'>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, searchId);
      setActiveSearchId(searchId);
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }, []);

  const clearActiveSearch = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setActiveSearchId(null);
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }, []);

  return (
    <SearchContext.Provider
      value={{
        activeSearchId,
        setActiveSearch,
        clearActiveSearch,
        isLoading,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
}
