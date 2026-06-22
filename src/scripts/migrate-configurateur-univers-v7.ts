import { Pool } from 'pg';

/**
 * Configurateur v8 — élargissement du catalogue et réglages par composant :
 * - 13 nouveaux modules : colonne four, meuble haut vitré, niche ouverte, range-bouteilles,
 *   colonne lave-linge, îlot de dressing, coiffeuse, caisson de bureau, fileur, joue de
 *   finition + 3 éléments d'environnement non chiffrés (fenêtre, porte, radiateur).
 * - option « séparateur vertical » sur les modules de rangement ouverts ;
 * - groupe « socle » (plinthe / pieds métal / pieds bois) sur les modules posés ;
 * - colonne projects.is_template pour les modèles de compositions proposés au démarrage.
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
    slug: 'colonne_four',
    nom: 'Colonne four',
    univers: ['cuisine'],
    zone: 'colonne',
    description: 'Four encastré à hauteur d’usage, micro-ondes optionnel, façades assorties.',
    dimensionsDefault: { largeur: 600, hauteur: 2200, profondeur: 580 },
    dimensionsMin: { largeur: 450, hauteur: 1800, profondeur: 450 },
    dimensionsMax: { largeur: 800, hauteur: 2600, profondeur: 700 },
    prixBase: 240,
    options: [
      { slug: 'niche_micro_ondes', nom: 'Niche micro-ondes', type: 'toggle', prix: 60, defaut: 0 },
      { slug: 'fermeture_amortie', nom: 'Fermeture amortie', type: 'toggle', prix: 25, defaut: 0 },
    ],
    actif: true,
    sortOrder: 15,
  },
  {
    slug: 'meuble_haut_vitre',
    nom: 'Meuble haut vitré',
    univers: ['cuisine', 'meuble'],
    zone: 'haut',
    description: 'Vaisselier suspendu à portes vitrées : l’intérieur reste visible.',
    dimensionsDefault: { largeur: 800, hauteur: 720, profondeur: 350 },
    dimensionsMin: { largeur: 300, hauteur: 300, profondeur: 250 },
    dimensionsMax: { largeur: 1200, hauteur: 1000, profondeur: 450 },
    prixBase: 150,
    posYDefaut: 1400,
    options: [
      { slug: 'porte', nom: 'Portes vitrées', type: 'compteur', prix: 85, max: 2, defaut: 2 },
      { slug: 'etagere', nom: 'Étagères', type: 'compteur', prix: 25, max: 3, defaut: 1 },
      { slug: 'led_interieur', nom: 'LED intérieure', type: 'toggle', prix: 45, defaut: 0 },
      { slug: 'fermeture_amortie', nom: 'Fermeture amortie', type: 'toggle', prix: 25, defaut: 0 },
    ],
    actif: true,
    sortOrder: 16,
  },
  {
    slug: 'niche_ouverte',
    nom: 'Niche ouverte',
    univers: ['cuisine', 'meuble'],
    zone: 'haut',
    description: 'Caisson ouvert décoratif, entre deux meubles hauts ou seul.',
    dimensionsDefault: { largeur: 600, hauteur: 360, profondeur: 350 },
    dimensionsMin: { largeur: 200, hauteur: 200, profondeur: 200 },
    dimensionsMax: { largeur: 1600, hauteur: 1200, profondeur: 450 },
    prixBase: 90,
    posYDefaut: 1400,
    options: [
      { slug: 'etagere', nom: 'Étagères', type: 'compteur', prix: 25, max: 2, defaut: 0 },
      { slug: 'separateur_vertical', nom: 'Séparateurs verticaux', type: 'compteur', prix: 30, max: 3, defaut: 0 },
      { slug: 'led_interieur', nom: 'LED intérieure', type: 'toggle', prix: 45, defaut: 0 },
    ],
    actif: true,
    sortOrder: 17,
  },
  {
    slug: 'range_bouteilles',
    nom: 'Range-bouteilles',
    univers: ['cuisine'],
    zone: 'bas',
    description: 'Casiers croisés pour les bouteilles, intégrés à la rangée basse.',
    dimensionsDefault: { largeur: 600, hauteur: 860, profondeur: 580 },
    dimensionsMin: { largeur: 300, hauteur: 400, profondeur: 350 },
    dimensionsMax: { largeur: 900, hauteur: 1100, profondeur: 700 },
    prixBase: 160,
    options: [],
    actif: true,
    sortOrder: 18,
  },
  {
    slug: 'colonne_lave_linge',
    nom: 'Colonne lave-linge',
    univers: ['salle_de_bain'],
    zone: 'colonne',
    description: 'Lave-linge intégré en partie basse, grand rangement fermé au-dessus.',
    dimensionsDefault: { largeur: 700, hauteur: 2200, profondeur: 650 },
    dimensionsMin: { largeur: 600, hauteur: 1600, profondeur: 600 },
    dimensionsMax: { largeur: 900, hauteur: 2600, profondeur: 750 },
    prixBase: 260,
    options: [
      { slug: 'facade_habillage', nom: 'Façade d’habillage du lave-linge', type: 'toggle', prix: 90, defaut: 0 },
      { slug: 'fermeture_amortie', nom: 'Fermeture amortie', type: 'toggle', prix: 25, defaut: 0 },
    ],
    actif: true,
    sortOrder: 26,
  },
  {
    slug: 'ilot_dressing',
    nom: 'Îlot de dressing',
    univers: ['dressing'],
    zone: 'ilot',
    description: 'Meuble central à tiroirs, dessus utilisable pour préparer ses tenues.',
    dimensionsDefault: { largeur: 1200, hauteur: 950, profondeur: 600 },
    dimensionsMin: { largeur: 800, hauteur: 700, profondeur: 450 },
    dimensionsMax: { largeur: 2400, hauteur: 1100, profondeur: 900 },
    prixBase: 280,
    options: [
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 60, max: 4, defaut: 3 },
      { slug: 'coulisses_douces', nom: 'Coulisses à fermeture douce', type: 'toggle', prix: 30, defaut: 0 },
    ],
    actif: true,
    sortOrder: 27,
  },
  {
    slug: 'coiffeuse',
    nom: 'Coiffeuse',
    univers: ['dressing', 'meuble'],
    zone: 'bas',
    description: 'Plateau, tiroirs et miroir rond : un coin beauté intégré au dressing.',
    dimensionsDefault: { largeur: 1000, hauteur: 750, profondeur: 450 },
    dimensionsMin: { largeur: 700, hauteur: 650, profondeur: 350 },
    dimensionsMax: { largeur: 1500, hauteur: 850, profondeur: 600 },
    prixBase: 220,
    options: [
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 55, max: 3, defaut: 2 },
      { slug: 'coulisses_douces', nom: 'Coulisses à fermeture douce', type: 'toggle', prix: 30, defaut: 0 },
    ],
    actif: true,
    sortOrder: 28,
  },
  {
    slug: 'caisson_bureau',
    nom: 'Caisson de bureau',
    univers: ['meuble'],
    zone: 'bas',
    description: 'Petit caisson à tiroirs, à glisser sous un plan de travail ou un bureau.',
    dimensionsDefault: { largeur: 420, hauteur: 580, profondeur: 520 },
    dimensionsMin: { largeur: 300, hauteur: 400, profondeur: 400 },
    dimensionsMax: { largeur: 600, hauteur: 750, profondeur: 650 },
    prixBase: 130,
    options: [
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 45, max: 4, defaut: 3 },
      { slug: 'coulisses_douces', nom: 'Coulisses à fermeture douce', type: 'toggle', prix: 30, defaut: 0 },
    ],
    actif: true,
    sortOrder: 45,
  },
  {
    slug: 'fileur',
    nom: 'Fileur de finition',
    univers: TOUS,
    zone: 'bas',
    description: 'Bande de finition qui comble l’écart entre un meuble et le mur.',
    dimensionsDefault: { largeur: 100, hauteur: 720, profondeur: 580 },
    dimensionsMin: { largeur: 30, hauteur: 100, profondeur: 100 },
    dimensionsMax: { largeur: 300, hauteur: 2600, profondeur: 800 },
    prixBase: 35,
    options: [],
    actif: true,
    sortOrder: 46,
  },
  {
    slug: 'joue_finition',
    nom: 'Joue de finition',
    univers: TOUS,
    zone: 'haut',
    description: 'Panneau latéral d’habillage, posable librement contre un caisson.',
    dimensionsDefault: { largeur: 25, hauteur: 720, profondeur: 580 },
    dimensionsMin: { largeur: 18, hauteur: 200, profondeur: 200 },
    dimensionsMax: { largeur: 60, hauteur: 2600, profondeur: 900 },
    prixBase: 45,
    posYDefaut: 100,
    options: [],
    actif: true,
    sortOrder: 47,
  },
  /* Éléments d'environnement : situent la pièce sur le plan, jamais chiffrés */
  {
    slug: 'fenetre',
    nom: 'Fenêtre (environnement)',
    univers: TOUS,
    zone: 'haut',
    description: 'Situe une fenêtre sur le plan pour composer autour. Jamais comptée dans le devis.',
    dimensionsDefault: { largeur: 1200, hauteur: 1250, profondeur: 100 },
    dimensionsMin: { largeur: 400, hauteur: 400, profondeur: 60 },
    dimensionsMax: { largeur: 3000, hauteur: 2400, profondeur: 200 },
    prixBase: 0,
    posYDefaut: 900,
    decor: true,
    options: [],
    actif: true,
    sortOrder: 60,
  },
  {
    slug: 'porte_piece',
    nom: 'Porte de la pièce (environnement)',
    univers: TOUS,
    zone: 'bas',
    description: 'Situe une porte sur le plan : elle réserve son passage dans le linéaire.',
    dimensionsDefault: { largeur: 900, hauteur: 2100, profondeur: 60 },
    dimensionsMin: { largeur: 600, hauteur: 1900, profondeur: 40 },
    dimensionsMax: { largeur: 1400, hauteur: 2400, profondeur: 120 },
    prixBase: 0,
    decor: true,
    options: [],
    actif: true,
    sortOrder: 61,
  },
  {
    slug: 'radiateur',
    nom: 'Radiateur (environnement)',
    univers: TOUS,
    zone: 'haut',
    description: 'Situe un radiateur sur le plan pour éviter de le recouvrir.',
    dimensionsDefault: { largeur: 800, hauteur: 600, profondeur: 100 },
    dimensionsMin: { largeur: 300, hauteur: 200, profondeur: 60 },
    dimensionsMax: { largeur: 2000, hauteur: 1800, profondeur: 220 },
    prixBase: 0,
    posYDefaut: 150,
    decor: true,
    options: [],
    actif: true,
    sortOrder: 62,
  },
];

