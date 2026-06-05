import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation } from 'convex/react';
import * as Sentry from '@sentry/react-native';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';
import { Events, trackEvent } from '@/lib/analytics';

const CATEGORIES = [
  { key: 'abusive' as const, label: 'Abusive', icon: 'alert-circle-outline' as const },
  { key: 'harmful' as const, label: 'Harmful', icon: 'warning-outline' as const },
  { key: 'spam' as const, label: 'Spam', icon: 'mail-unread-outline' as const },
  { key: 'other' as const, label: 'Other', icon: 'help-circle-outline' as const },
];

type ReportCategory = 'abusive' | 'harmful' | 'spam' | 'other';

interface ReportMessageSheetProps {
  visible: boolean;
  matchId: Id<'matches'> | null;
  onClose: () => void;
}

export function ReportMessageSheet({ visible, matchId, onClose }: ReportMessageSheetProps) {
  const { colors } = useTheme();
  const reportContent = useAction(api.feedback.reportContent);
  const unlinkPartner = useMutation(api.partners.unlinkPartner);

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const resetAndClose = () => {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
      successTimer.current = null;
    }
    setCategory(null);
    setNotes('');
    setErrorMessage(null);
    setShowSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!matchId || !category) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await reportContent({ matchId, category, notes: notes.trim() || undefined });
      trackEvent(Events.CONTENT_REPORTED, { category });
      setShowSuccess(true);
      successTimer.current = setTimeout(resetAndClose, 1800);
    } catch (err) {
      setErrorMessage('Could not send your report. Please try again.');
      Sentry.captureException(err, { tags: { flow: 'content_report' } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = () => {
    Alert.alert(
      'Unlink Partner',
      'Are you sure you want to unlink your partner? Your liked names will be kept, but matches between you will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkPartner();
              trackEvent(Events.PARTNER_UNLINKED);
              resetAndClose();
            } catch (error) {
              Sentry.captureException(error);
              Alert.alert('Error', 'Failed to unlink partner. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <AnimatedBottomSheet visible={visible} onClose={resetAndClose} maxHeight="70%">
      <View style={styles.content}>
        <View style={styles.handleBar} />

        {showSuccess ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
            <Text style={styles.successText}>Thanks &mdash; we&rsquo;ll review this.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Report Message</Text>
            <Text style={styles.subtitle}>
              Tell us what&rsquo;s wrong. Reports go to our team for review.
            </Text>

            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCategory(cat.key)}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: isSubmitting }}
                    accessibilityLabel={`Report category: ${cat.label}`}
                  >
                    <Ionicons name={cat.icon} size={16} color={isSelected ? '#fff' : '#6B5B7B'} />
                    <Text
                      style={[styles.categoryLabel, { color: isSelected ? '#fff' : '#6B5B7B' }]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              style={[
                styles.notesInput,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
              placeholder="Add context (optional)..."
              placeholderTextColor="#A89BB5"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={(t) => setNotes(t.slice(0, 2000))}
              textAlignVertical="top"
              editable={!isSubmitting}
              accessibilityLabel="Additional context for your report"
            />

            <Pressable
              style={[
                styles.reportButton,
                { backgroundColor: colors.primary },
                (!category || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!category || isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Submit report"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.reportButtonText}>Report</Text>
              )}
            </Pressable>

            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            <Pressable
              style={styles.unlinkButton}
              onPress={handleUnlink}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Unlink partner"
            >
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
              <Text style={styles.unlinkButtonText}>Unlink Partner</Text>
            </Pressable>
          </>
        )}
      </View>
    </AnimatedBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 4,
  },
  categoryLabel: {
    fontSize: 11,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    textAlign: 'center',
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
    minHeight: 90,
    marginBottom: 16,
  },
  reportButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  reportButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  unlinkButtonText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#ef4444',
  },
  successContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
});
