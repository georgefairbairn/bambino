import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { AD_FORMATS, COMPOSITION_IDS } from '../src/compositions';
import { HOOK_IDS } from '../src/timeline';

mkdirSync('out', { recursive: true });

// Every placement for every hook under test, e.g. out/bambino-reel-cant-agree.mp4.
for (const hook of HOOK_IDS) {
  for (const format of AD_FORMATS) {
    const out = `out/bambino-${format}-${hook}.mp4`;
    console.log(`Rendering ${COMPOSITION_IDS[format]} (${hook}) -> ${out}`);
    execFileSync(
      'npx',
      [
        'remotion',
        'render',
        'src/index.ts',
        COMPOSITION_IDS[format],
        out,
        '--codec=h264',
        `--props=${JSON.stringify({ format, hook })}`,
      ],
      { stdio: 'inherit' },
    );
  }
}

console.log(`\nAll ${HOOK_IDS.length * AD_FORMATS.length} ads rendered to ads/out/.`);
