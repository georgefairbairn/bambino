# Multiplayer Onboarding Screen — Design Spec

## Overview

Replace the theme picker (screen 3) in the onboarding carousel with a new "multiplayer/partner connection" screen. This screen educates users about the partner matching feature — it does not link accounts or trigger upgrades. The theme picker moves to settings (already exists there as `ThemePickerSection`).

## Changes Summary

1. **Remove** `ThemePicker` from onboarding screen 3
2. **Add** new `MultiplayerIntro` component as screen 3
3. **Simplify** `onboarding-screens.tsx` — remove gradient crossfade logic (no longer needed without theme picker changing colors mid-onboarding)
4. **Keep** onboarding fixed to mint theme colors (already the case since mint is the default)

## Screen Layout

Top to bottom:
1. **Title**: "Join Your Partner" — Alfa Slab One, 20px, `#2D1B4E`
2. **PRO pill**: Gold gradient badge below title (`⭐ PRO`)
3. **Match animation**: Two mini cards that slide together, fade out, and reveal an "It's a Match!" banner
4. **Three-step explainer**: Numbered steps explaining the feature
5. **Bottom bar**: Pagination dots (3rd active) + "Get Started" button (shared with carousel)

## Match Animation

### Mini Cards (x2: "YOU" and "PARTNER")

- **Size**: ~96px wide
- **Style**: White background, `borderWidth: 4`, `borderColor: #34D399` (mint primary), `borderRadius: 16` — matches the real swipe card styling
- **Content**:
  - Label: "YOU" / "PARTNER" — 9px, `#A89BB5`, weight 700, letter-spacing 1
  - Name: "Luna" — Alfa Slab One, 18px, `#2D1B4E`
  - LIKE stamp: Heart icon + "LIKE" text, `borderWidth: 3`, `borderColor: #34C77B`, `borderRadius: 8`, `backgroundColor: rgba(255,255,255,0.95)` — matches swipe-demo.tsx stamp styling
- **Position**: Side by side, slightly tilted (-3° / +3°)

### Animation Sequence (~6s loop)

| Phase | Time | What happens |
|-------|------|-------------|
| Rest | 0–22% | Cards at starting position, tilted |
| Slide together | 22–38% | Cards straighten and slide toward center (~24px each) |
| Fade out | 38–42% | Cards fade to opacity 0 |
| Match reveal | 36–44% | Banner scales up from 0 to 1.06, then settles to 1 |
| Hold | 44–72% | Banner visible, cards hidden |
| Banner dismiss | 72–85% | Banner fades out, cards fade back in at starting position |
| Reset | 85–100% | Back to rest state |

### "It's a Match!" Banner

- **Background**: Warm yellow gradient (`#FFFBEB` → `#FEF3C7`)
- **Border**: 3px `#F59E0B` (amber)
- **Shadow**: `0 6px 24px rgba(245, 158, 11, 0.25)`
- **Border radius**: 14
- **Content**: 🎉 emoji (16px) + "It's a Match!" in Alfa Slab One, 14px, `#D97706` (amber)
- **Position**: Absolutely centered over the card area, z-index 10

## PRO Pill Badge

- **Background**: Linear gradient `#FEF3C7` → `#FFFBEB`
- **Border**: 1.5px `#FDE68A`
- **Border radius**: 20
- **Text**: "⭐ PRO" — 9px, weight 800, `#D97706`, letter-spacing 0.8
- **Position**: Centered below the title, 8px margin-top

## Three-Step Explainer

Each step has a numbered circle + title + description, separated by hairline dividers.

### Step number circles
- 20x20px, `borderRadius: 10`
- Background: `rgba(52, 211, 153, 0.15)` (mint tint)
- Text: 10px, weight 700, `#059669` (emerald)

### Step content

| # | Title | Description |
|---|-------|-------------|
| 1 | Swipe at your own pace | Each of you browses names and likes your favorites |
| 2 | Find common ground | Love the same name? It's added to your shared list |
| 3 | Pick the one | Review your matches together and choose your favorite |

### Step text styling
- **Title**: 13px, weight 700, `#2D1B4E`, line-height 1.3
- **Description**: 12px, weight 400, `#6B5B7B`, line-height 1.4, system sans font
- **Dividers**: 1px `rgba(45, 27, 78, 0.06)` between steps

## Files to Modify

| File | Change |
|------|--------|
| `components/onboarding/onboarding-screens.tsx` | Replace ThemePicker with MultiplayerIntro in SCREENS array. Remove gradient crossfade logic (prevGradient, fadeOut). |
| `components/onboarding/theme-picker.tsx` | Delete file (onboarding version no longer used) |
| `components/onboarding/multiplayer-intro.tsx` | **New file** — the multiplayer screen component |

## Animation Implementation

Use `react-native-reanimated`:
- Single `useSharedValue` progress (0→1) with `withRepeat` + `withTiming` over ~6000ms (same pattern as swipe-demo.tsx)
- `interpolate` progress into card translateX, rotation, opacity
- `interpolate` progress into banner scale and opacity
- All animation driven from one shared value for perfect sync

## What This Screen Does NOT Do

- No partner linking / account connection
- No upgrade CTA or paywall trigger
- No input fields or interactive elements beyond the shared "Next" / "Get Started" button
- Purely educational — shows how the feature works
