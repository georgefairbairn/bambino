# Explore Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the swipe card with a gender badge, popularity data row, and long name font scaling; add a filter count badge to the explore header; tighten empty state copy.

**Architecture:** All changes are modifications to existing files — no new components or screens. A new Convex query (`getNamePopularitySummary`) provides sparkline + trend data to the card. The card fetches this query only when it's the top (visible) card to avoid unnecessary reads.

**Tech Stack:** React Native, react-native-reanimated, react-native-gifted-charts (LineChart), Convex (backend queries), Ionicons

---

## File Map

| File | Responsibility | Change type |
|------|---------------|-------------|
| `convex/popularity.ts` | Backend popularity queries | Add `getNamePopularitySummary` query |
| `components/swipe/swipe-card.tsx` | Swipe card UI | Add GenderBadge, popularity row, font scaling, reposition hint |
| `components/swipe/explore-header.tsx` | Explore page header | Add `activeFilterCount` prop + badge |
| `app/(tabs)/explore/index.tsx` | Explore page composition | Compute + pass `activeFilterCount` |
| `components/swipe/empty-state.tsx` | Empty queue state | Update copy strings |

---

### Task 1: Add `getNamePopularitySummary` Convex query

**Files:**
- Modify: `convex/popularity.ts`

This query powers the rank tile, sparkline, trend arrow, and peak year on the card. It returns a compact summary so the card doesn't fetch the full 20-year history.

- [ ] **Step 1: Add the query to `convex/popularity.ts`**

Add this query at the bottom of the file, after the existing `getPopularNamesForYear` query:

```ts
export const getNamePopularitySummary = query({
  args: {
    name: v.string(),
    gender: v.string(),
  },
  handler: async (ctx, args) => {
    // Map app gender to SSA gender format
    const ssaGender = args.gender === 'male' ? 'M' : args.gender === 'female' ? 'F' : null;

    if (!ssaGender) {
      return {
        currentRank: null,
        trend: null as 'rising' | 'falling' | 'steady' | null,
        peakYear: null as number | null,
        sparklinePoints: [] as number[],
      };
    }

    const records = await ctx.db
      .query('namePopularity')
      .withIndex('by_name_gender', (q) => q.eq('name', args.name).eq('gender', ssaGender))
      .collect();

    if (records.length === 0) {
      return {
        currentRank: null,
        trend: null as 'rising' | 'falling' | 'steady' | null,
        peakYear: null as number | null,
        sparklinePoints: [] as number[],
      };
    }

    // Sort by year ascending
    records.sort((a, b) => a.year - b.year);

    // Current rank: most recent year's rank
    const mostRecent = records[records.length - 1];
    const currentRank = mostRecent.rank;

    // Peak year: year with lowest (best) rank
    const peak = records.reduce((best, r) => (r.rank < best.rank ? r : best), records[0]);
    const peakYear = peak.year;

    // Trend: compare most recent rank to rank 5 years prior
    const fiveYearsAgo = records.find((r) => r.year === mostRecent.year - 5);
    let trend: 'rising' | 'falling' | 'steady' | null = null;
    if (fiveYearsAgo) {
      const diff = mostRecent.rank - fiveYearsAgo.rank;
      if (diff <= -10) trend = 'rising'; // rank number decreased = improved
      else if (diff >= 10) trend = 'falling'; // rank number increased = worsened
      else trend = 'steady';
    }

    // Sparkline: last 10 years of data, inverted so lower rank = higher point
    const last10 = records.filter((r) => r.year > mostRecent.year - 10);
    const maxRank = Math.max(...last10.map((r) => r.rank));
    const sparklinePoints = last10.map((r) => maxRank - r.rank + 1);

    return {
      currentRank,
      trend,
      peakYear,
      sparklinePoints,
    };
  },
});
```

- [ ] **Step 2: Verify Convex codegen picks up the new query**

Run: `npx convex dev` (should already be running)

Expected: The dev server re-syncs and `convex/_generated/api.d.ts` now includes `popularity.getNamePopularitySummary`. No errors.

- [ ] **Step 3: Commit**

```bash
git add convex/popularity.ts
git commit -m "feat(popularity): add getNamePopularitySummary query for card display"
```

---

### Task 2: Add gender badge and font scaling to swipe card

