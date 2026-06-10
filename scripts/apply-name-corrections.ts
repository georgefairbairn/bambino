import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Apply a batch of name-data corrections (origin and/or meaning) produced by
 * the data audit. Calls names:applyNameCorrections in batches, which atomically
 * updates the names row, nameOriginStats, and referencing selections for any
 * origin change (see convex/names.ts).
 *
 * The corrections file is a JSON array of:
 *   { "name": string, "origin"?: string, "meaning"?: string }
 * Each entry must include at least one of `origin` or `meaning`.
 *
 * Usage:
 *   npm run apply:name-corrections -- <correctionsFile.json>
 *   npm run apply:name-corrections -- --prod <correctionsFile.json>
 */
const BATCH_SIZE = 100;

interface Correction {
  name: string;
  origin?: string;
  meaning?: string;
}

async function main() {
  const argv = process.argv.slice(2);
  const prod = argv.includes('--prod');
  const positional = argv.filter((a) => a !== '--prod');
  const file = positional[0];

  if (!file) {
    console.error('Usage: npm run apply:name-corrections -- [--prod] <correctionsFile.json>');
    process.exit(1);
  }

  const raw: unknown = JSON.parse(readFileSync(file, 'utf-8'));
  if (!Array.isArray(raw)) {
    console.error('Corrections file must be a JSON array.');
    process.exit(1);
  }

  const corrections: Correction[] = [];
  for (const entry of raw as Correction[]) {
    if (!entry || typeof entry.name !== 'string') {
      console.error(`Skipping invalid entry (no name): ${JSON.stringify(entry)}`);
      continue;
    }
    const c: Correction = { name: entry.name };
    if (typeof entry.origin === 'string' && entry.origin.length > 0) c.origin = entry.origin;
    if (typeof entry.meaning === 'string' && entry.meaning.length > 0) c.meaning = entry.meaning;
    if (c.origin === undefined && c.meaning === undefined) {
      console.error(`Skipping ${entry.name}: no origin or meaning provided`);
      continue;
    }
    corrections.push(c);
  }

  const convexFlag = prod ? '--prod ' : '';
  console.log(`Applying ${corrections.length} corrections to ${prod ? 'PRODUCTION' : 'dev'}...`);

  const totals = {
    applied: 0,
    noop: 0,
    notFound: 0,
    meaningChanges: 0,
    originChanges: 0,
  };
  const notFoundNames: string[] = [];

  for (let i = 0; i < corrections.length; i += BATCH_SIZE) {
    const batch = corrections.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(corrections.length / BATCH_SIZE);
    const tmpFile = join(tmpdir(), `bambino-corrections-${batchNum}.json`);

    try {
      writeFileSync(tmpFile, JSON.stringify({ corrections: batch }));
      const output = execSync(
        `npx convex run ${convexFlag}names:applyNameCorrections "$(cat ${tmpFile})"`,
        { encoding: 'utf-8', cwd: process.cwd() },
      );
      const parsed = JSON.parse(output.trim());
      const s = parsed.summary;
      totals.applied += s.applied;
      totals.noop += s.noop;
      totals.notFound += s.notFound;
      totals.meaningChanges += s.meaningChanges;
      totals.originChanges += s.originChanges;
      for (const r of parsed.results as { name: string; status: string }[]) {
        if (r.status === 'not_found') notFoundNames.push(r.name);
      }
      console.log(
        `  Batch ${batchNum}/${totalBatches}: applied ${s.applied}, noop ${s.noop}, ` +
          `notFound ${s.notFound} (origins ${s.originChanges}, meanings ${s.meaningChanges})`,
      );
    } catch (error) {
      console.error(`Error on batch ${batchNum}:`, error);
      process.exit(1);
    } finally {
      try {
        unlinkSync(tmpFile);
      } catch {
        // ignore
      }
    }
  }

  console.log('\nDone.');
  console.log(
    `Applied ${totals.applied} (origins ${totals.originChanges}, meanings ${totals.meaningChanges}), ` +
      `noop ${totals.noop}, notFound ${totals.notFound}`,
  );
  if (notFoundNames.length > 0) {
    console.log(`Not found: ${notFoundNames.join(', ')}`);
  }
}

main();
