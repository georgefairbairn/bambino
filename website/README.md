# bambinobaby.xyz

Static marketing site for Bambino: App Store download link, privacy policy, terms of service, and contact email.

```bash
node website/build.mjs   # writes website/public
```

- `src/home.html` is the landing page body; `build.mjs` wraps it (and every page) in the shared header/footer.
- `/privacy/` and `/terms/` are rendered from `docs/privacy-policy.md` and `docs/terms-of-service.md`. Edit the markdown, then rebuild.
- `src/` assets (CSS, icons, video, screenshots) are copied to `public/` as-is.
- Fonts follow `Fonts` in `constants/theme.ts`: Alfa Slab One for the "bambino" wordmark only, Gabarito 800 for headings, the system font for body text.

## Media from the ads

`app-store-badge.svg` is Apple's badge, copied from `ads/public`. The phone tour plays the ads' App Store preview, rendered in its web cut (`web: true`): no caption, since the page sets its own text under the phone, and the full screen as the app draws it, with the full-height card and tab bar:

```bash
cd ads
npx remotion render src/index.ts AppPreview out/bambino-app-preview-web.mp4 --props='{"web":true}'
cd out
# 600px wide, silent, streamable, a keyframe every 10 frames so scroll seeks land instantly
ffmpeg -i bambino-app-preview-web.mp4 -an -vf scale=600:-2 -c:v libx264 -crf 27 -preset veryslow \
  -g 10 -keyint_min 10 -pix_fmt yuv420p -movflags +faststart ../../website/src/app-tour.mp4
ffmpeg -ss 0 -i bambino-app-preview-web.mp4 -frames:v 1 -vf scale=600:-2 -q:v 4 ../../website/src/app-tour-poster.jpg
```

Each tour step in `src/home.html` plays its own stretch of that video (`data-start`/`data-end`, in seconds). If the preview's timing changes, update those.
