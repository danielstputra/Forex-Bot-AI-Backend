/**
 * db-deploy.js — Bulletproof Prisma deployment for Railway.
 *
 * Strategy: always try to baseline first (safe no-op if DB is fresh or
 * already tracked), then run migrate deploy. This avoids P3005 on every
 * redeployment of an existing Railway PostgreSQL database.
 */

const { execSync } = require('child_process');

const MIGRATION_NAME = '20260630000000_init_postgresql';

function run(cmd, label) {
  console.log(`[DB Deploy] Running: ${label || cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

console.log('[DB Deploy] Starting database deployment...');

// Step 1: Try to baseline the migration.
// - If DB has tables but _prisma_migrations is empty → baselines it (fixes P3005)
// - If already baselined → Prisma prints a warning and exits 0 (no-op, safe)
// - If DB is fresh/empty → Prisma prints a warning and exits 0 (no-op, safe)
// We suppress errors here intentionally — all outcomes are acceptable.
try {
  run(
    `npx prisma migrate resolve --applied "${MIGRATION_NAME}"`,
    `Baseline: ${MIGRATION_NAME}`
  );
  console.log('[DB Deploy] Baseline step completed.');
} catch (_) {
  console.log('[DB Deploy] Baseline not needed or already applied — continuing.');
}

// Step 2: Deploy all pending migrations normally.
console.log('[DB Deploy] Applying pending migrations...');
run('npx prisma migrate deploy', 'prisma migrate deploy');

console.log('[DB Deploy] ✓ Database is ready.');

