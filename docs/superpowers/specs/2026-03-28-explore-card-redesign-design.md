# Explore Card Redesign — Design Spec

**Date:** 2026-03-28
**Direction:** Option A — Playful & Bold
**Scope:** SwipeCard content enrichment, ExploreHeader filter badge, EmptyState copy tightening

---

## 1. Problem

The current swipe card uses ~40% of its vertical space for content (name, underline, origin, meaning) and leaves the rest empty. Popularity rank — one of the most useful data points — is hidden behind the name detail modal. There's no gender indicator on the card itself, and the header doesn't communicate active filter state.

## 2. Design Direction

Enrich the card with gender context and popularity data while preserving the existing swipe gesture mechanics, animation system, and visual DNA (Alfa Slab One font, themed border, candy palette). No new screens, no action buttons, no structural changes to the explore page layout.

---

## 3. Card Changes (`components/swipe/swipe-card.tsx`)

### 3.1 Gender Badge (new)

Add the existing `GenderBadge` component (from `components/name-detail/gender-badge.tsx`) at the top of card content, above the name.

- **Size:** `large` variant (paddingHorizontal 16, paddingVertical 8, borderRadius 16, fontSize 20 emoji + 16 label)
- **Position:** First element in the content stack, below the 48px top padding
- **Animation:** Part of the existing stagger entrance — appears immediately (no delay), since it's the first element the eye hits
- **Gender mapping:** The `names` table stores gender as `male`/`female`/`neutral`. Map to GenderBadge's expected `boy`/`girl`/`unisex`:
  - `male` → `boy`
  - `female` → `girl`
  - `neutral` → `unisex`

### 3.2 Popularity Row (new)

A horizontal row of tiles pinned to the bottom of the card content area, filling the current dead space.

**Layout:** `flexDirection: 'row'`, `gap: 8`, positioned via `marginTop: 'auto'` to push to the bottom of the flex container.

**Two-tile layout (default — when meaning exists):**

