import { Pool } from 'pg';

/**
 * Configurateur v10 — objets décoratifs d'environnement (jamais chiffrés) :
 * grande plante en pot, petite plante de plan de travail, vase décoratif, cadre mural.
 * Ils habillent les plans 2D/3D pour aider le client à se projeter.
 * Idempotent : relançable sans doublon.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const TOUS = ['cuisine', 'dressing', 'salle_de_bain', 'meuble'];

const NEW_MODULES = [
  {
    slug: 'plante_pot',
    nom: 'Plante en pot (déco)',
    univers: TOUS,
    zone: 'bas',
    description: 'Une grande plante verte posée au sol, pour habiller la composition. Jamais comptée dans le devis.',
    dimensionsDefault: { largeur: 500, hauteur: 1400, profondeur: 500 },
    dimensionsMin: { largeur: 250, hauteur: 500, profondeur: 250 },
    dimensionsMax: { largeur: 900, hauteur: 2200, profondeur: 900 },
    prixBase: 0,
    decor: true,
    options: [],
    actif: true,
    sortOrder: 63,
  },
  {
    slug: 'petite_plante',
    nom: 'Petite plante (déco)',
    univers: TOUS,
    zone: 'haut',
    description: 'Une petite plante à poser sur un plan de travail ou une étagère. Jamais comptée dans le devis.',
    dimensionsDefault: { largeur: 220, hauteur: 350, profondeur: 220 },
    dimensionsMin: { largeur: 120, hauteur: 150, profondeur: 120 },
    dimensionsMax: { largeur: 450, hauteur: 700, profondeur: 450 },
    prixBase: 0,
    posYDefaut: 900,
    decor: true,
    options: [],
    actif: true,
    sortOrder: 64,
  },
  {
    slug: 'vase_deco',
    nom: 'Vase décoratif (déco)',
    univers: TOUS,
    zone: 'haut',
    description: 'Un vase et ses tiges, à poser où vous voulez. Jamais compté dans le devis.',
    dimensionsDefault: { largeur: 180, hauteur: 420, profondeur: 180 },
    dimensionsMin: { largeur: 100, hauteur: 200, profondeur: 100 },
    dimensionsMax: { largeur: 350, hauteur: 800, profondeur: 350 },
    prixBase: 0,
    posYDefaut: 900,
    decor: true,
    options: [],
    actif: true,
    sortOrder: 65,
  },
  {
    slug: 'cadre_mural',
    nom: 'Cadre mural (déco)',
    univers: TOUS,
    zone: 'haut',
    description: 'Un tableau accroché au mur, pour situer la décoration. Jamais compté dans le devis.',
    dimensionsDefault: { largeur: 600, hauteur: 800, profondeur: 40 },
    dimensionsMin: { largeur: 200, hauteur: 200, profondeur: 20 },
    dimensionsMax: { largeur: 1600, hauteur: 1400, profondeur: 80 },
    prixBase: 0,
    posYDefaut: 1300,
    decor: true,
    options: [],
    actif: true,
    sortOrder: 66,
  },
];

async function migrate() {
  const { rows } = await pool.query(`SELECT value FROM configurateur_settings WHERE key = 'module_types'`);
  const moduleTypes: { slug: string }[] = rows[0]?.value || [];

  for (const module of NEW_MODULES) {
    if (!moduleTypes.some((m) => m.slug === module.slug)) {
      moduleTypes.push(module as unknown as { slug: string });
      console.log(`+ module ${module.slug}`);
    } else {
      console.log(`· module ${module.slug} déjà présent`);
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
