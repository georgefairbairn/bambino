export const TOTAL_RANKED_NAMES = 18000;

export interface PopularityTier {
  label: string;
  gradientColors: [string, string];
  percentileText: string;
}

const TIERS: { maxRank: number; label: string; gradientColors: [string, string] }[] = [
  { maxRank: 50, label: 'Extremely Popular', gradientColors: ['#34D399', '#059669'] },
  { maxRank: 200, label: 'Very Popular', gradientColors: ['#60A5FA', '#3B82F6'] },
  { maxRank: 500, label: 'Popular', gradientColors: ['#FBBF24', '#D97706'] },
  { maxRank: 1000, label: 'Uncommon', gradientColors: ['#C4A7E7', '#A78BFA'] },
  { maxRank: Infinity, label: 'Rare', gradientColors: ['#A89BB5', '#8B7BA5'] },
];

export function getPopularityTier(rank: number | null | undefined): PopularityTier {
  if (rank == null) {
    return {
      label: 'Unranked',
      gradientColors: ['#D4D4D8', '#A1A1AA'],
      percentileText: 'Not in the top baby names',
    };
  }

  const tier = TIERS.find((t) => rank <= t.maxRank)!;
  const pct = ((1 - rank / TOTAL_RANKED_NAMES) * 100).toFixed(1);

  return {
    label: tier.label,
    gradientColors: tier.gradientColors,
    percentileText: `More popular than ${pct}% of baby names`,
  };
}
