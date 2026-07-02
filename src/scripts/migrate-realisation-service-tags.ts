import { Pool } from 'pg';

/**
 * Ajoute la colonne `service_tags` (JSONB) aux réalisations : liste de slugs de services
 * (« meubles », « dressings », « cuisines »…) permettant d'afficher chaque réalisation
 * sur la sous-page « savoir-faire » correspondante. Idempotent.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  await pool.query(`ALTER TABLE realisations ADD COLUMN IF NOT EXISTS service_tags JSONB NOT NULL DEFAULT '[]'::jsonb`);
  console.log('✓ colonne realisations.service_tags (JSONB) prête');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
