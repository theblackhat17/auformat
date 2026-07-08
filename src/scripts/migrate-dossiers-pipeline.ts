import { Pool } from 'pg';

/**
 * Phase 2 — le dossier devient une unité de gestion qui avance dans le kanban.
 *
 * - project_folders porte désormais un statut + des étapes (même catalogue que les
 *   projets) + des notes admin, et peut exister sans client (user_id nullable :
 *   l'admin crée un dossier puis l'attribue).
 * - Les documents et le suivi client peuvent être rattachés à un DOSSIER
 *   (folder_id) et non plus seulement à un projet (project_id devient nullable,
 *   avec une contrainte « au moins l'un des deux »).
 *
 * Idempotent.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  // Dossier = unité de pipeline
  await pool.query(`ALTER TABLE project_folders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'`);
  await pool.query(`ALTER TABLE project_folders ADD COLUMN IF NOT EXISTS milestones JSONB NOT NULL DEFAULT '{}'::jsonb`);
  await pool.query(`ALTER TABLE project_folders ADD COLUMN IF NOT EXISTS admin_notes TEXT`);
  await pool.query(`ALTER TABLE project_folders ALTER COLUMN user_id DROP NOT NULL`);
  console.log('✓ project_folders : status, milestones, admin_notes, user_id nullable');

  // Documents rattachables à un dossier
  await pool.query(`ALTER TABLE project_documents ALTER COLUMN project_id DROP NOT NULL`);
  await pool.query(`ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES project_folders(id) ON DELETE CASCADE`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_documents_folder ON project_documents(folder_id)`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_documents_scope_chk') THEN
        ALTER TABLE project_documents ADD CONSTRAINT project_documents_scope_chk CHECK (project_id IS NOT NULL OR folder_id IS NOT NULL);
      END IF;
    END $$;
  `);
  console.log('✓ project_documents : folder_id + contrainte de portée');

  // Suivi client rattachable à un dossier
  await pool.query(`ALTER TABLE project_updates ALTER COLUMN project_id DROP NOT NULL`);
  await pool.query(`ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES project_folders(id) ON DELETE CASCADE`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_updates_folder ON project_updates(folder_id, created_at)`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_updates_scope_chk') THEN
        ALTER TABLE project_updates ADD CONSTRAINT project_updates_scope_chk CHECK (project_id IS NOT NULL OR folder_id IS NOT NULL);
      END IF;
    END $$;
  `);
  console.log('✓ project_updates : folder_id + contrainte de portée');

  // Agenda rattachable à un dossier
  await pool.query(`ALTER TABLE project_events ALTER COLUMN project_id DROP NOT NULL`);
  await pool.query(`ALTER TABLE project_events ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES project_folders(id) ON DELETE CASCADE`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_events_folder ON project_events(folder_id, start_at)`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_events_scope_chk') THEN
        ALTER TABLE project_events ADD CONSTRAINT project_events_scope_chk CHECK (project_id IS NOT NULL OR folder_id IS NOT NULL);
      END IF;
    END $$;
  `);
  console.log('✓ project_events : folder_id + contrainte de portée');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
