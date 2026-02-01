import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
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
  const deploymentUrl = process.env.CONVEX_URL;

  if (!deploymentUrl) {
    console.error('Error: CONVEX_URL environment variable is not set.');
    console.error('Please set it to your Convex deployment URL.');
    console.error('You can find this in your Convex dashboard or .env.local file.');
    process.exit(1);
  }

  const client = new ConvexHttpClient(deploymentUrl);
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

    try {
      const result = await client.mutation(api.popularity.seedPopularity, { records: batch });
      totalInserted += result.inserted;
      totalSkipped += result.skipped;
      console.log(`  Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
    } catch (error) {
      console.error(`Error processing batch ${batchNumber}:`, error);
      process.exit(1);
    }
  }

  console.log('\nSeed completed!');
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total skipped (duplicates): ${totalSkipped}`);

  // Now update names with current rank
  console.log('\nUpdating names with current rank for 2023...');
  try {
    const rankResult = await client.mutation(api.popularity.updateNamesWithCurrentRank, {
      year: 2023,
    });
    console.log(`Updated ${rankResult.updated} of ${rankResult.total} names with current rank`);
  } catch (error) {
    console.error('Error updating names with current rank:', error);
    process.exit(1);
  }
}

seedPopularity();
