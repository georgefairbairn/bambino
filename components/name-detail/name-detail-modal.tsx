import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { LinearGradient } from 'expo-linear-gradient';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { getPopularityTier, TOTAL_RANKED_NAMES } from '@/constants/popularity';
import { GenderBadge } from './gender-badge';
import { QuickActionButtons } from './quick-action-buttons';
import { RankBadge, PopularityChart } from '@/components/popularity';

const TREND_CONFIG = {
  rising: { label: 'Rising', arrow: '↑', color: '#4ADE80' },
  falling: { label: 'Falling', arrow: '↓', color: '#FF6B6B' },
  steady: { label: 'Steady', arrow: '→', color: '#A89BB5' },
};

type Context = 'swipe' | 'liked' | 'rejected';

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

  const popularitySummary = useQuery(api.popularity.getNamePopularitySummary, {
    name: name.name,
    gender: name.gender,
  });

  const tier = getPopularityTier(name.currentRank);
  const hasRank = name.currentRank != null;

  return (
    <>
      {/* Headline card */}
      <View style={[swipeStyles.headlineCard, { backgroundColor: colors.surfaceSubtle }]}>
        {/* Left: rank with context */}
        <View style={swipeStyles.rankSection}>
          <Text style={swipeStyles.rankNumber}>{hasRank ? `#${name.currentRank}` : '—'}</Text>
          <Text style={swipeStyles.rankContext}>
            {hasRank ? `out of ${TOTAL_RANKED_NAMES.toLocaleString()}` : 'Unranked'}
          </Text>
        </View>

        {/* Divider */}
        <View style={swipeStyles.divider} />

        {/* Right: tier badge + percentile */}
        <View style={swipeStyles.tierSection}>
          <LinearGradient
            colors={tier.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={swipeStyles.tierBadge}
          >
            <Text style={swipeStyles.tierLabel}>{tier.label}</Text>
          </LinearGradient>
          <Text style={swipeStyles.percentileText}>{tier.percentileText}</Text>
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
          <Text style={swipeStyles.statLabel}>5YR TREND</Text>
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
      {name.gender !== 'neutral' && (
        <PopularityChart name={name.name} gender={name.gender as 'male' | 'female' | 'neutral'} />
      )}
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

  if (!name) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

          {/* Header with close button */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={10}>
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

                {/* Popularity chart */}
                {name.gender !== 'neutral' && (
                  <PopularityChart
                    name={name.name}
                    gender={name.gender as 'male' | 'female' | 'neutral'}
                  />
                )}

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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
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
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
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
  headlineCard: {
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  rankSection: {
    alignItems: 'center',
    minWidth: 80,
  },
  rankNumber: {
    fontSize: 36,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
    lineHeight: 40,
  },
  rankContext: {
    fontSize: 11,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
    fontWeight: '500',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: '#E0D8E8',
  },
  tierSection: {
    flex: 1,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 6,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  percentileText: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    lineHeight: 17,
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
