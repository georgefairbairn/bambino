import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import namesData from '../data/names.json';

const BATCH_SIZE = 100;

async function seedNames() {
  console.log(`Starting seed with ${namesData.length} names...`);
  console.log(`Batch size: ${BATCH_SIZE}`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = 0; i < namesData.length; i += BATCH_SIZE) {
    const batch = namesData.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(namesData.length / BATCH_SIZE);

    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} names)...`);

    const tmpFile = join(tmpdir(), `bambino-seed-names-${batchNumber}.json`);

    try {
      writeFileSync(tmpFile, JSON.stringify({ names: batch }));
      const output = execSync(`npx convex run names:seedNames "$(cat ${tmpFile})"`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      const parsed = JSON.parse(output.trim());
      totalInserted += parsed.inserted;
      totalSkipped += parsed.skipped;
      console.log(`  Inserted: ${parsed.inserted}, Skipped: ${parsed.skipped}`);
    } catch (error) {
      console.error(`Error processing batch ${batchNumber}:`, error);
      process.exit(1);
    } finally {
      try {
        unlinkSync(tmpFile);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  console.log('\nSeed completed!');
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total skipped (duplicates): ${totalSkipped}`);
}

seedNames();
