import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as path from 'path';

const BATCH_SIZE = 100;
const FILE = path.join(__dirname, '../data/celebrity-names.json');

interface CelebEntry {
  name: string;
  note: string;
}

async function main() {
  const prod = process.argv.includes('--prod');
  const flag = prod ? '--prod ' : '';
  const raw: unknown = JSON.parse(readFileSync(FILE, 'utf-8'));
  if (!Array.isArray(raw)) {
    console.error('celebrity-names.json must be a JSON array.');
    process.exit(1);
  }
  const entries = (raw as CelebEntry[]).filter(
    (e) => e && typeof e.name === 'string' && typeof e.note === 'string',
  );

  console.log(`Applying ${entries.length} celebrity tags to ${prod ? 'PRODUCTION' : 'dev'}...`);
  let applied = 0;
  let noop = 0;
  const notFound: string[] = [];

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const tmp = join(tmpdir(), `bambino-celeb-${i}.json`);
    try {
      writeFileSync(tmp, JSON.stringify({ entries: batch }));
      const out = execSync(`npx convex run ${flag}names:applyCelebrityTags "$(cat ${tmp})"`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      const r = JSON.parse(out.trim());
      applied += r.applied;
      noop += r.noop;
      notFound.push(...r.notFound);
      console.log(`  Batch ${i / BATCH_SIZE + 1}: applied ${r.applied}, noop ${r.noop}, notFound ${r.notFound.length}`);
    } finally {
      try {
        unlinkSync(tmp);
      } catch {
        // ignore
      }
    }
  }
  console.log(`\nDone. applied ${applied}, noop ${noop}, notFound ${notFound.length}.`);
  if (notFound.length) console.log(`Not in DB: ${notFound.join(', ')}`);
}

main();
