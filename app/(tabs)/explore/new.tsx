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
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { useActiveSearch } from '@/hooks/use-active-search';
import { GenderFilterSelector } from '@/components/search/gender-filter-selector';
import { OriginPicker } from '@/components/search/origin-picker';
import { Fonts } from '@/constants/theme';

type GenderFilter = 'boy' | 'girl' | 'both';

export default function NewSearchScreen() {
  const router = useRouter();
  const { setActiveSearch } = useActiveSearch();
  const createSearch = useMutation(api.searches.createSearch);

  const [name, setName] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('both');
  const [originFilter, setOriginFilter] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const newSearchId = await createSearch({
        name: trimmedName,
        genderFilter,
        originFilter,
      });
      await setActiveSearch(newSearchId);
      router.replace(`/(tabs)/explore/${newSearchId}`);
    } catch (err) {
      console.error('Failed to create search:', err);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable style={styles.headerButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
              </Pressable>
              <Text style={styles.title}>New Search</Text>
              <Pressable
                style={[styles.doneButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.doneButtonText}>{isSubmitting ? 'Creating...' : 'Done'}</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Form */}
              <View style={styles.form}>
                {/* Name input */}
                <View style={styles.field}>
                  <Text style={styles.label}>Search Name</Text>
                  <TextInput
                    style={[styles.input, error && styles.inputError]}
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setError(null);
                    }}
                    placeholder="e.g., Baby Boy Names"
                    placeholderTextColor="#9ca3af"
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
              </View>

              {/* Submit button */}
              <View style={styles.actions}>
                <Pressable
                  style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Creating...' : 'Create Search'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C6E7F5',
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
    color: '#1a1a1a',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0a7ea4',
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
    color: '#4b5563',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#1a1a1a',
    letterSpacing: 0,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontFamily: Fonts?.sans,
  },
  actions: {
    marginTop: 24,
    marginBottom: 40,
  },
  submitButton: {
    backgroundColor: '#0a7ea4',
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