| Tile | Content | Style |
|------|---------|-------|
| **Rank** (flex: 1) | `#N` or `Unranked` | Alfa Slab One for ranked value, system font for "Unranked". `surfaceSubtle` background, borderRadius 10, padding 10 8. Label: "RANK" in 10px uppercase `#A89BB5` with 0.8px letterSpacing. |
| **Sparkline** (flex: 2) | Mini trend chart + trend arrow | Renders a `LineChart` from `react-native-gifted-charts` (same library as existing `SparklineChart` component) using the `sparklinePoints` from the popularity summary query. Does NOT import `SparklineChart` directly since that component has its own `useQuery` and fixed 100x40 dimensions. `surfaceSubtle` background, borderRadius 10, padding 10 12. Label: "10YR TREND". Arrow: `↑` green (#4ADE80), `↓` red (#FF6B6B), `→` muted (#A89BB5). |

**Sparkline stroke color** follows gender: girl `#FF8FAB`, boy `#7CB9E8`, neutral `#C4A7E7` (same `UNDERLINE_COLORS` map already in the file, reused here).

**Three-tile fallback (when meaning is null):**

When `name.meaning` is null/empty, the meaning box is already hidden. The popularity row expands to 3 equal tiles:

| Tile | Content |
|------|---------|
| **Rank** | Same as above |
| **Trend** | Text: "Rising" (#4ADE80), "Falling" (#FF6B6B), or "Steady" (#A89BB5) |
| **Peak** | Year number (e.g., "2023") in 14px system font |

Trend direction is computed by comparing the most recent rank to the rank 5 years prior. Rising = rank decreased (improved), Falling = rank increased (worsened), Steady = within +/- 10 positions or insufficient data.

**Animation:** Part of the stagger sequence — fades in after meaning box (delay 550ms).

### 3.3 Long Name Font Scaling

The current fixed 56px can overflow for long names. Add stepped scaling:

| Character count | Font size |
|----------------|-----------|
| 1–8 | 56px (current) |
| 9–11 | 46px |
| 12–14 | 42px |
| 15+ | 32px |

Implemented as a simple helper function inside the component:

```ts
function getNameFontSize(name: string): number {
  const len = name.length;
  if (len <= 8) return 56;
  if (len <= 11) return 46;
  if (len <= 14) return 42;
  return 32;
}
```

### 3.4 Swipe Hint Repositioning

The current swipe hint is positioned at `bottom: 24` which will overlap with the new popularity row. Move it to be centered vertically in the card (position it relative to the card center rather than absolute bottom), or place it just above the popularity row with adequate spacing.

Recommended: Change from `bottom: 24` to a vertically-centered approach using `top: '50%'` with a negative marginTop to center.

---

## 4. Header Changes (`components/swipe/explore-header.tsx`)

### 4.1 Active Filter Count Badge

Add a small circular badge on the Filters pill showing how many filters are active.

**Count logic:**
- Gender filter: +1 if not `both` (i.e., `boy` or `girl`)
- Origin filter: +N where N = number of selected origins

**Display:**
- When count is 0: badge is hidden (current behavior, no visual change)
- When count > 0: small circle appears to the right of the "Filters" label text

**Badge styling:**
- `backgroundColor: colors.primary` (theme color)
- `color: #fff`
- `fontSize: 10`, `fontWeight: '700'`
- `width: 18`, `height: 18`, `borderRadius: 9`
- `alignItems: 'center'`, `justifyContent: 'center'`

**Props change:** `ExploreHeader` needs a new `activeFilterCount: number` prop. The parent (`explore/index.tsx`) computes this from `user.genderFilter` and `user.originFilter`.

---

## 5. Data Flow

### 5.1 Popularity Data for Card

The card currently receives a `Doc<'names'>` which includes `currentRank` (nullable number). This handles the Rank tile.

For the sparkline and trend data, two options:

**Option A (recommended): New Convex query for card popularity summary**

Add a lightweight query `getNamePopularitySummary` to `convex/popularity.ts` that returns:
```ts
{
  currentRank: number | null;
  trend: 'rising' | 'falling' | 'steady' | null;
  peakYear: number | null;
  sparklinePoints: number[];  // last 10 years of rank values, inverted for display
}
```

This avoids fetching full 20-year history for each card. The card stack calls this for the top 2 visible cards only (not the full queue).

**Data fetching location:** Inside `SwipeCard` component using `useQuery`. The query takes `name` and `gender` args. For non-top cards (`isTop === false`), skip the query to avoid unnecessary fetches.

**Option B (rejected): Embed all data in the names table**

Would require a migration to add `trend`, `peakYear`, and sparkline data to every name record. Over-engineers the schema for a display concern.

### 5.2 Gender Mapping

The `names` table uses `male`/`female`/`neutral`. The `GenderBadge` component expects `boy`/`girl`/`unisex`. Add a mapping constant:

```ts
const GENDER_MAP: Record<string, 'boy' | 'girl' | 'unisex'> = {
  male: 'boy',
  female: 'girl',
  neutral: 'unisex',
};
```

This already exists implicitly in several places — define it once and reuse.

---

## 6. Empty State (`components/swipe/empty-state.tsx`)

No structural changes. Tighten copy only:

- **Title:** "All caught up!" (currently "You've reviewed all names!")
- **Description:** "Adjust your filters to discover more names." (currently "Check your liked names or adjust filters to see more.")

Everything else (icon, button, animation) stays the same.

---

## 7. What Does NOT Change

- Swipe gesture mechanics and thresholds
- Card border (5px, theme primary, borderRadius 16)
- Animated underline reveal
- Origin pill + speak button row
- Meaning box styling and content
- Swipe overlay (like/dislike stamps)
- Card background color animation on swipe
- Tab bar, gradient background, page layout
- Card stack management (2 visible cards, optimistic updates)
- All 4 candy themes (popularity tiles use `surfaceSubtle`, sparkline colors are gender-based not theme-based)

---

## 8. Edge Cases

| Case | Behavior |
|------|----------|
| No currentRank | Show "Unranked" in rank tile |
| No popularity data at all | Show rank tile (Unranked) + sparkline tile with "No trend data" text |
| No meaning AND no popularity | Gender badge + name + origin + 3 tiles all showing fallback text |
| Neutral gender name | Sparkline renders with purple (#C4A7E7) stroke. GenderBadge shows 👶 Unisex. Popularity query uses gender as-is (will likely return no data since SSA only has M/F). |
| Very long name (15+ chars) | Font drops to 32px. Underline width still matches measured name width. |
| Card is not top (behind card) | Popularity query is skipped (no useQuery call). Gender badge and static content still render. |

---

## 9. Files Modified

| File | Change |
|------|--------|
| `components/swipe/swipe-card.tsx` | Add GenderBadge, popularity row, font scaling, reposition swipe hint |
| `components/swipe/explore-header.tsx` | Add `activeFilterCount` prop and badge |
| `components/swipe/empty-state.tsx` | Update copy strings |
| `app/(tabs)/explore/index.tsx` | Compute and pass `activeFilterCount` to header |
| `convex/popularity.ts` | Add `getNamePopularitySummary` query |

### New Files

None. All changes are modifications to existing files.
