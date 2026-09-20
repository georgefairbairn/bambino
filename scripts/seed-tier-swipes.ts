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
 * Drives admin:seedTierSwipes page by page until the tier is fully consumed.
 *
 *   npx tsx scripts/seed-tier-swipes.ts --email you@example.com [--tier 0] [--prod]
 *
 * Undo with: npx convex run admin:clearSelections [--prod] '{"email":"..."}'
 */
async function seedTierSwipes() {
  const argv = process.argv;
  const prod = argv.includes('--prod');
  const deploymentFlag = prod ? ' --prod' : '';
  const target = prod ? 'PRODUCTION' : 'dev';

  const emailIndex = argv.indexOf('--email');
  const email = emailIndex !== -1 ? argv[emailIndex + 1] : undefined;
  if (!email) {
    console.error('Missing --email. Usage: npx tsx scripts/seed-tier-swipes.ts --email a@b.com');
    process.exit(1);
  }

  const tierIndex = argv.indexOf('--tier');
  const tier = tierIndex !== -1 ? Number(argv[tierIndex + 1]) : 0;

  console.log(`Seeding tier ${tier} swipes for ${email} on ${target}...`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;
  let cursor: string | undefined;
  let page = 1;

  while (true) {
    const argsObj: Record<string, unknown> = { email, tier, batchSize: 500 };
    if (cursor) argsObj.cursor = cursor;

    console.log(`Processing page ${page}...`);

    const output = runWithRetry(
      `npx convex run admin:seedTierSwipes${deploymentFlag} '${JSON.stringify(argsObj)}'`,
    );
    const result = JSON.parse(output.trim());

    if (result.error) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    totalInserted += result.inserted;
    totalSkipped += result.skipped;
    totalProcessed += result.processed;
    console.log(`  Page ${page}: inserted ${result.inserted}, already swiped ${result.skipped}`);

    if (result.isDone) break;
    cursor = result.continueCursor;
    page++;
  }

  console.log(
    `\nDone. Processed ${totalProcessed} names in tier ${tier}: ` +
      `${totalInserted} inserted, ${totalSkipped} already swiped.`,
  );
  console.log(
    `Undo: npx convex run admin:clearSelections${deploymentFlag} '${JSON.stringify({ email })}'`,
  );
}

seedTierSwipes();
