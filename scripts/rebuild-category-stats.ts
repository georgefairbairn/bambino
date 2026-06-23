import { execSync } from 'child_process';

function run(command: string): string {
  return execSync(command, { encoding: 'utf-8', cwd: process.cwd() });
}

async function main() {
  const prod = process.argv.includes('--prod');
  const flag = prod ? ' --prod' : '';
  let processed = 0;
  let cursor: string | undefined;
  let page = 1;
  console.log(`Rebuilding nameCategoryStats on ${prod ? 'PRODUCTION' : 'dev'}...`);
  while (true) {
    const args: Record<string, unknown> = { limit: 1000, accumulate: page > 1 };
    if (cursor) args.cursor = cursor;
    const out = run(`npx convex run${flag} names:rebuildNameCategoryStats '${JSON.stringify(args)}'`);
    const r = JSON.parse(out.trim());
    processed += r.processed;
    console.log(`  Page ${page}: processed ${r.processed}`);
    if (r.isDone) break;
    cursor = r.continueCursor;
    page++;
  }
  console.log(`\nDone! Processed ${processed} names into category stats.`);
}

main();