/** Modules de rangement ouverts qui gagnent l'option « séparateur vertical » */
const SEPARATEUR_SLUGS = [
  'bibliotheque',
  'meuble_rangement',
  'module_etageres',
  'caisson_bas_ouvert',
  'banc_rangement',
  'etagere_murale',
  'meuble_tv',
];

const SEPARATEUR_OPTION = { slug: 'separateur_vertical', nom: 'Séparateurs verticaux', type: 'compteur', prix: 35, max: 4, defaut: 0 };

const SOCLE_OPTIONS = [
  { slug: 'socle_plinthe', nom: 'Plinthe', type: 'choix', groupe: 'socle', prix: 0, defaut: 1 },
  { slug: 'socle_pieds_metal', nom: 'Pieds métal', type: 'choix', groupe: 'socle', prix: 40, defaut: 0 },
  { slug: 'socle_pieds_bois', nom: 'Pieds bois', type: 'choix', groupe: 'socle', prix: 50, defaut: 0 },
];

/** Modules posés qui ne reçoivent PAS le choix de socle (électroménager, décor…) */
const SOCLE_EXCLUS = ['module_lave_vaisselle', 'porte_piece', 'range_bouteilles'];

type ModuleType = {
  slug: string;
  zone: string;
  decor?: boolean;
  options: { slug: string; [k: string]: unknown }[];
  [k: string]: unknown;
};

