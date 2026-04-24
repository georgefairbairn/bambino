import { execSync } from 'child_process';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

function runWithRetry(command: string): string {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return execSync(command, { encoding: 'utf-8', cwd: process.cwd() });
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`  Failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay / 1000}s...`);
      execSync(`sleep ${delay / 1000}`);
    }
  }
  throw new Error('Unreachable');
}

async function updateRanks() {
  const yearArg = process.argv.find((a) => a.startsWith('--year='));
  const year = yearArg ? parseInt(yearArg.split('=')[1], 10) : 2023;

  console.log(`Updating names with current rank for ${year}...`);

  let totalUpdated = 0;
  let totalProcessed = 0;
  let cursor: string | undefined;
  let page = 1;

  while (true) {
    const argsObj: Record<string, unknown> = { year, limit: 500 };
    if (cursor) argsObj.cursor = cursor;

    console.log(`Processing page ${page}...`);

    try {
      const output = runWithRetry(
        `npx convex run popularity:updateNamesWithCurrentRank '${JSON.stringify(argsObj)}'`,
      );
      const result = JSON.parse(output.trim());
      totalUpdated += result.updated;
      totalProcessed += result.processed;
      console.log(`  Page ${page}: updated ${result.updated} of ${result.processed} names`);

      if (result.isDone) break;
      cursor = result.continueCursor;
      page++;
    } catch (error) {
      console.error('Error updating names with current rank:', error);
      process.exit(1);
    }
  }

  console.log(`\nDone! Updated ${totalUpdated} of ${totalProcessed} names with current rank.`);
}

updateRanks();
