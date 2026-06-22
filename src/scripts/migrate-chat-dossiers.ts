import { Pool } from 'pg';

/**
 * Lot « dossiers + messagerie + avis Google » 2026-06 :
 * - project_folders : regrouper plusieurs projets d'un même chantier ;
 * - project_messages : discussion client ↔ atelier rattachée à un projet OU à un dossier,
 *   avec pièces jointes et notifications email ;
 * - projects.review_request_sent_at + site_settings.google_review_url : demande d'avis
 *   Google envoyée automatiquement quelques jours après la fin du chantier.
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
    CREATE TABLE IF NOT EXISTS project_folders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✓ table project_folders');

  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES project_folders(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ`);
  console.log('✓ colonnes projects (folder_id, review_request_sent_at)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      folder_id UUID REFERENCES project_folders(id) ON DELETE CASCADE,
      sender_id UUID,
      sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'admin')),
      body TEXT,
      attachments JSONB NOT NULL DEFAULT '[]',
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (project_id IS NOT NULL OR folder_id IS NOT NULL)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_messages_project ON project_messages(project_id, created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_messages_folder ON project_messages(folder_id, created_at)`);
  console.log('✓ table project_messages');

  await pool.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS google_review_url TEXT`);
  console.log('✓ colonne site_settings.google_review_url');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
