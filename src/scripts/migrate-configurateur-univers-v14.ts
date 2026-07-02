import { Pool } from 'pg';

/**
 * Configurateur v14 — penderie : sélecteur de disposition + libellés de portes clarifiés.
 *
 * 1. module_penderie : remplace le compteur « tringle » et les choix penderie_haut/bas
 *    par un unique groupe de choix « Disposition de la penderie » :
 *      simple haut (défaut) · simple bas · double (haut+bas) · 2 hautes · 2 basses.
 * 2. Tous modules : renomme les options de portes pour lever la confusion
 *    (« Porte haute » ≠ « des portes en haut »).
 *
 * Idempotent. Les données projets restent lisibles : les slugs conservés ne changent pas.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}
const pool = new Pool({ connectionString: DATABASE_URL });

type Opt = { slug: string; nom: string; type: 'compteur' | 'toggle' | 'choix'; groupe?: string; prix: number; max?: number; defaut: number };
type ModuleType = { slug: string; options: Opt[]; [k: string]: unknown };

const DISPOSITION: Opt[] = [
  { slug: 'penderie_simple_haut', nom: 'Simple — tringle en haut', type: 'choix', groupe: 'penderie_disposition', prix: 0, defaut: 1 },
  { slug: 'penderie_simple_bas', nom: 'Simple — tringle en bas', type: 'choix', groupe: 'penderie_disposition', prix: 0, defaut: 0 },
  { slug: 'penderie_double', nom: 'Double (une haute + une basse)', type: 'choix', groupe: 'penderie_disposition', prix: 0, defaut: 0 },
  { slug: 'penderie_double_haut', nom: 'Deux tringles en haut', type: 'choix', groupe: 'penderie_disposition', prix: 0, defaut: 0 },
  { slug: 'penderie_double_bas', nom: 'Deux tringles en bas', type: 'choix', groupe: 'penderie_disposition', prix: 0, defaut: 0 },
];

/** Libellés de portes clarifiés (slug → nom) */
const DOOR_LABELS: Record<string, string> = {
  porte: 'Portes',
  porte_pleine: 'Portes (toute la hauteur)',
  porte_haute: 'Portes en partie haute',
  porte_basse: 'Portes en partie basse',
};

/** Options retirées de la penderie (remplacées par le groupe disposition) */
const PENDERIE_REMOVE = ['tringle', 'penderie_haut', 'penderie_bas'];

async function migrate() {
  const { rows } = await pool.query(`SELECT value FROM configurateur_settings WHERE key = 'module_types'`);
  const moduleTypes: ModuleType[] = rows[0]?.value || [];
  if (moduleTypes.length === 0) {
    console.error('! aucun module_types en base');
    await pool.end();
    return;
  }

  for (const m of moduleTypes) {
    m.options = m.options || [];

    // 1. Disposition de la penderie
    if (m.slug === 'module_penderie') {
      // Point d'insertion = position de l'ancien compteur tringle
      const at = m.options.findIndex((o) => o.slug === 'tringle');
      m.options = m.options.filter((o) => !PENDERIE_REMOVE.includes(o.slug));
      const insert = at >= 0 ? Math.min(at, m.options.length) : 0;
      if (!m.options.some((o) => o.groupe === 'penderie_disposition')) {
        m.options.splice(insert, 0, ...DISPOSITION.map((o) => ({ ...o })));
        console.log('+ groupe « disposition de la penderie » sur module_penderie');
      }
    }

    // 2. Libellés de portes
    for (const o of m.options) {
      if (DOOR_LABELS[o.slug] && o.nom !== DOOR_LABELS[o.slug]) {
        o.nom = DOOR_LABELS[o.slug];
        console.log(`· ${m.slug} : « ${o.slug} » → « ${o.nom} »`);
      }
    }
  }

  await pool.query(`UPDATE configurateur_settings SET value = $1, updated_at = NOW() WHERE key = 'module_types'`, [
    JSON.stringify(moduleTypes),
  ]);
  console.log(`✓ module_types mis à jour (${moduleTypes.length} modules)`);
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
