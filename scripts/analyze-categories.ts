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
  const totals: Record<string, number> = {};
  let uncategorized = 0;
  let multi = 0;
  let processed = 0;
  let cursor: string | undefined;
  let page = 1;

  while (true) {
    const args: Record<string, unknown> = { limit: 75 };
    if (cursor) args.cursor = cursor;
    const out = runWithRetry(
      `npx convex run${flag} names:analyzeCategoryDistribution '${JSON.stringify(args)}'`,
    );
    const r = JSON.parse(out.trim());
    for (const [k, v] of Object.entries(r.counts as Record<string, number>)) {
      totals[k] = (totals[k] ?? 0) + v;
    }
    uncategorized += r.uncategorized;
    multi += r.multi;
    processed += r.processed;
    console.log(`  Page ${page}: processed ${processed} so far`);
    if (r.isDone) break;
    cursor = r.continueCursor;
    page++;
  }

  console.log(`\nProcessed ${processed} names on ${prod ? 'PRODUCTION' : 'dev'}:`);
  for (const k of Object.keys(totals)) console.log(`  ${k}: ${totals[k]}`);
  console.log(`  (uncategorized: ${uncategorized}, in 2+ categories: ${multi})`);
}

main();
