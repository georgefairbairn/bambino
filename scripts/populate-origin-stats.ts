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

async function populateOriginStats() {
  const prod = process.argv.includes('--prod');
  const deploymentFlag = prod ? ' --prod' : '';
  const target = prod ? 'PRODUCTION' : 'dev';

  console.log(`Rebuilding nameOriginStats from names table on ${target}...`);

  let totalProcessed = 0;
  let cursor: string | undefined;
  let page = 1;

  while (true) {
    const argsObj: Record<string, unknown> = {
      limit: 1000,
      // First page: clear existing rows for a clean rebuild.
      // Subsequent pages: accumulate.
      accumulate: page > 1,
    };
    if (cursor) argsObj.cursor = cursor;

    console.log(`Processing page ${page}...`);

    try {
      const output = runWithRetry(
        `npx convex run names:populateOriginStats${deploymentFlag} '${JSON.stringify(argsObj)}'`,
      );
      const result = JSON.parse(output.trim());
      totalProcessed += result.processed;
      console.log(`  Page ${page}: processed ${result.processed} names`);

      if (result.isDone) break;
      cursor = result.continueCursor;
      page++;
    } catch (error) {
      console.error('Error during stats populate:', error);
      process.exit(1);
    }
  }

  console.log(`\nDone! Processed ${totalProcessed} names across ${page} page(s).`);
}

populateOriginStats();
