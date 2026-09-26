import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { AD_FORMATS, COMPOSITION_IDS, PACES } from '../src/compositions';
import { HOOK_IDS } from '../src/timeline';

mkdirSync('out', { recursive: true });

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
