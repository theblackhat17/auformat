import { Pool } from 'pg';

/**
 * Configurateur v2.1 :
 * - dressing : portes par position (basse / haute / entièreté) + façade coulissante d'ensemble
 * - cuisine : colonne frigo + module lave-vaisselle
 * - salle de bain : LED sur l'armoire miroir
 * - cuisine : éclairage sous meuble haut
 * Transformations idempotentes : n'ajoute que ce qui manque.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

type Opt = { slug: string; nom: string; type: string; prix: number; max?: number; defaut: number };
type Mod = { slug: string; options: Opt[]; [k: string]: unknown };
type Univ = { slug: string; [k: string]: unknown };

const D = (largeur: number, hauteur: number, profondeur: number) => ({ largeur, hauteur, profondeur });

const NEW_MODULES: Mod[] = [
  {
    slug: 'colonne_frigo', nom: 'Colonne réfrigérateur', univers: ['cuisine'], zone: 'colonne',
    description: 'Colonne d\'habillage pour réfrigérateur intégrable.',
    dimensionsDefault: D(700, 2200, 600), dimensionsMin: D(600, 1800, 550), dimensionsMax: D(1000, 2600, 700),
    prixBase: 380, actif: true, sortOrder: 6,
    options: [
      { slug: 'porte', nom: 'Portes d\'habillage', type: 'compteur', prix: 45, max: 2, defaut: 2 },
    ],
  },
  {
    slug: 'module_lave_vaisselle', nom: 'Lave-vaisselle intégré', univers: ['cuisine'], zone: 'bas',
    description: 'Emplacement lave-vaisselle avec façade d\'habillage assortie.',
    dimensionsDefault: D(600, 720, 580), dimensionsMin: D(450, 600, 550), dimensionsMax: D(600, 900, 700),
    prixBase: 120, actif: true, sortOrder: 7,
    options: [
      { slug: 'facade_habillage', nom: 'Façade d\'habillage assortie', type: 'toggle', prix: 55, defaut: 1 },
    ],
  },
];

const DRESSING_DOOR_OPTIONS: Opt[] = [
  { slug: 'porte_basse', nom: 'Portes partie basse', type: 'compteur', prix: 55, max: 2, defaut: 0 },
  { slug: 'porte_haute', nom: 'Portes partie haute', type: 'compteur', prix: 50, max: 2, defaut: 0 },
  { slug: 'porte_pleine', nom: 'Portes toute hauteur', type: 'compteur', prix: 75, max: 2, defaut: 0 },
];

async function migrate() {
  const { rows } = await pool.query(`SELECT key, value FROM configurateur_settings WHERE key IN ('module_types', 'univers')`);
  const moduleTypes: Mod[] = rows.find((r) => r.key === 'module_types')?.value || [];
  const univers: Univ[] = rows.find((r) => r.key === 'univers')?.value || [];

  const log: string[] = [];

  // 1. Nouveaux modules cuisine
  for (const mod of NEW_MODULES) {
    if (!moduleTypes.some((m) => m.slug === mod.slug)) {
      moduleTypes.push(mod);
      log.push(`+ module ${mod.slug}`);
    }
  }

  // 2. Dressing : portes par position (remplace l'option 'porte' unique)
  for (const slug of ['module_penderie', 'colonne_tiroirs', 'module_etageres']) {
    const mod = moduleTypes.find((m) => m.slug === slug);
    if (!mod) continue;
    if (!mod.options.some((o) => o.slug === 'porte_pleine')) {
      mod.options = mod.options.filter((o) => o.slug !== 'porte');
      mod.options.push(...DRESSING_DOOR_OPTIONS.map((o) => ({ ...o })));
      log.push(`~ ${slug} : portes basse/haute/entièreté`);
    }
  }

  // 3. LED sur l'armoire miroir
  const miroir = moduleTypes.find((m) => m.slug === 'miroir_rangement');
  if (miroir && !miroir.options.some((o) => o.slug === 'led')) {
    miroir.options.push({ slug: 'led', nom: 'Éclairage LED intégré', type: 'toggle', prix: 45, defaut: 0 });
    log.push('~ miroir_rangement : option LED');
  }

  // 4. Éclairage sous meuble haut (cuisine)
  const meubleHaut = moduleTypes.find((m) => m.slug === 'meuble_haut');
  if (meubleHaut && !meubleHaut.options.some((o) => o.slug === 'eclairage_sous_meuble')) {
    meubleHaut.options.push({ slug: 'eclairage_sous_meuble', nom: 'Éclairage LED sous meuble', type: 'toggle', prix: 35, defaut: 0 });
    log.push('~ meuble_haut : éclairage sous meuble');
  }

  // 5. Dressing : façade coulissante d'ensemble
  const dressing = univers.find((u) => u.slug === 'dressing');
  if (dressing && !dressing.facadeCoulissante) {
    dressing.facadeCoulissante = { disponible: true, prixMl: 220 };
    log.push('~ univers dressing : façade coulissante (220 €/ml)');
  }

  await pool.query(`UPDATE configurateur_settings SET value = $1, updated_at = NOW() WHERE key = 'module_types'`, [JSON.stringify(moduleTypes)]);
  await pool.query(`UPDATE configurateur_settings SET value = $1, updated_at = NOW() WHERE key = 'univers'`, [JSON.stringify(univers)]);

  console.log(log.length ? log.join('\n') : '· rien à faire (déjà migré)');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
