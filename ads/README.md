# bambino-ads

Remotion compositions for paid social. **Not part of the app build.** This
directory has its own `package.json` and lockfile and is excluded from the
app's install, type-check and lint.

    cd ads
    npm install
    npm run dev       # Remotion Studio
    npm test          # unit tests for timing and geometry
    npm run render    # renders all three formats to out/

Design spec: `docs/superpowers/specs/2026-09-19-instagram-ad-video-design.md`
(gitignored, local only).

Theme values in `src/theme.ts` are **copied** from `constants/theme.ts`, not
imported, because that module imports `react-native`. If the app's palette
changes, update the copy by hand.

## Output

`npm run render` writes three files to `out/`, which is gitignored:

| File | Size | Placement |
|---|---|---|
| `bambino-reel.mp4` | 1080x1920 | Reels and Stories (primary) |
| `bambino-feed.mp4` | 1080x1350 | Feed |
| `bambino-square.mp4` | 1080x1080 | Feed, square |

All three are silent by design. Instagram's in-app music library is not
licensed for paid ads, so any track has to come from a commercial library.

## How it is put together

A 20-second feature tour: hook, swipe, match, filters, popularity, end card.
Screens are laid out in iPhone points (393×852) using the app's own numbers,
then scaled, so the card, filters sheet and chart are the app's rather than
approximations of it.

All timing and geometry live in pure, unit-tested modules. The React layers
only draw what they return:

- `timeline.ts` — the beats, and which headline each carries
- `scene.ts` — what every phone shows on every frame: position, scale, card,
  swipe offset, taps, filter state, chart progress
- `card-visuals.ts` — the swipe, copied range for range from
  `components/swipe/swipe-card.tsx` and `hooks/use-card-animation.ts`
- `geometry.ts` — positions of tappable controls, shared by the scene and the
  screens so a tap can't drift off its switch
- `layout.ts` — per-format phone scale, slots and headline size

That split is what makes a video testable. `getScene(315, layout)` proves both
phones hold Esme at rest through the stillness without rendering a frame.

Fonts are verified against the source: Poppins 600 for headlines (the App Store
screenshots), Gabarito 800 for names (`Fonts.title`), Alfa Slab One for the
wordmark (`Fonts.display`), and the system font for body text.

Use Remotion Studio (`npm run dev`) to check a single beat. Rendering a whole
MP4 to look at one moment is slow; `npx remotion still ... --frame=N` is the
cheap version.
