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

`app-store-badge.svg` is Apple's badge, copied from `ads/public`. The hero video and the three "How it works" screens come from the ads' App Store preview (`cd ads && npm run render:preview`):

```bash
cd ads/out
# hero video: 600px wide, silent, streamable
ffmpeg -i bambino-app-preview.mp4 -an -vf scale=600:-2 -c:v libx264 -crf 27 -preset veryslow \
  -pix_fmt yuv420p -movflags +faststart ../../website/src/app-preview.mp4
ffmpeg -ss 0 -i bambino-app-preview.mp4 -frames:v 1 -vf scale=600:-2 -q:v 4 ../../website/src/app-preview-poster.jpg
# step screens, cropped above the captions
for pair in swipe:2.4 partner:5.8 match:8.0; do
  ffmpeg -ss ${pair#*:} -i bambino-app-preview.mp4 -frames:v 1 -vf crop=886:1480:0:0,scale=480:-2 \
    -q:v 3 ../../website/src/screen-${pair%%:*}.jpg
done
```

`website/public` is committed so any static host can serve it with no build step. If the host runs a build instead, use `node website/build.mjs` as the build command and `website/public` as the output directory.
