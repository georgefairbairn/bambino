import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { AD_FORMATS, COMPOSITION_IDS, PACES } from '../src/compositions';
import { HOOK_IDS } from '../src/timeline';

mkdirSync('out', { recursive: true });

// Meta recommends 1440x2560 for Reels, above the 1080x1920 minimum. The
// compositions are laid out at 1080 wide; rendering them at 4/3 draws every
// edge at the higher resolution, so Meta's own re-encode starts sharper.
const SCALE = 4 / 3;

// Every placement for every hook under test, at both paces, e.g.
// out/bambino-reel-cant-agree.mp4 and out/bambino-reel-cant-agree-15s.mp4.
for (const pace of PACES) {
  for (const hook of HOOK_IDS) {
    for (const format of AD_FORMATS) {
      const out = `out/bambino-${format}-${hook}${pace === 'short' ? '-15s' : ''}.mp4`;
      console.log(`Rendering ${COMPOSITION_IDS[format]} (${hook}, ${pace}) -> ${out}`);
      execFileSync(
        'npx',
        [
          'remotion',
          'render',
          'src/index.ts',
          COMPOSITION_IDS[format],
          out,
          '--codec=h264',
        `--scale=${SCALE}`,
          `--props=${JSON.stringify({ format, hook, pace })}`,
        ],
        { stdio: 'inherit' },
      );
    }
  }
}

console.log(
  `\nAll ${PACES.length * HOOK_IDS.length * AD_FORMATS.length} ads rendered to ads/out/.`,
);
