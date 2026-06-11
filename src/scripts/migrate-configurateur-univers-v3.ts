import { Pool } from 'pg';

/**
 * Configurateur v3 — catalogue « pro » :
 * - îlot central (cuisine), habillage de hotte, caisson bas ouvert
 * - meuble à chaussures et banc de rangement (dressing)
 * - quincaillerie sur tous les modules concernés : fermeture amortie (charnières à frein),
 *   coulisses douces (tiroirs), choix de poignées (barre / bouton / sans poignée push)
 * - colonne projects.share_token (lien de partage)
 * Transformations idempotentes.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

type Opt = { slug: string; nom: string; type: string; groupe?: string; prix: number; max?: number; defaut: number };
type Mod = { slug: string; zone: string; options: Opt[]; [k: string]: unknown };

const D = (largeur: number, hauteur: number, profondeur: number) => ({ largeur, hauteur, profondeur });

const POIGNEES: Opt[] = [
  { slug: 'poignee_barre', nom: 'Poignées barre', type: 'choix', groupe: 'poignee', prix: 0, defaut: 1 },
  { slug: 'poignee_bouton', nom: 'Poignées bouton', type: 'choix', groupe: 'poignee', prix: 0, defaut: 0 },
  { slug: 'poignee_invisible', nom: 'Sans poignée (ouverture push)', type: 'choix', groupe: 'poignee', prix: 30, defaut: 0 },
];
const AMORTIE: Opt = { slug: 'fermeture_amortie', nom: 'Fermeture amortie (charnières à frein)', type: 'toggle', prix: 18, defaut: 1 };
const COULISSES: Opt = { slug: 'coulisses_douces', nom: 'Coulisses à fermeture douce', type: 'toggle', prix: 22, defaut: 1 };
const LED_INT: Opt = { slug: 'led_interieur', nom: 'Éclairage LED intérieur', type: 'toggle', prix: 45, defaut: 0 };

const NEW_MODULES: Mod[] = [
  {
    slug: 'ilot_central', nom: 'Îlot central', univers: ['cuisine'], zone: 'ilot',
    description: 'Îlot indépendant au centre de la pièce : rangements, tiroirs et plan de travail.',
    dimensionsDefault: D(1600, 900, 1000), dimensionsMin: D(900, 750, 600), dimensionsMax: D(3000, 1100, 1400),
    prixBase: 450, actif: true, sortOrder: 8,
    options: [
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 45, max: 6, defaut: 2 },
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 35, max: 4, defaut: 2 },
      { slug: 'etagere', nom: 'Niches ouvertes côté assise', type: 'compteur', prix: 18, max: 3, defaut: 0 },
    ],
  },
  {
    slug: 'meuble_hotte', nom: 'Habillage de hotte', univers: ['cuisine'], zone: 'haut',
    description: 'Meuble haut d\'habillage pour hotte aspirante intégrée.',
    dimensionsDefault: D(600, 500, 350), dimensionsMin: D(450, 350, 300), dimensionsMax: D(1200, 800, 450),
    prixBase: 130, actif: true, sortOrder: 9,
    options: [
      { slug: 'eclairage_sous_meuble', nom: 'Éclairage LED sous meuble', type: 'toggle', prix: 35, defaut: 0 },
    ],
  },
  {
    slug: 'caisson_bas_ouvert', nom: 'Caisson bas ouvert', univers: ['cuisine'], zone: 'bas',
    description: 'Niches ouvertes : livres de cuisine, paniers, bouteilles.',
    dimensionsDefault: D(400, 720, 580), dimensionsMin: D(200, 600, 300), dimensionsMax: D(900, 900, 700),
    prixBase: 140, actif: true, sortOrder: 10,
    options: [
      { slug: 'etagere', nom: 'Étagères', type: 'compteur', prix: 15, max: 4, defaut: 2 },
    ],
  },
  {
    slug: 'meuble_chaussures', nom: 'Meuble à chaussures', univers: ['dressing'], zone: 'bas',
    description: 'Rangement bas à étagères inclinées pour chaussures.',
    dimensionsDefault: D(800, 600, 350), dimensionsMin: D(400, 400, 250), dimensionsMax: D(1500, 900, 500),
    prixBase: 160, actif: true, sortOrder: 13,
    options: [
      { slug: 'etagere', nom: 'Étagères inclinées', type: 'compteur', prix: 18, max: 4, defaut: 3 },
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 35, max: 2, defaut: 0 },
    ],
  },
  {
    slug: 'banc_rangement', nom: 'Banc de rangement', univers: ['dressing'], zone: 'bas',
    description: 'Assise avec rangements en dessous, idéal au centre du dressing.',
    dimensionsDefault: D(1000, 450, 450), dimensionsMin: D(600, 350, 350), dimensionsMax: D(1800, 600, 600),
    prixBase: 190, actif: true, sortOrder: 14,
    options: [
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 45, max: 3, defaut: 2 },
      { slug: 'etagere', nom: 'Niches ouvertes', type: 'compteur', prix: 15, max: 2, defaut: 0 },
    ],
  },
];

async function migrate() {
  const { rows } = await pool.query(`SELECT key, value FROM configurateur_settings WHERE key = 'module_types'`);
  const moduleTypes: Mod[] = rows[0]?.value || [];
  const log: string[] = [];

  for (const mod of NEW_MODULES) {
    if (!moduleTypes.some((m) => m.slug === mod.slug)) {
      moduleTypes.push(mod);
      log.push(`+ module ${mod.slug}`);
    }
  }

  // Quincaillerie : ajoutée partout où elle a du sens, sans dupliquer
  for (const mod of moduleTypes) {
    const has = (slug: string) => mod.options.some((o) => o.slug === slug);
    const hasPortes = mod.options.some((o) => ['porte', 'porte_basse', 'porte_haute', 'porte_pleine'].includes(o.slug));
    const hasTiroirs = has('tiroir');

    if (hasPortes && !has('fermeture_amortie')) {
      mod.options.push({ ...AMORTIE });
      log.push(`~ ${mod.slug} : fermeture amortie`);
    }
    if (hasTiroirs && !has('coulisses_douces')) {
      mod.options.push({ ...COULISSES });
      log.push(`~ ${mod.slug} : coulisses douces`);
    }
    if ((hasPortes || hasTiroirs) && !has('poignee_barre') && mod.slug !== 'miroir_rangement') {
      mod.options.push(...POIGNEES.map((o) => ({ ...o })));
      log.push(`~ ${mod.slug} : choix de poignées`);
    }
    if (['module_penderie', 'colonne_tiroirs', 'module_etageres', 'colonne_sdb'].includes(mod.slug) && !has('led_interieur')) {
      mod.options.push({ ...LED_INT });
      log.push(`~ ${mod.slug} : LED intérieur`);
    }
  }

  await pool.query(`UPDATE configurateur_settings SET value = $1, updated_at = NOW() WHERE key = 'module_types'`, [JSON.stringify(moduleTypes)]);

  // Lien de partage des projets
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE`);
  log.push('~ projects.share_token');

  console.log(log.length ? log.join('\n') : '· rien à faire');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