async function migrate() {
  // 1. Colonne is_template pour les modèles de compositions
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE`);
  console.log('✓ colonne projects.is_template');

  const { rows } = await pool.query(`SELECT value FROM configurateur_settings WHERE key = 'module_types'`);
  const moduleTypes: ModuleType[] = rows[0]?.value || [];

  // 2. Nouveaux modules
  for (const module of NEW_MODULES) {
    if (!moduleTypes.some((m) => m.slug === module.slug)) {
      moduleTypes.push(module as unknown as ModuleType);
      console.log(`+ module ${module.slug}`);
    } else {
      console.log(`· module ${module.slug} déjà présent`);
    }
  }

  // 3. Option « séparateur vertical » sur les rangements ouverts
  for (const m of moduleTypes) {
    if (!SEPARATEUR_SLUGS.includes(m.slug)) continue;
    if (m.options.some((o) => o.slug === SEPARATEUR_OPTION.slug)) continue;
    m.options.push({ ...SEPARATEUR_OPTION });
    console.log(`+ separateur_vertical sur ${m.slug}`);
  }

  // 4. Choix de socle (plinthe / pieds) sur les modules posés et les îlots
  for (const m of moduleTypes) {
    if (!['bas', 'ilot'].includes(m.zone) || m.decor || SOCLE_EXCLUS.includes(m.slug)) continue;
    if (m.options.some((o) => o.slug === 'socle_plinthe')) continue;
    m.options.push(...SOCLE_OPTIONS.map((o) => ({ ...o })));
    console.log(`+ choix de socle sur ${m.slug}`);
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
