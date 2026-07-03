/**
 * Migration : profiles.last_seen_at — dernier passage réel de l'utilisateur sur
 * le site (mis à jour, throttlé, à chaque requête authentifiée). La « dernière
 * connexion » (création de session) ne suffit pas : un cookie valable 7 jours
 * ne recrée pas de session à chaque visite.
 *
 * Exécution : set -a; . ./.env.local; set +a; npx tsx src/scripts/migrate-last-seen.ts
 */
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ');
    console.log('✓ colonne profiles.last_seen_at');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration échouée :', err);
  process.exit(1);
});
