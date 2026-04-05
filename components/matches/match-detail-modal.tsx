import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { GenderBadge } from '@/components/name-detail/gender-badge';
import * as Haptics from 'expo-haptics';
import * as Sentry from '@sentry/react-native';

interface MatchDetailModalProps {
  visible: boolean;
  match: {
    _id: Id<'matches'>;
    nameId: Id<'names'>;
    isFavorite?: boolean;
    notes?: string;
    rank?: number;
    isChosen?: boolean;
    matchedAt: number;
    name: Doc<'names'>;
  } | null;
  onClose: () => void;
}

export function MatchDetailModal({ visible, match, onClose }: MatchDetailModalProps) {
  const { colors } = useTheme();
  const [notes, setNotes] = useState('');
  const [rank, setRank] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateMatch = useMutation(api.matches.updateMatch);
  const deleteMatch = useMutation(api.matches.deleteMatch);

  // Reset form when match changes
  useEffect(() => {
    if (match) {
      setNotes(match.notes ?? '');
      setRank(match.rank ? String(match.rank) : '');
    }
  }, [match]);

  if (!match) return null;

  const { name, isFavorite, isChosen } = match;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateMatch({
        matchId: match._id,
        notes: notes.trim() || undefined,
        rank: rank ? parseInt(rank, 10) : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await updateMatch({
        matchId: match._id,
        isFavorite: !isFavorite,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const handleChoose = async () => {
    Alert.alert(
      'Choose This Name?',
      `Are you sure you want to choose "${name.name}" as your final selection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose',
          onPress: async () => {
            try {
              await updateMatch({
                matchId: match._id,
                isChosen: true,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onClose();
            } catch (error) {
              Sentry.captureException(error);
              Alert.alert('Error', 'Failed to choose name. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleRemoveMatch = () => {
    Alert.alert(
      'Remove Match?',
      `Are you sure you want to remove "${name.name}" from your matches? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMatch({ matchId: match._id });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onClose();
            } catch (error) {
              Sentry.captureException(error);
              Alert.alert('Error', 'Failed to remove match. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={styles.headerTitle}>Match Details</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B5B7B" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name display */}
            <View style={styles.nameSection}>
              <View style={[styles.matchBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="heart" size={16} color="#fff" />
                <Text style={styles.matchBadgeText}>{"It's a Match!"}</Text>
              </View>
              <Text style={styles.name}>{name.name}</Text>
              <View style={styles.badges}>
                <GenderBadge gender={name.gender as 'boy' | 'girl' | 'unisex'} />
                <View style={[styles.originBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.originText, { color: colors.primary }]}>{name.origin}</Text>
                </View>
              </View>
              {name.meaning && <Text style={styles.meaning}>{name.meaning}</Text>}
            </View>

            {/* Quick actions */}
            <View style={styles.quickActions}>
              <Pressable
                style={[
                  styles.quickAction,
                  { borderColor: colors.border },
                  isFavorite && { borderColor: colors.primary, backgroundColor: colors.secondaryLight },
                ]}
                onPress={handleToggleFavorite}
              >
                <Ionicons
                  name={isFavorite ? 'star' : 'star-outline'}
                  size={24}
                  color={isFavorite ? colors.primary : '#6B5B7B'}
                />
                <Text style={[styles.quickActionText, isFavorite && { color: colors.primary }]}>
                  {isFavorite ? 'Favorited' : 'Favorite'}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.quickAction,
                  { borderColor: colors.border },
                  isChosen && { borderColor: colors.primary, backgroundColor: colors.primary },
                ]}
                onPress={isChosen ? undefined : handleChoose}
                disabled={isChosen}
              >
                <Ionicons
                  name={isChosen ? 'trophy' : 'trophy-outline'}
                  size={24}
                  color={isChosen ? '#fff' : '#6B5B7B'}
                />
                <Text style={[styles.quickActionText, isChosen && styles.quickActionTextChosen]}>
                  {isChosen ? 'Chosen!' : 'Choose'}
                </Text>
              </Pressable>
            </View>

            {/* Notes input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[
                  styles.notesInput,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                placeholder="Add your thoughts about this name..."
                placeholderTextColor="#A89BB5"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>

            {/* Rank input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Rank</Text>
              <View style={styles.rankContainer}>
                <TextInput
                  style={[
                    styles.rankInput,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ]}
                  placeholder="#"
                  placeholderTextColor="#A89BB5"
                  keyboardType="number-pad"
                  value={rank}
                  onChangeText={(text) => setRank(text.replace(/[^0-9]/g, ''))}
                  maxLength={2}
                />
                <Text style={styles.rankHint}>Set a priority ranking (1 = top choice)</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.buttons}>
              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  isSaving && styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
              </Pressable>

              <Pressable style={styles.removeButton} onPress={handleRemoveMatch}>
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={styles.removeButtonText}>Remove Match</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 34,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
  },
  matchBadgeText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
  name: {
    fontSize: 42,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  originBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  originText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
  },
  meaning: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  quickActionText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#6B5B7B',
  },
  quickActionTextChosen: {
    color: '#fff',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
    marginBottom: 8,
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
    minHeight: 100,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 18,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    width: 60,
    textAlign: 'center',
  },
  rankHint: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
  buttons: {
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD4E0',
    gap: 8,
  },
  removeButtonText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});
