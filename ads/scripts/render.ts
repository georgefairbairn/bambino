import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { AD_FORMATS, COMPOSITION_IDS } from '../src/compositions';

mkdirSync('out', { recursive: true });

for (const format of AD_FORMATS) {
  const out = `out/bambino-${format}.mp4`;
  console.log(`Rendering ${COMPOSITION_IDS[format]} -> ${out}`);
  execFileSync(
    'npx',
    ['remotion', 'render', 'src/index.ts', COMPOSITION_IDS[format], out, '--codec=h264'],
    { stdio: 'inherit' },
  );
}

console.log('\nAll three placements rendered to ads/out/.');
