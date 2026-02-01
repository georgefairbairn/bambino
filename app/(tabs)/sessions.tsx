import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useActiveSession } from '@/hooks/use-active-session';
import { SessionCard } from '@/components/session/session-card';
import { SessionFormModal } from '@/components/session/session-form-modal';
import { Fonts } from '@/constants/theme';

type GenderFilter = 'boy' | 'girl' | 'both';

interface SessionWithRole {
  _id: Id<'sessions'>;
  name: string;
  genderFilter: GenderFilter;
  role: 'owner' | 'partner';
  shareCode: string;
  status: 'active' | 'archived';
  ownerId: Id<'users'>;
  createdAt: number;
  updatedAt: number;
}

export default function Sessions() {
  const router = useRouter();
  const { activeSessionId, setActiveSession } = useActiveSession();
  const sessions = useQuery(api.sessions.getUserSessions) as SessionWithRole[] | undefined;

  const createSession = useMutation(api.sessions.createSession);
  const updateSession = useMutation(api.sessions.updateSession);
  const deleteSession = useMutation(api.sessions.deleteSession);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionWithRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSessionPress = useCallback(
    async (session: SessionWithRole) => {
      await setActiveSession(session._id);
      router.push('/(tabs)');
    },
    [setActiveSession, router],
  );

  const handleMenuPress = useCallback((session: SessionWithRole) => {
    setEditingSession(session);
    setModalVisible(true);
  }, []);

  const handleCreatePress = useCallback(() => {
    setEditingSession(null);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingSession(null);
  }, []);

  const handleSubmit = useCallback(
    async (data: { name: string; genderFilter: GenderFilter }) => {
      setIsSubmitting(true);
      try {
        if (editingSession) {
          await updateSession({
            sessionId: editingSession._id,
            name: data.name,
            genderFilter: data.genderFilter,
          });
        } else {
          const newSessionId = await createSession({
            name: data.name,
            genderFilter: data.genderFilter,
          });
          // Set new session as active and navigate
          await setActiveSession(newSessionId);
          router.push('/(tabs)');
        }
        handleCloseModal();
      } catch (error) {
        console.error('Failed to save session:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingSession, createSession, updateSession, setActiveSession, router, handleCloseModal],
  );

  const handleDelete = useCallback(async () => {
    if (!editingSession) return;

    setIsSubmitting(true);
    try {
      await deleteSession({ sessionId: editingSession._id });

      // If deleted session was active, switch to first remaining session
      if (activeSessionId === editingSession._id && sessions && sessions.length > 1) {
        const remainingSession = sessions.find((s) => s._id !== editingSession._id);
        if (remainingSession) {
          await setActiveSession(remainingSession._id);
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to delete session:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    editingSession,
    deleteSession,
    activeSessionId,
    sessions,
    setActiveSession,
    handleCloseModal,
  ]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sessions</Text>
      </View>

      {/* Session list */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SessionCardWithStats
            session={item}
            isActive={item._id === activeSessionId}
            onPress={() => handleSessionPress(item)}
            onMenuPress={() => handleMenuPress(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sessions yet</Text>
            <Text style={styles.emptySubtext}>Create a session to start swiping on names</Text>
          </View>
        }
      />

      {/* FAB */}
      <Pressable style={styles.fab} onPress={handleCreatePress}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>

      {/* Modal */}
      <SessionFormModal
        visible={modalVisible}
        session={editingSession}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        isSubmitting={isSubmitting}
      />
    </SafeAreaView>
  );
}

// Separate component to fetch stats per session
function SessionCardWithStats({
  session,
  isActive,
  onPress,
  onMenuPress,
}: {
  session: SessionWithRole;
  isActive: boolean;
  onPress: () => void;
  onMenuPress: () => void;
}) {
  const stats = useQuery(api.selections.getSelectionStats, {
    sessionId: session._id,
  });

  return (
    <SessionCard
      name={session.name}
      genderFilter={session.genderFilter}
      role={session.role}
      isActive={isActive}
      stats={{
        total: stats?.total ?? 0,
        liked: stats?.liked ?? 0,
      }}
      onPress={onPress}
      onMenuPress={onMenuPress}
    />
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
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
