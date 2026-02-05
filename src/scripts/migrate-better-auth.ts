import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Step A: Add email_verified column to profiles
    console.log('Adding email_verified column to profiles...');
    await client.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false
    `);
    await client.query(`UPDATE profiles SET email_verified = true WHERE email_verified IS NULL OR email_verified = false`);

    // Step B: Create Better Auth tables
    console.log('Creating session table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
      )
    `);

    console.log('Creating account table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMPTZ,
        "refreshTokenExpiresAt" TIMESTAMPTZ,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Creating verification table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Step C: Migrate passwords from profiles.password_hash to account table
    console.log('Migrating passwords to account table...');
    const result = await client.query(`
      INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid()::text,
        email,
        'credential',
        id,
        password_hash,
        created_at,
        updated_at
      FROM profiles
      WHERE password_hash IS NOT NULL
        AND id NOT IN (SELECT "userId" FROM "account" WHERE "providerId" = 'credential')
    `);
    console.log(`  Migrated ${result.rowCount} password(s) to account table`);

    await client.query('COMMIT');

    // Verify
    const profileCount = await pool.query('SELECT COUNT(*)::int as count FROM profiles');
    const accountCount = await pool.query(`SELECT COUNT(*)::int as count FROM "account" WHERE "providerId" = 'credential'`);
    const verifiedCount = await pool.query('SELECT COUNT(*)::int as count FROM profiles WHERE email_verified = true');

    console.log('\n--- Verification ---');
    console.log(`Profiles: ${profileCount.rows[0].count}`);
    console.log(`Accounts (credential): ${accountCount.rows[0].count}`);
    console.log(`Email verified: ${verifiedCount.rows[0].count}`);
    console.log('✅ Migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));
