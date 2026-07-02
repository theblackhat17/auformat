import { Pool } from 'pg';

/**
 * Configurateur v12 — disposition réglable du module penderie.
 *
 * Ajoute deux groupes de choix exclusifs au module penderie :
 *  - Position de la penderie : en haut (défaut) / en bas
 *  - Position des tiroirs    : en bas (défaut) / en haut
 *
 * Le rendu 2D/3D place chaque zone à l'extrémité choisie ; la penderie occupe
 * l'espace libre restant. Idempotent : n'ajoute que les options manquantes.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

type Opt = { slug: string; nom: string; type: 'compteur' | 'toggle' | 'choix'; groupe?: string; prix: number; max?: number; defaut: number };

/** Options de disposition à garantir, insérées après l'option « tiroir » */
const NEW_OPTIONS: Opt[] = [
  { slug: 'penderie_haut', nom: 'Penderie en haut', type: 'choix', groupe: 'penderie_position', prix: 0, defaut: 1 },
  { slug: 'penderie_bas', nom: 'Penderie en bas', type: 'choix', groupe: 'penderie_position', prix: 0, defaut: 0 },
  { slug: 'tiroirs_bas', nom: 'Tiroirs en bas', type: 'choix', groupe: 'tiroirs_position', prix: 0, defaut: 1 },
  { slug: 'tiroirs_haut', nom: 'Tiroirs en haut', type: 'choix', groupe: 'tiroirs_position', prix: 0, defaut: 0 },
];

async function migrate() {
  const { rows } = await pool.query(`SELECT value FROM configurateur_settings WHERE key = 'module_types'`);
  const moduleTypes: { slug: string; options: Opt[] }[] = rows[0]?.value || [];

  const penderie = moduleTypes.find((m) => m.slug === 'module_penderie');
  if (!penderie) {
    console.error('! module_penderie introuvable — rien à faire');
    await pool.end();
    return;
  }
  penderie.options = penderie.options || [];

  // Point d'insertion : juste après l'option « tiroir »
  let insertAt = penderie.options.findIndex((o) => o.slug === 'tiroir');
  insertAt = insertAt >= 0 ? insertAt + 1 : penderie.options.length;

  for (const opt of NEW_OPTIONS) {
    if (penderie.options.some((o) => o.slug === opt.slug)) {
      console.log(`· option ${opt.slug} déjà présente`);
      continue;
    }
    penderie.options.splice(insertAt, 0, opt);
    insertAt++;
    console.log(`+ option ${opt.slug} ajoutée à module_penderie`);
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
