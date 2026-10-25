#!/usr/bin/env node
/**
 * Builds the static bambinobaby.xyz site into website/public.
 *
 * The privacy policy and terms live in Notion, the same pages the App Store
 * listing and the app link to, so there is one copy of each. /privacy/ and
 * /terms/ redirect there, giving the site stable URLs of its own.
 *
 * Usage: node website/build.mjs
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_DIR = dirname(fileURLToPath(import.meta.url));
const SRC = join(SITE_DIR, 'src');
const OUT = join(SITE_DIR, 'public');

// Keep in sync with constants/links.ts.
const APP_STORE_ID = '6773164657';
const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
const EMAIL = 'hello@bambinobaby.xyz';
const DEVELOPER = 'George Fairbairn';
const SITE_URL = 'https://bambinobaby.xyz';

// Keep in sync with app/(auth)/sign-up.tsx and app/(tabs)/profile.tsx.
const PRIVACY_URL = 'https://bambino-baby.notion.site/325d3b58308281158ce6c6cbdd562734';
const TERMS_URL = 'https://bambino-baby.notion.site/325d3b58308281768597f8bd57581eb7';

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Apple's official badge artwork, shared with the ads (ads/public/app-store-badge.svg).
const APP_STORE_BADGE = `<a class="app-store-badge" href="${APP_STORE_URL}">
        <img src="/app-store-badge.svg" alt="Download on the App Store" width="180" height="60">
      </a>`;

function layout({ title, description, path, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="${DEVELOPER}">
  <meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}">
  <meta name="theme-color" content="#34d399">
  <link rel="canonical" href="${SITE_URL}${path}">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Bambino">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${SITE_URL}${path}">
  <meta property="og:image" content="${SITE_URL}/icon.png">
  <meta name="twitter:card" content="summary">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Gabarito:wght@700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="/"><img src="/icon.png" alt="" width="36" height="36">bambino</a>
    </div>
  </header>
  <main>
${body}
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <span>© ${new Date().getFullYear()} ${DEVELOPER}</span>
      <nav aria-label="Footer">
        <a href="${APP_STORE_URL}">App Store</a>
        <a href="${PRIVACY_URL}">Privacy Policy</a>
        <a href="${TERMS_URL}">Terms of Service</a>
        <a href="mailto:${EMAIL}">${EMAIL}</a>
      </nav>
    </div>
  </footer>
</body>
</html>
`;
}

function write(path, html) {
  const file = join(OUT, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  console.log(`  ${join('public', path, 'index.html')}`);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(SRC)) {
  if (!file.endsWith('.html')) copyFileSync(join(SRC, file), join(OUT, file));
}

const home = readFileSync(join(SRC, 'home.html'), 'utf8')
  .replaceAll('{{APP_STORE_BADGE}}', APP_STORE_BADGE)
  .replaceAll('{{EMAIL}}', EMAIL);

write(
  '',
  layout({
    title: 'Bambino: Baby names, together',
    description:
      'Swipe through baby names with your partner and see the ones you both love. Download Bambino on the App Store.',
    path: '/',
    body: home,
  }),
);

// bambinobaby.xyz/privacy and /terms forward to the Notion pages.
const redirect = (title, url) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} | Bambino</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${url}">
  <meta http-equiv="refresh" content="0; url=${url}">
</head>
<body>
  <p><a href="${url}">${escapeHtml(title)}</a></p>
</body>
</html>
`;

write('privacy', redirect('Privacy Policy', PRIVACY_URL));
write('terms', redirect('Terms of Service', TERMS_URL));

console.log('Built website/public');
