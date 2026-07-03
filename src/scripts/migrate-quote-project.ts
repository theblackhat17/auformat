import { Pool } from 'pg';

/**
 * Rattachement des devis aux projets :
 * - quotes.project_id : projet d'origine du devis (généré depuis la config 3D
 *   de la fiche projet admin). ON DELETE SET NULL : le devis survit à la
 *   suppression du projet.
 * Idempotent.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_project ON quotes(project_id)`);
  console.log('✓ colonne quotes.project_id + index idx_quotes_project');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
