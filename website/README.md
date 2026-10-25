# bambinobaby.xyz

Static marketing site for Bambino: App Store download link, privacy policy, terms of service, and contact email.

```bash
node website/build.mjs   # writes website/public
```

- `src/home.html` is the landing page body; `build.mjs` wraps it (and every page) in the shared header/footer.
- The privacy policy and terms are the Notion pages the App Store listing and the app link to. The footer links straight to them, and `/privacy/` and `/terms/` redirect there. If the Notion URLs change, update `build.mjs`, `app/(auth)/sign-up.tsx` and `app/(tabs)/profile.tsx`.
- `src/` assets (CSS, icons, video, screenshots) are copied to `public/` as-is.
- Fonts follow `Fonts` in `constants/theme.ts`: Alfa Slab One for the "bambino" wordmark only, Gabarito 800 for headings, the system font for body text.

## Media from the ads

`app-store-badge.svg` is Apple's badge, copied from `ads/public`. The phone tour plays the ads' App Store preview in its web cut (`web: true`): no caption, since the page sets its own text under the phone, and the full screen as the app draws it, with the full-height card and tab bar. Each partner's phone is rendered on its own (`phone`), so the partner's can sit beside yours for the steps marked `data-duo`:

```bash
cd ads
npx remotion render src/index.ts AppPreview out/web-mint.mp4 --props='{"web":true,"phone":"mint"}'
npx remotion render src/index.ts AppPreview out/web-blue.mp4 --props='{"web":true,"phone":"blue"}'
cd out
# 600px wide, silent, streamable, a keyframe every 10 frames so scroll seeks land instantly
ENC="-an -vf scale=600:-2 -c:v libx264 -crf 27 -preset veryslow -g 10 -keyint_min 10 -pix_fmt yuv420p -movflags +faststart"
ffmpeg -i web-mint.mp4 $ENC ../../website/src/app-tour.mp4
# the partner's phone only appears from 3s to 9s, so only that much is kept (data-offset="3")
ffmpeg -ss 3 -t 6 -i web-blue.mp4 $ENC ../../website/src/app-tour-partner.mp4
ffmpeg -ss 0 -i web-mint.mp4 -frames:v 1 -vf scale=600:-2 -q:v 4 ../../website/src/app-tour-poster.jpg
ffmpeg -ss 3.2 -i web-blue.mp4 -frames:v 1 -vf scale=600:-2 -q:v 4 ../../website/src/app-tour-partner-poster.jpg
```

Each tour step in `src/home.html` plays its own stretch of that video (`data-start`/`data-end`, in seconds). If the preview's timing changes, update those.
