import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import namesData from '../data/names.json';

const BATCH_SIZE = 100;

async function seedNames() {
  const deploymentUrl = process.env.CONVEX_URL;

  if (!deploymentUrl) {
    console.error('Error: CONVEX_URL environment variable is not set.');
    console.error('Please set it to your Convex deployment URL.');
    console.error('You can find this in your Convex dashboard or .env.local file.');
    process.exit(1);
  }

  const client = new ConvexHttpClient(deploymentUrl);

  console.log(`Starting seed with ${namesData.length} names...`);
  console.log(`Batch size: ${BATCH_SIZE}`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = 0; i < namesData.length; i += BATCH_SIZE) {
    const batch = namesData.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(namesData.length / BATCH_SIZE);

    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} names)...`);

    try {
      const result = await client.mutation(api.names.seedNames, { names: batch });
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
}

seedNames();
