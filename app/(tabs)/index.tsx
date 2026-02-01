import { useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { SwipeCardStack } from '@/components/swipe/swipe-card-stack';
import { SessionHeader } from '@/components/swipe/session-header';
import { useActiveSession } from '@/hooks/use-active-session';

export default function Home() {
  const sessions = useQuery(api.sessions.getUserSessions);
  const {
    activeSessionId,
    setActiveSession,
    clearActiveSession,
    isLoading: isSessionLoading,
  } = useActiveSession();
  const router = useRouter();

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

  const stats = useQuery(
    api.selections.getSelectionStats,
    activeSession ? { sessionId: activeSession._id } : 'skip',
  );

  // Key to reset SwipeCardStack when session or filters change
  const swipeQueueKey = useMemo(() => {
    if (!activeSession) return '';
    const originKey = (activeSession.originFilter ?? []).sort().join(',');
    return `${activeSession._id}-${activeSession.genderFilter}-${originKey}-${activeSession.updatedAt}`;
  }, [activeSession]);

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

  // Empty sessions state
  if (sessions.length === 0 || !activeSession) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="heart-outline" size={64} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>No Sessions Yet</Text>
          <Text style={styles.emptyDescription}>
            Create a session to start swiping through baby names with your partner.
          </Text>
          <Pressable style={styles.createButton} onPress={() => router.push('/(tabs)/sessions')}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Create Session</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SessionHeader
        sessionName={activeSession.name}
        reviewed={stats?.total ?? 0}
        liked={stats?.liked ?? 0}
      />
      <SwipeCardStack key={swipeQueueKey} sessionId={activeSession._id} />
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
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
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
});
