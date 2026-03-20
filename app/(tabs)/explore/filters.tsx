import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { GenderFilterSelector } from '@/components/search/gender-filter-selector';
import { OriginPicker } from '@/components/search/origin-picker';
import { GradientBackground } from '@/components/ui/gradient-background';
import { GradientButton } from '@/components/ui/gradient-button';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

type GenderFilter = 'boy' | 'girl' | 'both';

export default function Filters() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useQuery(api.users.getCurrentUser);
  const updateFilters = useMutation(api.users.updateFilters);

  const [genderFilter, setGenderFilter] = useState<GenderFilter>('both');
  const [originFilter, setOriginFilter] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setGenderFilter((user.genderFilter as GenderFilter) ?? 'both');
      setOriginFilter(user.originFilter ?? []);
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateFilters({ genderFilter, originFilter });
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={[styles.backButton, { shadowColor: colors.secondary }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#2D1B4E" />
          </Pressable>
          <Text style={styles.title}>Filters</Text>
          <View style={styles.spacer} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Gender filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gender</Text>
            <GenderFilterSelector value={genderFilter} onChange={setGenderFilter} />
          </View>

          {/* Origin filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Origin</Text>
            <OriginPicker value={originFilter} onChange={setOriginFilter} />
          </View>
        </ScrollView>

        {/* Save button */}
        <View style={styles.footer}>
          <GradientButton
            title="Save Filters"
            onPress={handleSave}
            variant="primary"
            loading={isSaving}
            disabled={isSaving}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontFamily: Fonts?.display,
    fontSize: 20,
    color: '#2D1B4E',
  },
  spacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 28,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
