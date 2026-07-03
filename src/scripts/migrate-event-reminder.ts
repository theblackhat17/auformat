import { Pool } from 'pg';

/**
 * Rappel de rendez-vous J-1 :
 * - project_events.reminder_sent_at : horodatage du rappel envoyé au client la veille
 *   d'un RDV visible client (garde-fou « un seul rappel par événement »).
 * Idempotent.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  await pool.query(`ALTER TABLE project_events ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ`);
  console.log('✓ colonne project_events.reminder_sent_at');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
