import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}
const url = new URL(dbUrl);
const pool = new Pool({
  host: url.hostname,
  port: parseInt(url.port || '5432'),
  database: url.pathname.slice(1),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
});

async function migrate() {
  const client = await pool.connect();
  try {
    // Add config_data JSONB column if it doesn't exist
    await client.query(`
      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS config_data JSONB DEFAULT NULL
    `);
    console.log('Added config_data column to quotes table');

    // Add client_name, client_email, client_phone if missing (for configurateur quotes)
    await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_name VARCHAR DEFAULT NULL`);
    await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_email VARCHAR DEFAULT NULL`);
    await client.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_phone VARCHAR DEFAULT NULL`);
    console.log('Ensured client contact columns exist');

    console.log('Migration complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
