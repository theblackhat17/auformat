import { Pool } from 'pg';

/**
 * Visibilité des pages publiques : `site_settings.disabled_pages` (JSONB, liste
 * de hrefs désactivés). Une page désactivée disparaît de la navigation ET son
 * URL redirige vers l'accueil. Idempotent.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  await pool.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS disabled_pages JSONB NOT NULL DEFAULT '[]'::jsonb`);
  console.log('✓ colonne site_settings.disabled_pages');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
