import { rawQuery } from './db';
import type { PoolClient } from 'pg';

/**
 * Génère un numéro de devis séquentiel et atomique : `DEV-YYYY-NNNN`.
 *
 * S'appuie sur la table compteur `quote_counters` via un upsert atomique
 * (`ON CONFLICT ... DO UPDATE ... RETURNING`). Deux propriétés que l'ancien
 * `COUNT(*)+1` n'avait pas :
 *  - immunisé contre les courses : deux requêtes concurrentes obtiennent deux
 *    numéros distincts (l'incrément est atomique côté PostgreSQL) ;
 *  - immunisé contre les suppressions : le compteur ne redescend jamais, donc un
 *    devis supprimé ne libère pas son numéro (plus de réutilisation → plus de
 *    violation d'unicité qui bloquait la création).
 *
 * @param client passer la connexion d'une transaction en cours pour que
 *   l'incrément partage son atomicité ; sinon utilise le pool.
 */
export async function nextQuoteNumber(client?: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const text = `INSERT INTO quote_counters (year, seq) VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE SET seq = quote_counters.seq + 1
     RETURNING seq`;
  const res = client ? await client.query(text, [year]) : await rawQuery(text, [year]);
  const seq: number = res.rows[0].seq;
  return `DEV-${year}-${String(seq).padStart(4, '0')}`;
}
