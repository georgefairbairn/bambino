import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useActiveSearch } from '@/hooks/use-active-search';
import { GenderFilterSelector } from '@/components/search/gender-filter-selector';
import { OriginPicker } from '@/components/search/origin-picker';
import { Fonts } from '@/constants/theme';

type GenderFilter = 'boy' | 'girl' | 'both';

export default function EditSearchScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const searchId = id as Id<'searches'>;
  const { activeSearchId, setActiveSearch } = useActiveSearch();

  const searches = useQuery(api.searches.getUserSearches);
  const updateSearch = useMutation(api.searches.updateSearch);
  const deleteSearch = useMutation(api.searches.deleteSearch);

  const search = searches?.find((s) => s._id === searchId);

  const [name, setName] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('both');
  const [originFilter, setOriginFilter] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = search?.role === 'owner';

  // Populate form when search data loads
  useEffect(() => {
    if (search) {
      setName(search.name);
      setGenderFilter(search.genderFilter);
      setOriginFilter(search.originFilter ?? []);
    }
  }, [search]);

  const formatShareCode = (code: string) => {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  };

  const handleCopyCode = async () => {
    if (!search?.shareCode) return;
    await Clipboard.setStringAsync(search.shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareCode = async () => {
    if (!search?.shareCode) return;
    try {
      await Share.share({
        message: `Join my baby name search "${search.name}" on Bambino! Use code: ${search.shareCode}`,
      });
    } catch {
      // User cancelled or share failed
    }
  };

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
      await updateSearch({
        searchId,
        name: trimmedName,
        genderFilter,
        originFilter,
      });
      router.back();
    } catch (err) {
      console.error('Failed to update search:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Search',
      'Are you sure you want to delete this search? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ],
    );
  };

  const confirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteSearch({ searchId });

      // If deleted search was active, switch to first remaining search
      if (activeSearchId === searchId && searches && searches.length > 1) {
        const remainingSearch = searches.find((s) => s._id !== searchId);
        if (remainingSearch) {
          await setActiveSearch(remainingSearch._id);
        }
      }
      router.replace('/(tabs)/explore');
    } catch (err) {
      console.error('Failed to delete search:', err);
      setError('Failed to delete search. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    Keyboard.dismiss();
    router.back();
  };

  // Loading state
  if (searches === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </SafeAreaView>
    );
  }

  // Search not found
  if (!search) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="search-outline" size={64} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>Search Not Found</Text>
          <Text style={styles.emptyDescription}>
            This search may have been deleted or you don&apos;t have access.
          </Text>
          <Pressable style={styles.backButton} onPress={() => router.replace('/(tabs)/explore')}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back to Searches</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.inner}>
          {/* Header */}
          <Pressable style={styles.header} onPress={Keyboard.dismiss}>
            <Pressable style={styles.headerButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
            </Pressable>
            <Text style={styles.title}>Edit Search</Text>
            <Pressable
              style={[styles.doneButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.doneButtonText}>{isSubmitting ? 'Saving...' : 'Done'}</Text>
            </Pressable>
          </Pressable>

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

            {/* Share Code Section - only for owners */}
            {isOwner && search.shareCode && (
              <View style={styles.shareSection}>
                <Text style={styles.shareSectionTitle}>Invite Partner</Text>
                <Text style={styles.shareDescription}>
                  Share this code with your partner so they can join your search
                </Text>
                <View style={styles.shareCodeContainer}>
                  <Text style={styles.shareCode}>{formatShareCode(search.shareCode)}</Text>
                  <View style={styles.shareActions}>
                    <Pressable style={styles.shareButton} onPress={handleCopyCode}>
                      <Ionicons
                        name={copied ? 'checkmark' : 'copy-outline'}
                        size={20}
                        color="#0a7ea4"
                      />
                      <Text style={styles.shareButtonText}>{copied ? 'Copied!' : 'Copy'}</Text>
                    </Pressable>
                    <Pressable style={styles.shareButton} onPress={handleShareCode}>
                      <Ionicons name="share-outline" size={20} color="#0a7ea4" />
                      <Text style={styles.shareButtonText}>Share</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>

              {isOwner && (
                <Pressable
                  style={[styles.deleteButton, isSubmitting && styles.buttonDisabled]}
                  onPress={handleDelete}
                  disabled={isSubmitting}
                >
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  <Text style={styles.deleteButtonText}>Delete Search</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  shareSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  shareSectionTitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#4b5563',
    fontWeight: '600',
    marginBottom: 4,
  },
  shareDescription: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#9ca3af',
    marginBottom: 12,
  },
  shareCodeContainer: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  shareCode: {
    fontSize: 28,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    letterSpacing: 4,
  },
  shareActions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  actions: {
    marginTop: 24,
    marginBottom: 40,
    gap: 12,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#dc2626',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
