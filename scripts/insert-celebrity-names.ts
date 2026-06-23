import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

const BATCH_SIZE = 50;
const FILE = path.join(__dirname, '../data/celebrity-additions.json');

interface Addition {
  name: string;
  gender: 'male' | 'female' | 'neutral';
  origin: string;
  meaning: string;
  phonetic: string;
}

async function main() {
  const prod = process.argv.includes('--prod');
  if (!existsSync(FILE)) {
    console.error(`${FILE} not found.`);
    process.exit(1);
  }
  const raw: unknown = JSON.parse(readFileSync(FILE, 'utf-8'));
  if (!Array.isArray(raw)) {
    console.error('celebrity-additions.json must be a JSON array.');
    process.exit(1);
  }
  const entries = raw as Addition[];

  console.log(`Inserting ${entries.length} celebrity names into ${prod ? 'PRODUCTION' : 'dev'}...`);
  let inserted = 0;
  let existed = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const runArgs = ['convex', 'run'];
    if (prod) runArgs.push('--prod');
    runArgs.push('names:insertCelebrityNames', JSON.stringify({ entries: batch }));
    const out = execFileSync('npx', runArgs, { encoding: 'utf-8', cwd: process.cwd() });
    const r = JSON.parse(out.trim());
    inserted += r.inserted;
    existed += r.existed;
    console.log(`  Batch ${i / BATCH_SIZE + 1}: inserted ${r.inserted}, already existed ${r.existed}`);
  }

  console.log(`\nDone. inserted ${inserted}, already existed ${existed}.`);
  console.log('Next: run celebrity:apply, then populate:origin-stats and rebuild:category-stats.');
}

main();
