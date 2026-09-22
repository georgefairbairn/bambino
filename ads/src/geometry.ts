/**
 * Positions of tappable elements, in app points. Shared by the scene (which
 * places the tap indicators) and the screens (which lay out absolutely from the
 * same numbers), so a tap can never drift off the control it is meant to hit.
 * Derived from the app's own paddings in explore-header.tsx and filters.tsx.
 */
import { DEVICE_W, SAFE_AREA_TOP } from './device';

/** Explore header "Filters" pill: paddingHorizontal 16, row centred in 64pt. */
export const FILTERS_PILL = { x: 16, y: SAFE_AREA_TOP + 16, w: 86, h: 32 } as const;

const CONTENT_X = 20;
const CONTENT_W = DEVICE_W - CONTENT_X * 2;

/** app/(tabs)/explore/filters.tsx, laid out top to bottom. */
export const FILTERS = {
  contentX: CONTENT_X,
  contentW: CONTENT_W,
  header: { y: SAFE_AREA_TOP, h: 56 },
  counter: { y: SAFE_AREA_TOP + 64, h: 66 },
  /** Everything from here down sits in the ScrollView. */
  scrollTop: SAFE_AREA_TOP + 146,
  genderTitle: 16,
  genderBar: { y: 44, h: 48 },
  categoriesTitle: 120,
  allRow: { y: 152, h: 62 },
  firstRow: 226,
  rowH: 63,
  rowGap: 12,
  switchW: 51,
  switchH: 31,
  rowPadding: 16,
} as const;

/** CATEGORY_KEYS order from convex/categories.ts. */
export const CATEGORY_ROWS = ['Trending', 'Classic', 'Celebrity', 'Vintage', 'Unisex', 'Rare'];
export const CELEBRITY_INDEX = CATEGORY_ROWS.indexOf('Celebrity');

/** Y of a category row's top edge, inside the scroll content. */
export const categoryRowY = (index: number): number =>
  FILTERS.firstRow + index * (FILTERS.rowH + FILTERS.rowGap);

/** Centre of the switch in a row whose top edge is `rowY` (scroll-content space). */
export const switchCentre = (rowY: number, rowH: number): { x: number; y: number } => ({
  x: CONTENT_X + CONTENT_W - FILTERS.rowPadding - FILTERS.switchW / 2,
  y: rowY + rowH / 2,
});

/**
 * How far to scroll the filters list so the Celebrity row sits inside the
 * cropped phone. Zero on the Reel; the shorter formats crop harder.
 */
export const filtersScrollFor = (visiblePoints: number): number => {
  const celebrityBottom = FILTERS.scrollTop + categoryRowY(CELEBRITY_INDEX) + FILTERS.rowH;
  return Math.max(0, celebrityBottom + 28 - visiblePoints);
};

/**
 * The popularity bottom sheet (name-detail-modal.tsx, swipe context): handle,
 * close button, headline card, stat tiles, then the chart. Offsets are points
 * from the top of the sheet.
 */
export const SHEET = {
  top: 70,
  paddingX: 24,
  contentTop: 56,
  headlineCard: { y: 0, h: 84 },
  stats: { y: 100, h: 52 },
  chart: { y: 168 },
  /** From the chart container's top edge to the bottom of its year labels. */
  chartPlotBottom: 312,
} as const;

/** How far to scroll the sheet so the chart's year labels sit inside the crop. */
export const sheetScrollFor = (visiblePoints: number): number => {
  const labelsBottom = SHEET.top + SHEET.contentTop + SHEET.chart.y + SHEET.chartPlotBottom;
  return Math.max(0, labelsBottom + 16 - visiblePoints);
};

/**
 * Bottom of the celebration's name, in points from the phone's top edge:
 * bezel, card offset, content padding, banner, gap, then the 46pt name.
 * Each stacked phone must show at least this much for the payoff to read.
 */
export const CELEBRATION_NAME_BOTTOM = 12 + 122 + 44 + 50 + 20 + 55;
