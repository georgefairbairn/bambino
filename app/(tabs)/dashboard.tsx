import { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { useActiveSession } from '@/hooks/use-active-session';
import { LikedNamesHeader, SortOption } from '@/components/dashboard/liked-names-header';
import { SearchInput } from '@/components/dashboard/search-input';
import { LikedNameCard } from '@/components/dashboard/liked-name-card';
import { Fonts } from '@/constants/theme';

export default function Dashboard() {
  const sessions = useQuery(api.sessions.getUserSessions);
  const {
    activeSessionId,
    setActiveSession,
    clearActiveSession,
    isLoading: isSessionLoading,
  } = useActiveSession();
  const router = useRouter();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('liked_newest');

  // Find active session from context, fallback to first session
  const activeSession = sessions?.find((s) => s._id === activeSessionId) ?? sessions?.[0];

  // Clear stale activeSessionId when it doesn't match any session
  useEffect(() => {
    if (sessions && activeSessionId && !isSessionLoading) {
      const sessionExists = sessions.some((s) => s._id === activeSessionId);
      if (!sessionExists) {
        clearActiveSession();
      }
    }
  }, [sessions, activeSessionId, isSessionLoading, clearActiveSession]);

  // If no active session is set but we have sessions, set the first one as active
  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId && !isSessionLoading) {
      setActiveSession(sessions[0]._id);
    }
  }, [sessions, activeSessionId, isSessionLoading, setActiveSession]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const likedNames = useQuery(
    api.selections.getLikedNames,
    activeSession?._id
      ? { sessionId: activeSession._id, search: debouncedSearch || undefined, sortBy }
      : 'skip',
  );

  const removeFromLiked = useMutation(api.selections.removeFromLiked);

  // Loading state
  if (sessions === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </SafeAreaView>
    );
  }

  // No sessions state
  if (sessions.length === 0 || !activeSession) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="heart-outline" size={64} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>No Session Selected</Text>
          <Text style={styles.emptyDescription}>
            Create or select a session to view your liked names.
          </Text>
          <Pressable style={styles.createButton} onPress={() => router.push('/(tabs)/sessions')}>
            <Ionicons name="albums" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Go to Sessions</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Liked names loading state
  if (likedNames === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LikedNamesHeader count={0} sortBy={sortBy} onSortChange={setSortBy} />
        <SearchInput value={searchInput} onChangeText={setSearchInput} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </SafeAreaView>
    );
  }

  // Empty liked names state
  if (likedNames.length === 0) {
    const isSearching = debouncedSearch.length > 0;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LikedNamesHeader count={0} sortBy={sortBy} onSortChange={setSortBy} />
        <SearchInput value={searchInput} onChangeText={setSearchInput} />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name={isSearching ? 'search' : 'heart-outline'} size={64} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>
            {isSearching ? 'No Results Found' : 'No Liked Names Yet'}
          </Text>
          <Text style={styles.emptyDescription}>
            {isSearching
              ? `No names match "${debouncedSearch}"`
              : 'Start swiping to add names to your liked list!'}
          </Text>
          {!isSearching && (
            <Pressable style={styles.createButton} onPress={() => router.push('/(tabs)')}>
              <Ionicons name="heart" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Start Swiping</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LikedNamesHeader count={likedNames.length} sortBy={sortBy} onSortChange={setSortBy} />
      <SearchInput value={searchInput} onChangeText={setSearchInput} />
      <FlatList
        data={likedNames}
        keyExtractor={(item) => item.selectionId}
        renderItem={({ item }) => (
          <LikedNameCard
            name={item.name}
            likedAt={item.likedAt}
            onRemove={() => removeFromLiked({ selectionId: item.selectionId })}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C6E7F5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1f2937',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    paddingBottom: 16,
  },
});