**Files:**
- Modify: `components/swipe/swipe-card.tsx`

This task adds the GenderBadge at the top of the card and implements dynamic font sizing for long names. The popularity row is added in the next task to keep changes focused.

- [ ] **Step 1: Add imports and gender map**

At the top of `components/swipe/swipe-card.tsx`, add the GenderBadge import after the existing imports:

```ts
import { GenderBadge } from '@/components/name-detail/gender-badge';
```

After the `UNDERLINE_COLORS` constant (line 49), add the gender map and font size helper:

```ts
const GENDER_MAP: Record<string, 'boy' | 'girl' | 'unisex'> = {
  male: 'boy',
  female: 'girl',
  neutral: 'unisex',
};

function getNameFontSize(name: string): number {
  const len = name.length;
  if (len <= 8) return 56;
  if (len <= 11) return 46;
  if (len <= 14) return 42;
  return 32;
}
```

- [ ] **Step 2: Add GenderBadge to the card content JSX**

Inside the `{/* Card content */}` Animated.View, add the GenderBadge as the **first** child element, before the name Text:

```tsx
{/* Gender badge */}
<View style={styles.genderBadgeRow}>
  <GenderBadge gender={GENDER_MAP[name.gender] ?? 'unisex'} size="large" />
</View>

{/* Name */}
<Text style={[styles.name, { fontSize: getNameFontSize(name.name) }]} onLayout={handleNameLayout}>
  {name.name}
</Text>
```

Note: The `name` style still has `fontSize: 56` in the stylesheet — the inline `fontSize` override takes precedence.

- [ ] **Step 3: Add the genderBadgeRow style**

Add to the `styles` StyleSheet at the bottom of the file:

```ts
genderBadgeRow: {
  marginBottom: 12,
},
```

- [ ] **Step 4: Verify visually**

Run: `npm start` and open on iOS simulator.

Expected: Each swipe card now shows a gender badge (👧 Girl / 👦 Boy / 👶 Unisex) at the top of the card above the name. Long names (9+ characters) display at smaller font sizes. All existing animations (underline, stagger entrance, swipe overlays) still work.

- [ ] **Step 5: Commit**

```bash
git add components/swipe/swipe-card.tsx
git commit -m "feat(card): add gender badge and dynamic font scaling"
```

---

### Task 3: Add popularity row to swipe card

**Files:**
- Modify: `components/swipe/swipe-card.tsx`

This task adds the popularity row (rank tile + sparkline or 3-tile fallback) at the bottom of the card, and repositions the swipe hint.

- [ ] **Step 1: Add imports for popularity data and chart**

Add these imports at the top of the file:

```ts
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LineChart } from 'react-native-gifted-charts';
```

- [ ] **Step 2: Add the popularity data query inside the component**

Inside the `SwipeCard` component function, after the `useTheme()` call (line 64), add:

```ts
// Fetch popularity summary only for the top (visible) card
const popularitySummary = useQuery(
  api.popularity.getNamePopularitySummary,
  isTop ? { name: name.name, gender: name.gender } : 'skip',
);
```

- [ ] **Step 3: Add stagger animation values for the popularity row**

After the existing `meaningTranslateY` shared value (line 189), add:

```ts
const popularityOpacity = useSharedValue(0);
const popularityTranslateY = useSharedValue(12);
```

In the existing `useEffect` that runs stagger animations (the one checking `isTop && nameWidth > 0`), add after the meaning animation lines:

```ts
// Stagger popularity row entrance
popularityOpacity.value = withDelay(550, withTiming(1, { duration: 350 }));
popularityTranslateY.value = withDelay(550, withSpring(0, { damping: 15, stiffness: 150 }));
```

Add the animated style after `meaningAnimatedStyle`:

```ts
const popularityAnimatedStyle = useAnimatedStyle(() => ({
  opacity: popularityOpacity.value,
  transform: [{ translateY: popularityTranslateY.value }],
}));
```

- [ ] **Step 4: Add the TREND_COLORS constant**

After the `GENDER_MAP` constant, add:

```ts
const TREND_CONFIG = {
  rising: { label: 'Rising', arrow: '↑', color: '#4ADE80' },
  falling: { label: 'Falling', arrow: '↓', color: '#FF6B6B' },
  steady: { label: 'Steady', arrow: '→', color: '#A89BB5' },
};
```

