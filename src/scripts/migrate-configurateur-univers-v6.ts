import { Pool } from 'pg';

/**
 * Configurateur v6 : module « Plan de travail libre » — une dalle posable librement
 * (hauteur réglable, glissable), avec son propre matériau. Disponible dans tous les
 * univers. Complète le plan de travail automatique posé sur les modules bas.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const MODULE = {
  slug: 'plan_de_travail',
  nom: 'Plan de travail libre',
  univers: ['cuisine', 'salle_de_bain', 'meuble', 'dressing'],
  zone: 'haut', // suspendu = position libre (hauteur et décalage réglables, glissable)
  description: 'Une dalle seule, posable à la hauteur voulue : plan snack, tablette, dessus de meuble existant.',
  dimensionsDefault: { largeur: 2000, hauteur: 40, profondeur: 600 },
  dimensionsMin: { largeur: 200, hauteur: 20, profondeur: 200 },
  dimensionsMax: { largeur: 4000, hauteur: 100, profondeur: 1200 },
  prixBase: 80,
  posYDefaut: 860,
  options: [],
  actif: true,
  sortOrder: 40,
};

async function migrate() {
  const { rows } = await pool.query(`SELECT value FROM configurateur_settings WHERE key = 'module_types'`);
  const moduleTypes: { slug: string }[] = rows[0]?.value || [];
  if (!moduleTypes.some((m) => m.slug === MODULE.slug)) {
    moduleTypes.push(MODULE as unknown as { slug: string });
    await pool.query(`UPDATE configurateur_settings SET value = $1, updated_at = NOW() WHERE key = 'module_types'`, [JSON.stringify(moduleTypes)]);
    console.log('+ module plan_de_travail (libre)');
  } else {
    console.log('· déjà présent');
  }
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
