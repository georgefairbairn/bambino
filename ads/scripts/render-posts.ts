import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { COMPOSITION_IDS } from '../src/compositions';
import { GRID, type PostSlide } from '../src/posts/data';

const OUT = 'out/posts';
const REEL_SOURCE = 'out/bambino-reel-looking.mp4';

mkdirSync(OUT, { recursive: true });

const still = (slide: PostSlide, out: string) => {
  const args =
    slide.kind === 'frame'
      ? [
          COMPOSITION_IDS.feed,
          out,
          `--frame=${slide.frame}`,
          `--props=${JSON.stringify({ format: 'feed', hook: slide.hook })}`,
        ]
      : slide.kind === 'brand'
        ? ['Post-Brand', out]
        : ['Post-List', out, `--props=${JSON.stringify({ list: slide.list })}`];
  execFileSync('npx', ['remotion', 'still', 'src/index.ts', ...args, '--log=error'], {
    stdio: 'inherit',
  });
};

// Numbered in posting order. Instagram shows the newest post top-left, so the
// grid's last tile goes up first.
GRID.slice()
  .reverse()
  .forEach((post, i) => {
    const prefix = `${OUT}/${String(i + 1).padStart(2, '0')}-${post.slug}`;
    if (post.slides === 'reel') {
      if (!existsSync(REEL_SOURCE)) {
        throw new Error(`${REEL_SOURCE} is missing. Run \`npm run render\` first.`);
      }
      copyFileSync(REEL_SOURCE, `${prefix}.mp4`);
      console.log(`${prefix}.mp4 (copied from ${REEL_SOURCE})`);
      return;
    }
    const carousel = post.slides.length > 1;
    post.slides.forEach((slide, j) => {
      const out = carousel ? `${prefix}-${j + 1}.png` : `${prefix}.png`;
      console.log(out);
      still(slide, out);
    });
  });

console.log(`\n${GRID.length} posts written to ads/${OUT}/, numbered in posting order.`);
