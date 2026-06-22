import { Pool } from 'pg';

/**
 * Configurateur v9 — retours en L, frigo interactif, plan de travail maîtrisé :
 * - colonne_frigo : choix du sens d'ouverture des portes (gauche/droite) ;
 * - option « Sans plan de travail au-dessus » sur les modules bas/îlot des univers
 *   cuisine et salle de bain (le plan automatique les enjambe alors).
 * Le champ `mur` (retour gauche/droit) vit dans la config des projets, pas en base.
 * Idempotent : relançable sans doublon.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const SENS_OPTIONS = [
  { slug: 'ouverture_droite', nom: 'Charnières à droite', type: 'choix', groupe: 'sens_ouverture', prix: 0, defaut: 1 },
  { slug: 'ouverture_gauche', nom: 'Charnières à gauche', type: 'choix', groupe: 'sens_ouverture', prix: 0, defaut: 0 },
];

const SANS_PLAN_OPTION = { slug: 'sans_plan', nom: 'Sans plan de travail au-dessus', type: 'toggle', prix: 0, defaut: 0 };

type ModuleType = {
  slug: string;
  zone: string;
  decor?: boolean;
  univers: string[];
  options: { slug: string; [k: string]: unknown }[];
};

async function migrate() {
  const { rows } = await pool.query(`SELECT value FROM configurateur_settings WHERE key = 'module_types'`);
  const moduleTypes: ModuleType[] = rows[0]?.value || [];

  // 1. Sens d'ouverture des portes du réfrigérateur
  const frigo = moduleTypes.find((m) => m.slug === 'colonne_frigo');
  if (frigo && !frigo.options.some((o) => o.slug === 'ouverture_gauche')) {
    frigo.options.push(...SENS_OPTIONS.map((o) => ({ ...o })));
    console.log('+ sens d’ouverture sur colonne_frigo');
  } else {
    console.log('· colonne_frigo déjà à jour');
  }

  // 2. « Sans plan de travail » sur les modules bas/îlot des univers avec plan automatique
  for (const m of moduleTypes) {
    if (!['bas', 'ilot'].includes(m.zone) || m.decor) continue;
    if (!m.univers.some((u) => u === 'cuisine' || u === 'salle_de_bain')) continue;
    if (m.options.some((o) => o.slug === 'sans_plan')) continue;
    m.options.push({ ...SANS_PLAN_OPTION });
    console.log(`+ sans_plan sur ${m.slug}`);
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
