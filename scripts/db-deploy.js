/**
 * db-deploy.js — Smart Prisma deployment script for Railway.
 *
 * Handles two scenarios automatically:
 * 1. Fresh empty DB      → prisma migrate deploy (runs migration SQL normally)
 * 2. Existing DB (P3005) → baseline the migration first, then migrate deploy
 *
 * This prevents the P3005 "schema not empty" error on Railway redeployments.
 */

const { execSync } = require('child_process');

const MIGRATION_NAME = '20260630000000_init_postgresql';

function run(cmd, label) {
  console.log(`\n[DB Deploy] Running: ${label || cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function tryBaseline() {
  try {
    run(
      `npx prisma migrate resolve --applied "${MIGRATION_NAME}"`,
      `Baseline migration: ${MIGRATION_NAME}`
    );
    console.log('[DB Deploy] ✓ Baseline applied. Database is now tracked by Prisma.');
    return true;
  } catch (e) {
    // Already baselined or some other issue — not fatal
    console.log('[DB Deploy] Baseline skipped (migration may already be tracked).');
    return false;
  }
}

async function main() {
  console.log('[DB Deploy] Starting smart database deployment...');

  try {
    // Attempt normal migration deploy first
    run('npx prisma migrate deploy', 'prisma migrate deploy');
    console.log('\n[DB Deploy] ✓ All migrations applied successfully.');
  } catch (err) {
    const output = err.stdout?.toString() || err.stderr?.toString() || err.message || '';

    if (output.includes('P3005') || output.includes('schema is not empty')) {
      console.log('\n[DB Deploy] Detected existing schema (P3005). Running baseline...');
      tryBaseline();

      // Retry migrate deploy after baseline
      console.log('\n[DB Deploy] Retrying migration deploy after baseline...');
      run('npx prisma migrate deploy', 'prisma migrate deploy (retry)');
      console.log('\n[DB Deploy] ✓ Migrations applied successfully after baseline.');
    } else {
      // Unknown error — rethrow
      console.error('\n[DB Deploy] ✗ Unexpected migration error:', output);
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error('[DB Deploy] Fatal error:', e.message);
  process.exit(1);
});
