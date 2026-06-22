import { Pool } from 'pg';

/**
 * Lot « cycle de vie » 2026-06 :
 * - project_updates : timeline de fabrication (statut, note, photos) alimentée depuis
 *   /admin/projets et affichée au client dans /mes-projets ;
 * - quotes : colonnes de relance automatique (J+7 / expiration proche) et de demande
 *   de modification par le client ;
 * - rate_limit_hits : rate limiting persistant (survit aux redémarrages pm2).
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
    CREATE TABLE IF NOT EXISTS project_updates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      status TEXT,
      note TEXT,
      photos JSONB NOT NULL DEFAULT '[]',
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id, created_at)`);
  console.log('✓ table project_updates');

  await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS revision_message TEXT`);
  console.log('✓ colonnes quotes (relances + révision)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_limit_hits (
      key TEXT NOT NULL,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_rate_limit_hits ON rate_limit_hits(key, ts)`);
  console.log('✓ table rate_limit_hits');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
