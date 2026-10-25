#!/usr/bin/env node
/**
 * Builds the static bambinobaby.xyz site into website/public.
 *
 * The privacy policy and terms are rendered from docs/*.md so the repo keeps a
 * single source of truth for legal copy. No dependencies: the markdown in those
 * files only uses headings, paragraphs, bullet lists, bold, links and bare
 * URLs/emails, which is all the tiny renderer below handles.
 *
 * Usage: node website/build.mjs
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SITE_DIR, '..');
const SRC = join(SITE_DIR, 'src');
const OUT = join(SITE_DIR, 'public');

// Keep in sync with constants/links.ts.
const APP_STORE_ID = '6773164657';
const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
const EMAIL = 'hello@bambinobaby.xyz';
const SITE_URL = 'https://bambinobaby.xyz';

// The docs link to the old Notion-hosted policy; on the site, point at our own page.
const LINK_REWRITES = {
  'https://bambino-baby.notion.site/325d3b58308281158ce6c6cbdd562734': '/privacy/',
};

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderInline(text) {
  const links = [];
  const stash = (html) => `\u0000${links.push(html) - 1}\u0000`;
  const href = (url) => LINK_REWRITES[url] ?? url;

  let out = text
    // [label](url)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) =>
      stash(`<a href="${escapeHtml(href(url))}">${escapeHtml(label)}</a>`),
    )
    // bare URLs (trailing punctuation stays outside the link)
    .replace(/https?:\/\/[^\s<]+[^\s<.,;:)]/g, (url) =>
      stash(
        `<a href="${escapeHtml(href(url))}">${escapeHtml(href(url) === url ? url : SITE_URL + href(url))}</a>`,
      ),
    )
    // emails
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]*\w/g, (email) =>
      stash(`<a href="mailto:${email}">${email}</a>`),
    );

  out = escapeHtml(out).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)]);
}

function renderMarkdown(md) {
  const html = [];
  let paragraph = [];
  let list = null;

  const flush = () => {
    if (paragraph.length) html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    if (list)
      html.push(`<ul>\n${list.map((li) => `  <li>${renderInline(li)}</li>`).join('\n')}\n</ul>`);
    paragraph = [];
    list = null;
  };

  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);

    if (!line.trim()) {
      flush();
    } else if (heading) {
      flush();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
    } else if (bullet) {
      if (paragraph.length) flush();
      (list ??= []).push(bullet[1]);
    } else if (list && /^\s+/.test(raw)) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else {
      if (list) flush();
      paragraph.push(line.trim());
    }
  }
  flush();
  return html.join('\n');
}

const APPLE_LOGO =
  '<svg viewBox="0 0 384 512" aria-hidden="true"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>';

const APP_STORE_BADGE = `<a class="app-store-badge" href="${APP_STORE_URL}" aria-label="Download Bambino on the App Store">
        ${APPLE_LOGO}
        <span><small>Download on the</small><strong>App Store</strong></span>
      </a>`;

function layout({ title, description, path, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
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
  <link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Gabarito:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="/"><img src="/icon.png" alt="" width="36" height="36">bambino</a>
      <nav class="site-nav" aria-label="Main">
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms</a>
        <a href="/#contact">Contact</a>
      </nav>
    </div>
  </header>
  <main>
${body}
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <span>© ${new Date().getFullYear()} Bambino</span>
      <nav aria-label="Footer">
        <a href="${APP_STORE_URL}">App Store</a>
        <a href="/privacy/">Privacy Policy</a>
        <a href="/terms/">Terms of Service</a>
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

const legalPages = [
  {
    path: 'privacy',
    doc: 'privacy-policy.md',
    title: 'Privacy Policy',
    description: 'How Bambino collects, uses and protects your data.',
  },
  {
    path: 'terms',
    doc: 'terms-of-service.md',
    title: 'Terms of Service',
    description: 'The terms that govern your use of the Bambino app.',
  },
];

for (const page of legalPages) {
  const md = readFileSync(join(ROOT, 'docs', page.doc), 'utf8');
  write(
    page.path,
    layout({
      title: `${page.title} | Bambino`,
      description: page.description,
      path: `/${page.path}/`,
      body: `<article class="wrap legal">\n${renderMarkdown(md)}\n</article>`,
    }),
  );
}

console.log('Built website/public');