- [ ] **Step 5: Add the popularity row JSX**

After the meaning box conditional block and before the swipe hint block, add:

```tsx
{/* Popularity row — fills dead space at bottom */}
<Animated.View
  style={[
    styles.popularityRow,
    isTop && popularityAnimatedStyle,
  ]}
>
  {/* Rank tile */}
  <View style={[styles.statTile, { backgroundColor: colors.surfaceSubtle }]}>
    <Text style={styles.statLabel}>RANK</Text>
    {name.currentRank ? (
      <Text style={styles.statValueRank}>#{name.currentRank}</Text>
    ) : (
      <Text style={styles.statValueMuted}>Unranked</Text>
    )}
  </View>

  {name.meaning ? (
    // Two-tile layout: rank + sparkline
    <View style={[styles.sparklineTile, { backgroundColor: colors.surfaceSubtle }]}>
      <Text style={styles.statLabel}>10YR TREND</Text>
      <View style={styles.sparklineRow}>
        {popularitySummary && popularitySummary.sparklinePoints.length > 1 ? (
          <>
            <View style={styles.sparklineChart}>
              <LineChart
                data={popularitySummary.sparklinePoints.map((value) => ({ value }))}
                width={80}
                height={28}
                hideDataPoints
                hideYAxisText
                hideAxesAndRules
                color={underlineColor}
                thickness={2}
                curved
                initialSpacing={0}
                endSpacing={0}
                spacing={80 / Math.max(popularitySummary.sparklinePoints.length - 1, 1)}
                disableScroll
                adjustToWidth
                isAnimated={false}
              />
            </View>
            {popularitySummary.trend && (
              <Text style={[styles.trendArrow, { color: TREND_CONFIG[popularitySummary.trend].color }]}>
                {TREND_CONFIG[popularitySummary.trend].arrow}
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.noTrendText}>No trend data</Text>
        )}
      </View>
    </View>
  ) : (
    // Three-tile fallback: rank + trend + peak (no meaning box shown)
    <>
      <View style={[styles.statTile, { backgroundColor: colors.surfaceSubtle }]}>
        <Text style={styles.statLabel}>TREND</Text>
        {popularitySummary?.trend ? (
          <Text style={[styles.statValueTrend, { color: TREND_CONFIG[popularitySummary.trend].color }]}>
            {TREND_CONFIG[popularitySummary.trend].label}
          </Text>
        ) : (
          <Text style={styles.statValueMuted}>—</Text>
        )}
      </View>
      <View style={[styles.statTile, { backgroundColor: colors.surfaceSubtle }]}>
        <Text style={styles.statLabel}>PEAK</Text>
        {popularitySummary?.peakYear ? (
          <Text style={styles.statValuePeak}>{popularitySummary.peakYear}</Text>
        ) : (
          <Text style={styles.statValueMuted}>—</Text>
        )}
      </View>
    </>
  )}
</Animated.View>
```

- [ ] **Step 6: Reposition the swipe hint**

In the `styles` StyleSheet, change the `swipeHint` style from:

```ts
swipeHint: {
  position: 'absolute',
  bottom: 24,
  left: 0,
  right: 0,
  alignItems: 'center',
},
```

To:

```ts
swipeHint: {
  position: 'absolute',
  top: '45%',
  left: 0,
  right: 0,
  alignItems: 'center',
},
```

This centers the hint roughly in the middle of the card, above the popularity row.

- [ ] **Step 7: Add all new styles**

Add these to the `styles` StyleSheet:

```ts
popularityRow: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 'auto',
},
statTile: {
  flex: 1,
  borderRadius: 10,
  padding: 10,
  paddingHorizontal: 8,
  alignItems: 'center',
},
sparklineTile: {
  flex: 2,
  borderRadius: 10,
  padding: 10,
  paddingHorizontal: 12,
},
statLabel: {
  fontSize: 10,
  fontWeight: '700',
  color: '#A89BB5',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginBottom: 4,
},
statValueRank: {
  fontSize: 17,
  fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
  color: '#2D1B4E',
},
statValueMuted: {
  fontSize: 14,
  fontFamily: Fonts?.sans,
  fontWeight: '600',
  color: '#A89BB5',
},
statValueTrend: {
  fontSize: 14,
  fontFamily: Fonts?.sans,
  fontWeight: '700',
},
statValuePeak: {
  fontSize: 14,
  fontFamily: Fonts?.sans,
  fontWeight: '700',
  color: '#2D1B4E',
},
sparklineRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginTop: 2,
},
sparklineChart: {
  flex: 1,
  height: 28,
},
trendArrow: {
  fontSize: 16,
  fontWeight: '700',
},
noTrendText: {
  fontSize: 10,
  fontFamily: Fonts?.sans,
  color: '#A89BB5',
  marginTop: 2,
},
```

