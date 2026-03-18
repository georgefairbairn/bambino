import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { api } from '@/convex/_generated/api';
import { useActiveSearch } from '@/hooks/use-active-search';
import { GenderFilterSelector } from '@/components/search/gender-filter-selector';
import { OriginPicker } from '@/components/search/origin-picker';
import { Paywall } from '@/components/paywall';
import { Fonts } from '@/constants/theme';
import { GradientBackground } from '@/components/ui/gradient-background';
import { useTheme } from '@/contexts/theme-context';

type GenderFilter = 'boy' | 'girl' | 'both';

export default function NewSearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { setActiveSearch } = useActiveSearch();
  const createSearch = useMutation(api.searches.createSearch);

  const [name, setName] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('both');
  const [originFilter, setOriginFilter] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    Keyboard.dismiss();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createSearch({
        name: trimmedName,
        genderFilter,
        originFilter,
      });

      if (result && typeof result === 'object' && 'error' in result) {
        setShowPaywall(true);
        return;
      }

      await setActiveSearch(result);
      router.replace(`/(tabs)/explore/${result}`);
    } catch (err: unknown) {
      Sentry.captureException(err);
      setError('Failed to create search. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    router.back();
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
              {/* Header */}
              <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
                <Pressable style={styles.headerButton} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={24} color="#2D1B4E" />
                </Pressable>
                <Text style={styles.title}>New Search</Text>
                <Pressable
                  style={[
                    styles.doneButton,
                    { backgroundColor: colors.primary },
                    isSubmitting && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={styles.doneButtonText}>{isSubmitting ? 'Creating...' : 'Done'}</Text>
                </Pressable>
              </Animated.View>

              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Form */}
                <Animated.View
                  entering={FadeInUp.delay(100).duration(400).springify()}
                  style={styles.form}
                >
                  {/* Name input */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Search Name</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                        error && styles.inputError,
                      ]}
                      value={name}
                      onChangeText={(text) => {
                        setName(text);
                        setError(null);
                      }}
                      placeholder="e.g., Baby Boy Names"
                      placeholderTextColor="#A89BB5"
                      autoFocus
                      maxLength={50}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    {error && <Text style={styles.errorText}>{error}</Text>}
                  </View>

                  {/* Gender filter */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Show Names For</Text>
                    <GenderFilterSelector value={genderFilter} onChange={setGenderFilter} />
                  </View>

                  {/* Origin filter */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Name Origins</Text>
                    <OriginPicker value={originFilter} onChange={setOriginFilter} />
                  </View>
                </Animated.View>

                {/* Submit button */}
                <Animated.View
                  entering={FadeInUp.delay(250).duration(400).springify()}
                  style={styles.actions}
                >
                  <Pressable
                    style={[
                      styles.submitButton,
                      { backgroundColor: colors.primary },
                      isSubmitting && styles.buttonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.submitButtonText}>
                      {isSubmitting ? 'Creating...' : 'Create Search'}
                    </Text>
                  </Pressable>
                </Animated.View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        <Paywall
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          trigger="search_limit"
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#ffffff',
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 20,
    marginTop: 8,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
    letterSpacing: 0,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontFamily: Fonts?.sans,
  },
  actions: {
    marginTop: 24,
    marginBottom: 120,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
