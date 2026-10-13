import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
async function main() {
  const { getAuth } = await import('../lib/accounts/auth');
  const { getAccountPool,businessSchema } = await import('../lib/accounts/database');
  const { getMigrations } = await import('better-auth/db/migration');
  const pool = getAccountPool(), connection = await pool.connect();
  try {
    await connection.query("SELECT pg_advisory_lock(hashtext('perfume-account-migrations-v1'))");
    const plan = await getMigrations(getAuth().options);
    if (plan.schemaProblems.length) throw new Error('Authentication schema needs review.');
    await plan.runMigrations();
    await connection.query('BEGIN');
    await connection.query(businessSchema);
    await connection.query('COMMIT');
    console.log('Account and preference schema ready. Existing booth records preserved.');
  } finally {
    await connection.query("SELECT pg_advisory_unlock(hashtext('perfume-account-migrations-v1'))");
    connection.release(); await pool.end();
  }
}
main().catch(() => { console.error('Account migration failed. Check database connectivity and schema.'); process.exitCode=1; });