- [ ] **Step 8: Verify visually**

Run: Open the app on iOS simulator.

Expected: Each card now shows rank and sparkline/trend data at the bottom. Cards with meaning show 2 tiles (rank + sparkline). Cards without meaning show 3 tiles (rank + trend + peak). The swipe hint appears centered in the card (not overlapping the bottom tiles). Swiping still works correctly with overlays and animations.

- [ ] **Step 9: Commit**

```bash
git add components/swipe/swipe-card.tsx
git commit -m "feat(card): add popularity row with rank, sparkline, and trend data"
```

---

### Task 4: Add filter count badge to explore header

**Files:**
- Modify: `components/swipe/explore-header.tsx`
- Modify: `app/(tabs)/explore/index.tsx`

- [ ] **Step 1: Update ExploreHeader props and add badge**

In `components/swipe/explore-header.tsx`, update the interface:

```ts
interface ExploreHeaderProps {
  liked: number;
  activeFilterCount: number;
  onFilterPress: () => void;
}
```

Update the component function signature to destructure the new prop:

```ts
export function ExploreHeader({ liked, activeFilterCount, onFilterPress }: ExploreHeaderProps) {
```

Inside the filter Pressable, after the `<Text style={styles.filterLabel}>Filters</Text>` line, add the badge:

```tsx
{activeFilterCount > 0 && (
  <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
  </View>
)}
```

- [ ] **Step 2: Add badge styles**

Add to the `styles` StyleSheet in the same file:

```ts
filterBadge: {
  width: 18,
  height: 18,
  borderRadius: 9,
  alignItems: 'center',
  justifyContent: 'center',
},
filterBadgeText: {
  fontSize: 10,
  fontWeight: '700',
  color: '#fff',
},
```

- [ ] **Step 3: Compute and pass activeFilterCount from explore page**

In `app/(tabs)/explore/index.tsx`, add a `useMemo` for the filter count. After the existing `swipeQueueKey` useMemo, add:

```ts
const activeFilterCount = useMemo(() => {
  if (!user) return 0;
  let count = 0;
  if (user.genderFilter && user.genderFilter !== 'both') count += 1;
  if (user.originFilter) count += user.originFilter.length;
  return count;
}, [user]);
```

Update the `ExploreHeader` component call to pass the new prop:

```tsx
<ExploreHeader
  liked={stats?.liked ?? 0}
  activeFilterCount={activeFilterCount}
  onFilterPress={() => router.push('/(tabs)/explore/filters')}
/>
```

- [ ] **Step 4: Verify visually**

Expected: When no filters are active (gender=both, no origins), the Filters pill looks the same as before. When filters are active, a small themed-color circle with the count appears inside the pill.

- [ ] **Step 5: Commit**

```bash
git add components/swipe/explore-header.tsx app/\(tabs\)/explore/index.tsx
git commit -m "feat(header): add active filter count badge to Filters pill"
```

---

### Task 5: Update empty state copy

**Files:**
- Modify: `components/swipe/empty-state.tsx`

- [ ] **Step 1: Update the copy strings**

In `components/swipe/empty-state.tsx`, change the title text from:

```
You&apos;ve reviewed all names!
```

To:

```
All caught up!
```

Change the description text from:

```
Check your liked names or adjust filters to see more.
```

To:

```
Adjust your filters to discover more names.
```

- [ ] **Step 2: Verify visually**

Expected: When you swipe through all available names, the empty state shows "All caught up!" as the title and "Adjust your filters to discover more names." as the description. Icon, button, and animations are unchanged.

- [ ] **Step 3: Commit**

```bash
git add components/swipe/empty-state.tsx
git commit -m "feat(empty-state): tighten copy for explore empty state"
```
