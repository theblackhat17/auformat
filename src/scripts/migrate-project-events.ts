import { Pool } from 'pg';

/**
 * Agenda de projet (admin) :
 * - project_events : dates typées rattachées à un projet (RDV client, jours d'atelier),
 *   avec plage horaire ou journée entière, notes internes et colonne `google_event_id`
 *   réservée pour la future synchronisation Google Calendar (inutilisée pour l'instant).
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
    CREATE TABLE IF NOT EXISTS project_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT,
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ,
      all_day BOOLEAN NOT NULL DEFAULT false,
      notes TEXT,
      google_event_id TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✓ table project_events');

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_events_project ON project_events(project_id, start_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_events_start ON project_events(start_at)`);
  console.log('✓ index project_events');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
