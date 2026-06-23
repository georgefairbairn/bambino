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

async function main() {
  const prod = process.argv.includes('--prod');
  const flag = prod ? ' --prod' : '';
  let updated = 0;
  let processed = 0;
  let cursor: string | undefined;
  let page = 1;

  console.log(`Computing derived categories on ${prod ? 'PRODUCTION' : 'dev'}...`);
  while (true) {
    const args: Record<string, unknown> = { limit: 75 };
    if (cursor) args.cursor = cursor;
    const out = runWithRetry(
      `npx convex run${flag} names:computeDerivedCategories '${JSON.stringify(args)}'`,
    );
    const r = JSON.parse(out.trim());
    updated += r.updated;
    processed += r.processed;
    console.log(`  Page ${page}: updated ${r.updated} of ${r.processed}`);
    if (r.isDone) break;
    cursor = r.continueCursor;
    page++;
  }
  console.log(`\nDone! Updated ${updated} of ${processed} names.`);
}

main();
