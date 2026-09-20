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

/**
 * Drives admin:seedSwipePool until the user's swipe queue has nothing left.
 *
 *   npx tsx scripts/seed-swipe-pool.ts --email you@example.com [--all] [--prod]
 *
 * Default consumes only the pool the user's own filters see. --all consumes
 * the whole catalogue (many more rows; confirm clearSelections can undo it).
 *
 * Undo: npx convex run admin:clearSelections [--prod] '{"email":"..."}'
 */
async function seedSwipePool() {
  const argv = process.argv;
  const prod = argv.includes('--prod');
  const deploymentFlag = prod ? ' --prod' : '';
  const target = prod ? 'PRODUCTION' : 'dev';
  const ignoreFilters = argv.includes('--all');

  const emailIndex = argv.indexOf('--email');
  const email = emailIndex !== -1 ? argv[emailIndex + 1] : undefined;
  if (!email) {
    console.error('Missing --email. Usage: npx tsx scripts/seed-swipe-pool.ts --email a@b.com');
    process.exit(1);
  }

  const scope = ignoreFilters ? 'entire catalogue' : "the user's filtered pool";
  console.log(`Consuming ${scope} for ${email} on ${target}...`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalFilteredOut = 0;
  let totalProcessed = 0;
  let cursor: string | undefined;
  let page = 1;

  while (true) {
    const argsObj: Record<string, unknown> = { email, batchSize: 500 };
    if (ignoreFilters) argsObj.ignoreFilters = true;
    if (cursor) argsObj.cursor = cursor;

    console.log(`Processing page ${page}...`);

    const output = runWithRetry(
      `npx convex run admin:seedSwipePool${deploymentFlag} '${JSON.stringify(argsObj)}'`,
    );
    const result = JSON.parse(output.trim());

    if (result.error) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    totalInserted += result.inserted;
    totalSkipped += result.skipped;
    totalFilteredOut += result.filteredOut;
    totalProcessed += result.processed;
    console.log(
      `  Page ${page}: inserted ${result.inserted}, ` +
        `already swiped ${result.skipped}, not in filter ${result.filteredOut}`,
    );

    if (result.isDone) break;
    cursor = result.continueCursor;
    page++;
  }

  console.log(
    `\nDone. Scanned ${totalProcessed} names: ${totalInserted} inserted, ` +
      `${totalSkipped} already swiped, ${totalFilteredOut} outside the filter.`,
  );
  console.log(`Queue pool now consumed: ${totalInserted + totalSkipped} names.`);
  console.log(
    `Undo: npx convex run admin:clearSelections${deploymentFlag} '${JSON.stringify({ email })}'`,
  );
}

seedSwipePool();
