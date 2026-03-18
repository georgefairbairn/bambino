import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

type Gender = 'male' | 'female' | 'neutral';

interface SparklineChartProps {
  name: string;
  gender: Gender;
}

const GENDER_COLORS: Record<Gender, string> = {
  male: '#7CB9E8', // sky blue
  female: '#FF8FAB', // candy pink
  neutral: '#C4A7E7', // lavender
};

const CHART_WIDTH = 100;
const CHART_HEIGHT = 40;
const YEARS_TO_SHOW = 20;
const END_YEAR = 2023;
const START_YEAR = END_YEAR - YEARS_TO_SHOW + 1;

export function SparklineChart({ name, gender }: SparklineChartProps) {
  const { colors } = useTheme();
  const popularityData = useQuery(api.popularity.getNamePopularity, {
    name,
    gender,
    startYear: START_YEAR,
    endYear: END_YEAR,
  });

  // Don't render for neutral gender
  if (gender === 'neutral') {
    return null;
  }

  // Loading state
  if (popularityData === undefined) {
    return (
      <View style={styles.container}>
        <View style={[styles.skeleton, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  // No data state
  if (popularityData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No trend data</Text>
      </View>
    );
  }

  const lineColor = GENDER_COLORS[gender];

  // Find max rank for inverting (so rank 1 appears at top)
  const maxRank = Math.max(...popularityData.map((d) => d.rank));

  // Transform data - invert rank so lower rank appears higher
  const chartData = popularityData.map((d) => ({
    value: maxRank - d.rank + 1,
  }));

  return (
    <View style={styles.container}>
      <LineChart
        data={chartData}
        width={CHART_WIDTH - 16}
        height={CHART_HEIGHT - 8}
        hideDataPoints
        hideYAxisText
        hideAxesAndRules
        color={lineColor}
        thickness={2}
        curved
        areaChart={false}
        initialSpacing={0}
        endSpacing={0}
        spacing={(CHART_WIDTH - 16) / Math.max(chartData.length - 1, 1)}
        disableScroll
        adjustToWidth
        isAnimated={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: {
    width: CHART_WIDTH - 8,
    height: 2,
    borderRadius: 1,
  },
  noDataText: {
    fontSize: 10,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
});
