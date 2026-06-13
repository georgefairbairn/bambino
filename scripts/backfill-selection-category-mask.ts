import { execSync } from 'child_process';

function run(command: string): string {
  return execSync(command, { encoding: 'utf-8', cwd: process.cwd() });
}

async function main() {
  const prod = process.argv.includes('--prod');
  const flag = prod ? ' --prod' : '';
  let patched = 0;
  let processed = 0;
  let cursor: string | undefined;
  let page = 1;
  console.log(`Backfilling selections.categoryMask on ${prod ? 'PRODUCTION' : 'dev'}...`);
  while (true) {
    const args: Record<string, unknown> = { limit: 500 };
    if (cursor) args.cursor = cursor;
    const out = run(`npx convex run${flag} names:backfillSelectionCategoryMask '${JSON.stringify(args)}'`);
    const r = JSON.parse(out.trim());
    patched += r.patched;
    processed += r.processed;
    console.log(`  Page ${page}: patched ${r.patched} of ${r.processed}`);
    if (r.isDone) break;
    cursor = r.continueCursor;
    page++;
  }
  console.log(`\nDone! Patched ${patched} of ${processed} selections.`);
}

main();
