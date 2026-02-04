import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { YearRangeSelector, YearRange } from './year-range-selector';

type Gender = 'male' | 'female' | 'neutral';

interface PopularityChartProps {
  name: string;
  gender: Gender;
}

const GENDER_COLORS: Record<Gender, { line: string; gradient: string }> = {
  male: { line: '#2563eb', gradient: 'rgba(37, 99, 235, 0.2)' },
  female: { line: '#db2777', gradient: 'rgba(219, 39, 119, 0.2)' },
  neutral: { line: '#9333ea', gradient: 'rgba(147, 51, 234, 0.2)' },
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
  const [yearRange, setYearRange] = useState<YearRange>('50');
  const [tooltipData, setTooltipData] = useState<{ year: number; rank: number } | null>(null);

  const startYear = getStartYear(yearRange);

  const popularityData = useQuery(api.popularity.getNamePopularity, {
    name,
    gender,
    startYear,
    endYear: END_YEAR,
  });

  const handleDataPointPress = useCallback(
    (item: { value: number; label?: string }, index: number) => {
      if (popularityData && popularityData[index]) {
        const data = popularityData[index];
        setTooltipData({ year: data.year, rank: data.rank });
      }
    },
    [popularityData],
  );

  // Don't render for neutral gender
  if (gender === 'neutral') {
    return null;
  }

  // Loading state
  if (popularityData === undefined) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6b7280" />
        </View>
      </View>
    );
  }

  // No data state
  if (popularityData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={32} color="#9ca3af" />
          <Text style={styles.emptyText}>No historical data available</Text>
        </View>
      </View>
    );
  }

  const colors = GENDER_COLORS[gender];

  // Find max rank for inverting (so rank 1 appears at top)
  const maxRank = Math.max(...popularityData.map((d) => d.rank));
  const minRank = Math.min(...popularityData.map((d) => d.rank));

  // Transform data - invert rank so lower rank appears higher
  // Create label for every few years
  const chartData = popularityData.map((d, index) => ({
    value: maxRank - d.rank + 1,
    label: index % Math.ceil(popularityData.length / 5) === 0 ? d.year.toString().slice(-2) : '',
    dataPointText: `#${d.rank}`,
  }));

  // Calculate spacing based on data length and available width
  const chartWidth = 280;
  const spacing = chartData.length > 1 ? chartWidth / (chartData.length - 1) : chartWidth;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Popularity Over Time</Text>

      <YearRangeSelector selected={yearRange} onSelect={setYearRange} />

      {tooltipData && (
        <View style={styles.tooltipContainer}>
          <Text style={styles.tooltipText}>
            {tooltipData.year}: #{tooltipData.rank}
          </Text>
        </View>
      )}

      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={CHART_HEIGHT}
          color={colors.line}
          thickness={2}
          curved
          areaChart
          startFillColor={colors.gradient}
          endFillColor="transparent"
          startOpacity={0.4}
          endOpacity={0}
          initialSpacing={10}
          endSpacing={10}
          spacing={spacing}
          hideDataPoints={popularityData.length > 30}
          dataPointsColor={colors.line}
          dataPointsRadius={3}
          onPress={handleDataPointPress}
          yAxisTextStyle={styles.axisLabel}
          xAxisLabelTextStyle={styles.axisLabel}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor="#e5e7eb"
          rulesColor="#f3f4f6"
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
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 12,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#9ca3af',
  },
  tooltipContainer: {
    alignItems: 'center',
  },
  tooltipText: {
    fontSize: 14,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#374151',
    fontWeight: '600',
  },
  axisLabel: {
    fontSize: 10,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
  },
});
