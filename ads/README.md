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

All timing and geometry live in pure, unit-tested modules. The React layers
are thin renderers that read from them:

- `timeline.ts` — the nine beats and which headline each carries
- `choreography.ts` — which phone shows which card, in which pose, per frame
- `motion.ts` — the five phone poses, the card swipe, the word reveal
- `layout.ts` — per-format phone scale and headline treatment

That split is what makes the ad testable. `getPhoneState({frame: 315, side:
'left'})` proves the stillness beat is still without rendering anything.

Use Remotion Studio (`npm run dev`) to check a single beat. Rendering a whole
MP4 to look at one moment is slow; `npx remotion still ... --frame=N` is the
cheap version.
