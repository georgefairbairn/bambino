import { useCallback, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { GradientButton } from '@/components/ui/gradient-button';

const CATEGORIES = [
  { key: 'bug' as const, label: 'Bug Report', icon: 'bug-outline' as const },
  { key: 'feature' as const, label: 'Feature Request', icon: 'bulb-outline' as const },
  { key: 'general' as const, label: 'General Feedback', icon: 'chatbubbles-outline' as const },
];

const PLACEHOLDERS: Record<string, string> = {
  bug: 'What went wrong?',
  feature: 'What would you like to see?',
  general: 'Tell us what you think...',
};

type Category = 'bug' | 'feature' | 'general';

export function FeedbackSection() {
  const { colors } = useTheme();
  const submitFeedback = useAction(api.feedback.submitFeedback);

  const [isExpanded, setIsExpanded] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => setIsExpanded(false);
    }, []),
  );

  const handleSubmit = useCallback(async () => {
    if (!category || !message.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await submitFeedback({ category, message: message.trim() });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsExpanded(false);
        setCategory(null);
        setMessage('');
      }, 2000);
    } catch {
      setErrorMessage('Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [category, message, submitFeedback]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.headerRow} onPress={() => setIsExpanded(!isExpanded)}>
        <Ionicons name="chatbubble-outline" size={22} color="#6B5B7B" style={{ marginRight: 12 }} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Share Feedback</Text>
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={22} color="#A89BB5" />
      </Pressable>

      {isExpanded && (
        <View style={styles.expandedContent}>
          {showSuccess ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
              <Text style={styles.successText}>Thanks for your feedback!</Text>
            </View>
          ) : (
            <>
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
                    >
                      <Ionicons
                        name={cat.icon}
                        size={16}
                        color={isSelected ? '#ffffff' : '#6B5B7B'}
                      />
                      <Text
                        style={[
                          styles.categoryLabel,
                          { color: isSelected ? '#ffffff' : '#6B5B7B' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    opacity: category ? 1 : 0.4,
                  },
                ]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={category !== null && !isSubmitting}
                placeholder={category ? PLACEHOLDERS[category] : 'Select a category first...'}
                placeholderTextColor="#A89BB5"
                value={message}
                onChangeText={setMessage}
              />

              {category && (
                <GradientButton
                  title="Submit Feedback"
                  onPress={handleSubmit}
                  variant="primary"
                  loading={isSubmitting}
                  disabled={isSubmitting || message.trim().length === 0}
                />
              )}

              {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  expandedContent: {
    marginTop: 16,
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
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  categoryLabel: {
    fontSize: 11,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    textAlign: 'center',
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
    minHeight: 100,
    marginBottom: 12,
  },
  successContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
  },
});
