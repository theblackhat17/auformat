import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  // 'moderne' = Young Serif + Hanken Grotesk (redesign 2026) · 'classique' = polices système (ancien site)
  await pool.query(
    `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS font_theme TEXT NOT NULL DEFAULT 'moderne'`
  );
  console.log('✓ Colonne font_theme ajoutée à site_settings (défaut : moderne)');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
