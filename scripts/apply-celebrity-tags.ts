import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

const BATCH_SIZE = 100;
const FILE = path.join(__dirname, '../data/celebrity-names.json');

interface CelebEntry {
  name: string;
  note: string;
}

async function main() {
  const prod = process.argv.includes('--prod');
  if (!existsSync(FILE)) {
    console.error(`${FILE} not found. Run "npm run celebrity:generate" first.`);
    process.exit(1);
  }
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
    // Pass the JSON payload as a single argv element via execFileSync (no shell).
    // Celebrity notes are free text and routinely contain apostrophes, quotes, or
    // other shell metacharacters (e.g. "Beyoncé's daughter") — interpolating them
    // into a shell command would break the call or risk injection.
    const runArgs = ['convex', 'run'];
    if (prod) runArgs.push('--prod');
    runArgs.push('names:applyCelebrityTags', JSON.stringify({ entries: batch }));
    const out = execFileSync('npx', runArgs, { encoding: 'utf-8', cwd: process.cwd() });
    const r = JSON.parse(out.trim());
    applied += r.applied;
    noop += r.noop;
    notFound.push(...r.notFound);
    console.log(
      `  Batch ${i / BATCH_SIZE + 1}: applied ${r.applied}, noop ${r.noop}, notFound ${r.notFound.length}`,
    );
  }
  console.log(`\nDone. applied ${applied}, noop ${noop}, notFound ${notFound.length}.`);
  if (notFound.length) console.log(`Not in DB: ${notFound.join(', ')}`);
}

main();
