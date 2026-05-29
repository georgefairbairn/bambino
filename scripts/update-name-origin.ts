import { execSync } from 'child_process';

/**
 * Correct a name's origin in the database. Atomically updates:
 *   - the names row's origin field
 *   - the nameOriginStats counts (decrement old, increment new)
 *   - every selection referencing this name (so per-user "remaining"
 *     filter counts stay accurate)
 *
 * Usage:
 *   npm run update:name-origin -- <nameId> <newOrigin>
 *   npm run update:name-origin -- --prod <nameId> <newOrigin>
 *
 * To find a name's ID, look it up in the Convex dashboard `names` table
 * or query by name (e.g. `npx convex data names --search-prefix Sam`).
 */
async function updateNameOrigin() {
  const args = process.argv.slice(2);
  const prod = args.includes('--prod');
  const positional = args.filter((a) => a !== '--prod');

  if (positional.length !== 2) {
    console.error('Usage: npm run update:name-origin -- [--prod] <nameId> <newOrigin>');
    console.error('Example: npm run update:name-origin -- jh7abc123def456 English');
    process.exit(1);
  }

  const [nameId, newOrigin] = positional;
  const deploymentFlag = prod ? ' --prod' : '';
  const target = prod ? 'PRODUCTION' : 'dev';

  console.log(`Updating name ${nameId} origin to "${newOrigin}" on ${target}...`);

  try {
    const output = execSync(
      `npx convex run names:updateNameOrigin${deploymentFlag} '${JSON.stringify({ nameId, newOrigin })}'`,
      { encoding: 'utf-8', cwd: process.cwd() },
    );
    const result = JSON.parse(output.trim());

    if (!result.nameUpdated) {
      console.log(`No-op: name already has origin "${result.newOrigin}".`);
      return;
    }

    console.log(`Done!`);
    console.log(`  Name updated: ${result.oldOrigin} -> ${result.newOrigin}`);
    console.log(`  Stats updated: ${result.statsUpdated}`);
    console.log(`  Selections patched: ${result.selectionsUpdated}`);
  } catch (error) {
    console.error('Error during update:', error);
    process.exit(1);
  }
}

updateNameOrigin();
