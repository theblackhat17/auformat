import { Pool } from 'pg';

/**
 * Personnalisation des e-mails (admin « Mails ») :
 * - email_templates : stocke UNIQUEMENT les overrides (sujet + corps HTML)
 *   par clé de modèle. Sans ligne, les défauts du code
 *   (src/lib/email-templates.ts) s'appliquent.
 * Idempotent.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      key TEXT PRIMARY KEY,
      subject TEXT,
      body_html TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ table email_templates');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
