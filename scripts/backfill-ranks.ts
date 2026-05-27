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

async function backfillRanks() {
  const prod = process.argv.includes('--prod');
  const deploymentFlag = prod ? ' --prod' : '';
  const target = prod ? 'PRODUCTION' : 'dev';

  console.log(`Backfilling missing currentRank values from most recent year on ${target}...`);

  let totalUpdated = 0;
  let totalAlreadyRanked = 0;
  let totalStillRankless = 0;
  let totalProcessed = 0;
  let cursor: string | undefined;
  let page = 1;

  while (true) {
    const argsObj: Record<string, unknown> = { limit: 500 };
    if (cursor) argsObj.cursor = cursor;

    console.log(`Processing page ${page}...`);

    try {
      const output = runWithRetry(
        `npx convex run popularity:backfillCurrentRankFromMostRecent${deploymentFlag} '${JSON.stringify(argsObj)}'`,
      );
      const result = JSON.parse(output.trim());
      totalUpdated += result.updated;
      totalAlreadyRanked += result.alreadyRanked;
      totalStillRankless += result.stillRankless;
      totalProcessed += result.processed;
      console.log(
        `  Page ${page}: backfilled ${result.updated}, already ranked ${result.alreadyRanked}, no popularity data ${result.stillRankless}`,
      );

      if (result.isDone) break;
      cursor = result.continueCursor;
      page++;
    } catch (error) {
      console.error('Error during backfill:', error);
      process.exit(1);
    }
  }

  console.log(
    `\nDone! Processed ${totalProcessed} names: backfilled ${totalUpdated}, already ranked ${totalAlreadyRanked}, no popularity data ${totalStillRankless}.`,
  );
}

backfillRanks();
