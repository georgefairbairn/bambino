import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import popularityData from '../data/popularity.json';

const BATCH_SIZE = 100;

interface PopularityRecord {
  name: string;
  gender: string;
  year: number;
  rank: number;
  count: number;
}

async function seedPopularity() {
  const records = popularityData as PopularityRecord[];

  console.log(`Starting seed with ${records.length} popularity records...`);
  console.log(`Batch size: ${BATCH_SIZE}`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);

    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);

    const tmpFile = join(tmpdir(), `bambino-seed-popularity-${batchNumber}.json`);

    try {
      writeFileSync(tmpFile, JSON.stringify({ records: batch }));
      const output = execSync(`npx convex run popularity:seedPopularity "$(cat ${tmpFile})"`, {
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

  // Now update names with current rank
  console.log('\nUpdating names with current rank for 2023...');
  try {
    const output = execSync(
      'npx convex run popularity:updateNamesWithCurrentRank \'{"year": 2023}\'',
      { encoding: 'utf-8', cwd: process.cwd() },
    );
    const rankResult = JSON.parse(output.trim());
    console.log(`Updated ${rankResult.updated} of ${rankResult.total} names with current rank`);
  } catch (error) {
    console.error('Error updating names with current rank:', error);
    process.exit(1);
  }
}

seedPopularity();
