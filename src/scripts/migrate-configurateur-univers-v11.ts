import { Pool } from 'pg';

/**
 * Configurateur v11 — façade coulissante disponible au-delà du seul dressing.
 *
 * - Garantit que chaque univers possède une config `facadeCoulissante`
 *   (afin que les réglages apparaissent dans la console admin).
 * - L'active (`disponible: true`) sur le dressing, le meuble et la salle de bain.
 * - Ajoute la borne `maxVantaux` (défaut 3) : nombre maxi de portes coulissantes
 *   que le client peut choisir (1 à maxVantaux). Modifiable ensuite côté admin.
 *
 * Idempotent : ne réécrit pas une valeur déjà personnalisée (prix, disponibilité).
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const DEFAULT_MAX_VANTAUX = 3;
const DEFAULT_PRIX_ML = 220;
/** Univers où la façade coulissante est proposée par défaut */
const ACTIFS = new Set(['dressing', 'meuble', 'salle_de_bain']);

type Univers = {
  slug: string;
  facadeCoulissante?: { disponible: boolean; prixMl: number; maxVantaux?: number };
};

async function migrate() {
  const { rows } = await pool.query(`SELECT value FROM configurateur_settings WHERE key = 'univers'`);
  const univers: Univers[] = rows[0]?.value || [];

  for (const u of univers) {
    const fc = u.facadeCoulissante;
    if (!fc) {
      u.facadeCoulissante = {
        disponible: ACTIFS.has(u.slug),
        prixMl: DEFAULT_PRIX_ML,
        maxVantaux: DEFAULT_MAX_VANTAUX,
      };
      console.log(`+ ${u.slug} : façade coulissante ajoutée (disponible=${ACTIFS.has(u.slug)}, max ${DEFAULT_MAX_VANTAUX})`);
    } else {
      // Conserve la disponibilité/prix existants ; ne complète que maxVantaux
      if (fc.maxVantaux == null) {
        fc.maxVantaux = DEFAULT_MAX_VANTAUX;
        console.log(`~ ${u.slug} : maxVantaux fixé à ${DEFAULT_MAX_VANTAUX}`);
      } else {
        console.log(`· ${u.slug} : déjà configuré (max ${fc.maxVantaux})`);
      }
    }
  }

  await pool.query(`UPDATE configurateur_settings SET value = $1, updated_at = NOW() WHERE key = 'univers'`, [
    JSON.stringify(univers),
  ]);
  console.log(`✓ univers mis à jour (${univers.length})`);

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
