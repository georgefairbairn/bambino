import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { YearRangeSelector, YearRange } from './year-range-selector';

type Gender = 'male' | 'female' | 'neutral';

interface PopularityChartProps {
  name: string;
  gender: Gender;
}

const GENDER_COLORS: Record<Gender, { line: string; gradient: string }> = {
  male: { line: '#7CB9E8', gradient: 'rgba(124, 185, 232, 0.2)' },
  female: { line: '#FF8FAB', gradient: 'rgba(255, 143, 171, 0.2)' },
  neutral: { line: '#C4A7E7', gradient: 'rgba(196, 167, 231, 0.2)' },
};

const END_YEAR = 2023;
const CHART_HEIGHT = 180;

function getStartYear(range: YearRange): number | undefined {
  switch (range) {
    case '20':
      return END_YEAR - 19;
    case '50':
      return END_YEAR - 49;
    case 'all':
      return undefined;
  }
}

export function PopularityChart({ name, gender }: PopularityChartProps) {
  const { colors: themeColors } = useTheme();
  const [yearRange, setYearRange] = useState<YearRange>('50');
  const [tooltipData, setTooltipData] = useState<{ year: number; rank: number } | null>(null);
  const chartOpacity = useRef(new Animated.Value(1)).current;
  const isFirstLoad = useRef(true);
  const cachedData = useRef<{ year: number; rank: number; count: number }[]>([]);

  const startYear = getStartYear(yearRange);

  const popularityData = useQuery(api.popularity.getNamePopularity, {
    name,
    gender,
    startYear,
    endYear: END_YEAR,
  });

  // Cache the latest valid data so we can keep rendering during transitions
  if (popularityData !== undefined && popularityData.length > 0) {
    cachedData.current = popularityData;
  }

  // Fade out when range changes, fade in when data arrives
  useEffect(() => {
    if (popularityData === undefined && !isFirstLoad.current) {
      // Data is loading after a range change — fade out
      Animated.timing(chartOpacity, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else if (popularityData !== undefined) {
      // Data arrived — fade in
      isFirstLoad.current = false;
      Animated.timing(chartOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [popularityData, chartOpacity]);

  // Clear tooltip when range changes
  useEffect(() => {
    setTooltipData(null);
  }, [yearRange]);

  const handleDataPointPress = useCallback(
    (item: { value: number; label?: string }, index: number) => {
      const activeData = popularityData ?? cachedData.current;
      if (activeData && activeData[index]) {
        const d = activeData[index];
        setTooltipData({ year: d.year, rank: d.rank });
      }
    },
    [popularityData],
  );

  // Don't render for neutral gender
  if (gender === 'neutral') {
    return null;
  }

  // Initial loading state (no data yet at all)
  if (popularityData === undefined && isFirstLoad.current) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.surfaceSubtle }]}>
        <Text style={styles.title}>Popularity Over Time</Text>
        <YearRangeSelector selected={yearRange} onSelect={setYearRange} />
        <View style={styles.chartArea}>
          <LoadingIndicator size="small" />
        </View>
      </View>
    );
  }

  // No data state
  if (popularityData !== undefined && popularityData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.surfaceSubtle }]}>
        <Text style={styles.title}>Popularity Over Time</Text>
        <YearRangeSelector selected={yearRange} onSelect={setYearRange} />
        <View style={styles.chartArea}>
          <Ionicons name="analytics-outline" size={32} color="#A89BB5" />
          <Text style={styles.emptyText}>No historical data available</Text>
        </View>
      </View>
    );
  }

  // Use current data, fall back to cached data during transitions
  const rawData = (popularityData && popularityData.length > 0) ? popularityData : cachedData.current;
  if (rawData.length === 0) return null;

  // Downsample large datasets (All Time) to ~50 points for readable labels
  const MAX_POINTS = 50;
  const step = Math.ceil(rawData.length / MAX_POINTS);
  const data = rawData.length > MAX_POINTS
    ? rawData.filter((_, i) => i % step === 0 || i === rawData.length - 1)
    : rawData;

  // Find max rank for inverting (so rank 1 appears at top)
  const maxRank = Math.max(...data.map((d) => d.rank));
  const minRank = Math.min(...data.map((d) => d.rank));

  // Transform data - invert rank so lower rank appears higher
  // Show ~4-5 year labels at even intervals with full 4-digit years
  const labelCount = Math.min(5, data.length);
  const labelInterval = Math.max(1, Math.floor((data.length - 1) / (labelCount - 1)));
  const chartData = data.map((d, index) => ({
    value: maxRank - d.rank + 1,
    label: index % labelInterval === 0 || index === data.length - 1
      ? String(d.year)
      : '',
  }));

  // Calculate spacing based on data length and available width
  const chartWidth = 280;
  const spacing = chartData.length > 1 ? chartWidth / (chartData.length - 1) : chartWidth;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surfaceSubtle }]}>
      <Text style={styles.title}>Popularity Over Time</Text>

      <YearRangeSelector selected={yearRange} onSelect={setYearRange} />

      {/* Fixed-height tooltip area to prevent layout shift */}
      <View style={styles.tooltipContainer}>
        {tooltipData ? (
          <Text style={styles.tooltipText}>
            {tooltipData.year}: #{tooltipData.rank}
          </Text>
        ) : (
          <Text style={styles.tooltipPlaceholder}> </Text>
        )}
      </View>

      <Animated.View style={[styles.chartArea, { opacity: chartOpacity }]}>
        <View style={styles.chartRow}>
          {/* Y-axis label */}
          <View style={styles.yAxisLabelContainer}>
            <Text style={[styles.axisTitle, styles.yAxisLabel]}>Rank</Text>
          </View>
          <View style={styles.chartWrapper}>
            <LineChart
            data={chartData}
            width={chartWidth}
            height={CHART_HEIGHT}
            color={GENDER_COLORS[gender].line}
            thickness={2}
            curved
            areaChart
            startFillColor={GENDER_COLORS[gender].gradient}
            endFillColor="transparent"
            startOpacity={0.4}
            endOpacity={0}
            initialSpacing={10}
            endSpacing={10}
            spacing={spacing}
            hideDataPoints
            onPress={handleDataPointPress}
            yAxisTextStyle={styles.axisLabel}
            xAxisLabelTextStyle={styles.axisLabel}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={themeColors.border}
            labelsExtraHeight={20}
            rulesColor={themeColors.surfaceSubtle}
            rulesType="dashed"
            noOfSections={4}
            maxValue={maxRank - minRank + 1}
            formatYLabel={(value: string) => {
              const numValue = parseFloat(value);
              const rank = maxRank - numValue + 1;
              return `#${Math.round(rank)}`;
            }}
            disableScroll
            isAnimated={false}
          />
          </View>
        </View>
        {/* X-axis label */}
        <Text style={styles.axisTitle}>Year</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A89BB5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  chartArea: {
    height: CHART_HEIGHT + 70,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisLabelContainer: {
    width: 16,
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yAxisLabel: {
    transform: [{ rotate: '-90deg' }],
    width: 50,
  },
  chartWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
  tooltipContainer: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
  },
  tooltipText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
    fontWeight: '600',
  },
  tooltipPlaceholder: {
    fontSize: 14,
  },
  axisLabel: {
    fontSize: 10,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  axisTitle: {
    fontSize: 10,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
