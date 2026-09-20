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
