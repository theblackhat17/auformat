import { Pool } from 'pg';

/**
 * Module de gestion de projet (admin) :
 * - projects.admin_notes : notes internes libres (jamais visibles côté client) ;
 * - projects.milestones : jalons du cycle de vie (configuré → publié sur le site),
 *   JSONB { [key]: { done, date, by } } ;
 * - projects.production : checklist de production (décors, panneaux, spécificités),
 *   JSONB { [key]: { done, note } } ;
 * - project_documents : documents rattachés à un projet (plans, devis signés…),
 *   avec visibilité 'client' ou 'admin'.
 * Idempotent.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS admin_notes TEXT`);
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS milestones JSONB NOT NULL DEFAULT '{}'::jsonb`);
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS production JSONB NOT NULL DEFAULT '{}'::jsonb`);
  console.log('✓ colonnes projects (admin_notes, milestones, production)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'admin' CHECK (visibility IN ('client','admin')),
      uploaded_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents(project_id, created_at)`);
  console.log('✓ table project_documents');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
