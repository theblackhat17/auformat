import { Pool } from 'pg';

/**
 * Fiche client enrichie :
 * - profiles.admin_notes : notes internes de l'atelier sur le client (jamais visibles côté client).
 * - client_contacts : contacts supplémentaires d'un client (conjoint, architecte, assistant…).
 *   Les e-mails envoyés au client (suivi projet/dossier, devis, messagerie, relances)
 *   partent aussi vers ces contacts.
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
  await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT`);
  console.log('✓ profiles : admin_notes');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_client_contacts_user ON client_contacts(user_id)`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_contacts_user_email_key') THEN
        ALTER TABLE client_contacts ADD CONSTRAINT client_contacts_user_email_key UNIQUE (user_id, email);
      END IF;
    END $$;
  `);
  console.log('✓ client_contacts : table + index + unicité (user_id, email)');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
