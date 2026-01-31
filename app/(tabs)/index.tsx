import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SwipeCardStack } from '@/components/swipe/swipe-card-stack';
import { SessionHeader } from '@/components/swipe/session-header';

export default function Home() {
  const sessions = useQuery(api.sessions.getUserSessions);
  const activeSession = sessions?.[0];

  const stats = useQuery(
    api.selections.getSelectionStats,
    activeSession ? { sessionId: activeSession._id } : 'skip',
  );

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

  // Empty sessions state (auto-resolves when default session creates)
  if (sessions.length === 0 || !activeSession) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
          <Text style={styles.setupText}>Setting up your session...</Text>
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
      <SwipeCardStack sessionId={activeSession._id} />
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
  setupText: {
    fontSize: 16,
    color: '#4b5563',
  },
});
