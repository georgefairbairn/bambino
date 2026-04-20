import { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { LinearGradient } from 'expo-linear-gradient';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { getPopularityTier } from '@/constants/popularity';
import { GenderBadge } from './gender-badge';
import { QuickActionButtons } from './quick-action-buttons';
import { RankBadge, PopularityChart } from '@/components/popularity';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

const GENDER_TOGGLE_CONFIG = {
  male: { emoji: '👦', activeBg: '#E3F0FF', text: '#7CB9E8', label: 'Boy' },
  female: { emoji: '👧', activeBg: '#FFE4EC', text: '#FF8FAB', label: 'Girl' },
} as const;

function GenderPillToggle({
  selected,
  onSelect,
}: {
  selected: 'male' | 'female';
  onSelect: (g: 'male' | 'female') => void;
}) {
  return (
    <View style={swipeStyles.genderToggle}>
      {(['male', 'female'] as const).map((g) => {
        const config = GENDER_TOGGLE_CONFIG[g];
        const isActive = selected === g;
        return (
          <Pressable
            key={g}
            style={[
              swipeStyles.genderPill,
              { backgroundColor: isActive ? config.activeBg : '#F0EDF3' },
              !isActive && { opacity: 0.5 },
            ]}
            onPress={() => onSelect(g)}
          >
            <Text style={swipeStyles.genderPillEmoji}>{config.emoji}</Text>
            <Text
              style={[
                swipeStyles.genderPillText,
                { color: isActive ? config.text : '#A89BB5' },
                isActive && { fontWeight: '700' },
              ]}
            >
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const TREND_CONFIG = {
  rising: { label: 'Rising', arrow: '↑', color: '#4ADE80' },
  falling: { label: 'Falling', arrow: '↓', color: '#FF6B6B' },
  steady: { label: 'Steady', arrow: '→', color: '#A89BB5' },
};

type Context = 'swipe' | 'liked' | 'rejected' | 'match';

interface NameDetailModalProps {
  visible: boolean;
  name: Doc<'names'> | null;
  context: Context;
  onClose: () => void;
  onLike?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
  onRestore?: () => void;
  onHide?: () => void;
}

function PopularityDetailContent({ name }: { name: Doc<'names'> }) {
  const { colors } = useTheme();
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>(
    name.primaryGender ?? 'male',
  );
  const displayGender: 'male' | 'female' =
    name.gender === 'neutral' ? selectedGender : (name.gender as 'male' | 'female');

  const rawPopularitySummary = useQuery(api.popularity.getNamePopularitySummary, {
    name: name.name,
    gender: displayGender,
  });

  // Cache last valid summary to prevent flash of empty state during gender transitions
  const cachedSummary = useRef(rawPopularitySummary);
  if (rawPopularitySummary !== undefined) {
    cachedSummary.current = rawPopularitySummary;
  }
  const popularitySummary = rawPopularitySummary ?? cachedSummary.current;

  const currentRank = popularitySummary?.currentRank ?? null;
  const tier = getPopularityTier(currentRank);
  const hasRank = currentRank != null;

  return (
    <>
      {name.gender === 'neutral' && (
        <GenderPillToggle selected={selectedGender} onSelect={setSelectedGender} />
      )}

      {/* Headline card */}
      <View style={[swipeStyles.headlineCard, { backgroundColor: colors.surfaceSubtle }]}>
        {/* Left: rank with context */}
        <View style={swipeStyles.rankSection}>
          <Text style={swipeStyles.rankSectionLabel}>RANK</Text>
          <Text style={swipeStyles.rankNumber}>{hasRank ? `#${currentRank}` : '—'}</Text>
        </View>

        {/* Divider */}
        <View style={swipeStyles.divider} />

        {/* Right: tier badge + description */}
        <View style={swipeStyles.tierSection}>
          <LinearGradient
            colors={tier.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={swipeStyles.tierBadge}
          >
            <Text style={swipeStyles.tierLabel}>{tier.label}</Text>
          </LinearGradient>
          {hasRank && popularitySummary?.totalRankedNames ? (
            <Text style={swipeStyles.tierDescription}>
              Ranked {currentRank}
              {ordinalSuffix(currentRank!)} out of{' '}
              {popularitySummary.totalRankedNames.toLocaleString()} names
            </Text>
          ) : null}
        </View>
      </View>

      {/* Stat tiles */}
      <View style={swipeStyles.statRow}>
        <View style={[swipeStyles.statTile, { backgroundColor: colors.surfaceSubtle }]}>
          <Text style={swipeStyles.statLabel}>PEAK YEAR</Text>
          {popularitySummary?.peakYear ? (
            <Text style={swipeStyles.statValue}>
              {popularitySummary.peakYear}{' '}
              <Text style={swipeStyles.statValueMuted}>(#{popularitySummary.peakRank})</Text>
            </Text>
          ) : (
            <Text style={swipeStyles.statValueEmpty}>—</Text>
          )}
        </View>
        <View style={[swipeStyles.statTile, { backgroundColor: colors.surfaceSubtle }]}>
          <Text style={swipeStyles.statLabel}>5 YEAR TREND</Text>
          {popularitySummary?.trend ? (
            <Text
              style={[
                swipeStyles.statValue,
                { color: TREND_CONFIG[popularitySummary.trend].color },
              ]}
            >
              {TREND_CONFIG[popularitySummary.trend].label}{' '}
              {TREND_CONFIG[popularitySummary.trend].arrow}
            </Text>
          ) : (
            <Text style={swipeStyles.statValueEmpty}>—</Text>
          )}
        </View>
      </View>

      {/* Popularity chart */}
      <PopularityChart name={name.name} gender={displayGender} />
    </>
  );
}

export function NameDetailModal({
  visible,
  name,
  context,
  onClose,
  onLike,
  onReject,
  onRemove,
  onRestore,
  onHide,
}: NameDetailModalProps) {
  const { colors } = useTheme();
  const [listSelectedGender, setListSelectedGender] = useState<'male' | 'female'>(
    name?.primaryGender ?? 'male',
  );
  const listDisplayGender: 'male' | 'female' =
    name?.gender === 'neutral' ? listSelectedGender : (name?.gender as 'male' | 'female');

  if (!name) return null;

  return (
    <AnimatedBottomSheet
      visible={visible}
      onClose={onClose}
      backgroundColor={colors.surface}
      style={{ paddingHorizontal: 24, paddingBottom: 40 }}
    >
      {/* Handle bar */}
      <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

      {/* Header with close button */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
          <Ionicons name="close" size={24} color="#6B5B7B" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {context === 'swipe' ? (
          <PopularityDetailContent name={name} />
        ) : (
          <>
            {/* Badges */}
            <View style={styles.badgeContainer}>
              <GenderBadge gender={name.gender as 'boy' | 'girl' | 'unisex'} size="large" />
              <RankBadge rank={name.currentRank} size="large" />
            </View>

            {/* Name */}
            <Text style={styles.name}>{name.name}</Text>

            {/* Info cards */}
            <View style={styles.infoCards}>
              {name.origin && (
                <View style={[styles.infoCard, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={styles.infoLabel}>Origin</Text>
                  <Text style={styles.infoValue}>{name.origin}</Text>
                </View>
              )}

              {name.meaning && (
                <View style={[styles.infoCard, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={styles.infoLabel}>Meaning</Text>
                  <Text style={styles.infoValue}>{name.meaning}</Text>
                </View>
              )}

              {name.phonetic && (
                <View style={[styles.infoCard, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={styles.infoLabel}>Pronunciation</Text>
                  <Text style={styles.infoValue}>{name.phonetic}</Text>
                </View>
              )}
            </View>

            {name.gender === 'neutral' && (
              <GenderPillToggle selected={listSelectedGender} onSelect={setListSelectedGender} />
            )}

            {/* Popularity chart */}
            <PopularityChart name={name.name} gender={listDisplayGender} />

            {/* Quick action buttons */}
            <QuickActionButtons
              context={context}
              nameName={name.name}
              onLike={onLike}
              onReject={onReject}
              onRemove={onRemove}
              onRestore={onRestore}
              onHide={onHide}
            />
          </>
        )}
      </ScrollView>
    </AnimatedBottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 0,
  },
  scrollContainer: {
    paddingBottom: 16,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerSpacer: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  name: {
    fontSize: 48,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoCards: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
    lineHeight: 24,
  },
});

const swipeStyles = StyleSheet.create({
  genderToggle: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  genderPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    gap: 5,
  },
  genderPillEmoji: {
    fontSize: 13,
  },
  genderPillText: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  headlineCard: {
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    marginBottom: 16,
  },
  rankSection: {
    alignItems: 'center',
    minWidth: 80,
  },
  rankSectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A89BB5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  rankNumber: {
    fontSize: 36,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    lineHeight: 40,
  },
  divider: {
    width: 1,
    alignSelf: 'center',
    height: 48,
    backgroundColor: '#E0D8E8',
  },
  tierSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: 2,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 11,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statTile: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A89BB5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D1B4E',
    marginTop: 3,
  },
  statValueMuted: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B5B7B',
  },
  statValueEmpty: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#A89BB5',
    marginTop: 3,
  },
});
