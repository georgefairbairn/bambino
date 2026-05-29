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

async function backfillSelections() {
  const prod = process.argv.includes('--prod');
  const deploymentFlag = prod ? ' --prod' : '';
  const target = prod ? 'PRODUCTION' : 'dev';

  console.log(`Backfilling origin/gender on selections on ${target}...`);

  let totalPatched = 0;
  let totalAlreadyOk = 0;
  let totalNameMissing = 0;
  let totalProcessed = 0;
  let cursor: string | undefined;
  let page = 1;

  while (true) {
    const argsObj: Record<string, unknown> = { limit: 500 };
    if (cursor) argsObj.cursor = cursor;

    console.log(`Processing page ${page}...`);

    try {
      const output = runWithRetry(
        `npx convex run names:backfillSelectionOriginGender${deploymentFlag} '${JSON.stringify(argsObj)}'`,
      );
      const result = JSON.parse(output.trim());
      totalPatched += result.patched;
      totalAlreadyOk += result.alreadyOk;
      totalNameMissing += result.nameMissing;
      totalProcessed += result.processed;
      console.log(
        `  Page ${page}: patched ${result.patched}, already ok ${result.alreadyOk}, name missing ${result.nameMissing}`,
      );

      if (result.isDone) break;
      cursor = result.continueCursor;
      page++;
    } catch (error) {
      console.error('Error during selection backfill:', error);
      process.exit(1);
    }
  }

  console.log(
    `\nDone! Processed ${totalProcessed} selections: patched ${totalPatched}, already ok ${totalAlreadyOk}, name missing ${totalNameMissing}.`,
  );
}

backfillSelections();
