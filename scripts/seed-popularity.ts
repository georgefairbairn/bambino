import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import popularityData from '../data/popularity.json';

const BATCH_SIZE = 100;
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;
const BATCH_DELAY_MS = 100;

interface PopularityRecord {
  name: string;
  gender: string;
  year: number;
  rank: number;
  count: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runWithRetry(command: string, batchNumber: number): string {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return execSync(command, { encoding: 'utf-8', cwd: process.cwd() });
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`  Batch ${batchNumber} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay / 1000}s...`);
      execSync(`sleep ${delay / 1000}`);
    }
  }
  throw new Error('Unreachable');
}

async function seedPopularity() {
  const records = popularityData as PopularityRecord[];
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  const startBatchArg = process.argv.find((a) => a.startsWith('--start='));
  const startBatch = startBatchArg ? parseInt(startBatchArg.split('=')[1], 10) : 1;
  const startIndex = (startBatch - 1) * BATCH_SIZE;

  console.log(`Starting seed with ${records.length} popularity records...`);
  console.log(`Batch size: ${BATCH_SIZE}, starting from batch ${startBatch}/${totalBatches}`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = startIndex; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);

    const tmpFile = join(tmpdir(), `bambino-seed-popularity-${batchNumber}.json`);

    try {
      writeFileSync(tmpFile, JSON.stringify({ records: batch }));
      const output = runWithRetry(
        `npx convex run popularity:seedPopularity "$(cat ${tmpFile})"`,
        batchNumber,
      );
      const parsed = JSON.parse(output.trim());
      totalInserted += parsed.inserted;
      totalSkipped += parsed.skipped;
      console.log(`  Inserted: ${parsed.inserted}, Skipped: ${parsed.skipped}`);
    } catch (error) {
      console.error(`Error processing batch ${batchNumber} after ${MAX_RETRIES} retries:`, error);
      console.error(`\nResume with: npm run seed:popularity -- --start=${batchNumber}`);
      process.exit(1);
    } finally {
      try {
        unlinkSync(tmpFile);
      } catch {
        // ignore cleanup errors
      }
    }

    if (i + BATCH_SIZE < records.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log('\nSeed completed!');
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total skipped (duplicates): ${totalSkipped}`);
  console.log('\nRun `npm run update:ranks` to update names with current popularity rank.');
}

seedPopularity();
