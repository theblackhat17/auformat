import { Pool } from 'pg';

/**
 * Compteur de numéros de devis atomique et monotone (remplace COUNT(*)+1).
 *
 * Table `quote_counters(year, seq)` : un compteur par année, incrémenté par
 * upsert atomique. Idempotent. Amorce le compteur de l'année courante à partir
 * du plus grand numéro DEV-YYYY-NNNN déjà présent, pour ne jamais entrer en
 * collision avec un devis existant.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quote_counters (
      year INTEGER PRIMARY KEY,
      seq  INTEGER NOT NULL DEFAULT 0
    )
  `);

  const year = new Date().getFullYear();

  // Amorçage : max des NNNN existants pour l'année courante (0 si aucun devis).
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX((regexp_replace(quote_number, '^DEV-\\d{4}-', ''))::int), 0) AS maxseq
       FROM quotes
      WHERE quote_number ~ ('^DEV-' || $1::text || '-\\d+$')`,
    [year]
  );
  const seed: number = rows[0]?.maxseq ?? 0;

  // Ne rabaisse jamais un compteur déjà en avance (idempotent + sûr).
  await pool.query(
    `INSERT INTO quote_counters (year, seq) VALUES ($1, $2)
     ON CONFLICT (year) DO UPDATE SET seq = GREATEST(quote_counters.seq, EXCLUDED.seq)`,
    [year, seed]
  );

  console.log(`✓ table quote_counters — compteur ${year} amorcé à ${seed}`);
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
