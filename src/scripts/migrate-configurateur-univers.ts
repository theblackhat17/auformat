import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const UNIVERS = [
  {
    slug: 'cuisine',
    nom: 'Cuisine',
    description: 'Caissons bas, meubles hauts, colonnes et plan de travail : composez votre cuisine complète.',
    actif: true,
    sortOrder: 1,
    starterModules: ['caisson_bas_porte', 'caisson_sous_evier', 'caisson_bas_tiroirs', 'colonne_cuisine'],
    planTravail: { disponible: true, prixMl: 120 },
  },
  {
    slug: 'dressing',
    nom: 'Dressing',
    description: 'Penderies, colonnes de tiroirs et étagères : un dressing entier à vos mesures.',
    actif: true,
    sortOrder: 2,
    starterModules: ['module_penderie', 'colonne_tiroirs', 'module_etageres'],
    planTravail: { disponible: false, prixMl: 0 },
  },
  {
    slug: 'salle_de_bain',
    nom: 'Salle de bain',
    description: 'Meuble vasque, colonne de rangement et miroir : votre salle de bain sur mesure.',
    actif: true,
    sortOrder: 3,
    starterModules: ['meuble_vasque', 'colonne_sdb'],
    planTravail: { disponible: true, prixMl: 140 },
  },
];

const D = (largeur: number, hauteur: number, profondeur: number) => ({ largeur, hauteur, profondeur });

const MODULE_TYPES = [
  /* ── Cuisine ── */
  {
    slug: 'caisson_bas_porte', nom: 'Caisson bas — portes', univers: ['cuisine'], zone: 'bas',
    description: 'Rangement bas avec portes battantes et étagères.',
    dimensionsDefault: D(600, 720, 580), dimensionsMin: D(300, 600, 400), dimensionsMax: D(1200, 900, 700),
    prixBase: 180, actif: true, sortOrder: 1,
    options: [
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 35, max: 2, defaut: 1 },
      { slug: 'etagere', nom: 'Étagères intérieures', type: 'compteur', prix: 15, max: 3, defaut: 1 },
    ],
  },
  {
    slug: 'caisson_bas_tiroirs', nom: 'Caisson bas — tiroirs', univers: ['cuisine'], zone: 'bas',
    description: 'Caisson à tiroirs sur coulisses à frein.',
    dimensionsDefault: D(600, 720, 580), dimensionsMin: D(300, 600, 400), dimensionsMax: D(1200, 900, 700),
    prixBase: 200, actif: true, sortOrder: 2,
    options: [
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 45, max: 5, defaut: 3 },
    ],
  },
  {
    slug: 'caisson_sous_evier', nom: 'Caisson sous-évier', univers: ['cuisine'], zone: 'bas',
    description: 'Caisson adapté à l\'évier, découpe plomberie incluse.',
    dimensionsDefault: D(800, 720, 580), dimensionsMin: D(450, 600, 400), dimensionsMax: D(1200, 900, 700),
    prixBase: 160, actif: true, sortOrder: 3,
    options: [
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 35, max: 2, defaut: 2 },
    ],
  },
  {
    slug: 'meuble_haut', nom: 'Meuble haut', univers: ['cuisine'], zone: 'haut',
    description: 'Rangement mural au-dessus du plan de travail.',
    dimensionsDefault: D(600, 720, 350), dimensionsMin: D(300, 400, 250), dimensionsMax: D(1200, 1000, 450),
    prixBase: 140, actif: true, sortOrder: 4,
    options: [
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 30, max: 2, defaut: 1 },
      { slug: 'etagere', nom: 'Étagères intérieures', type: 'compteur', prix: 12, max: 3, defaut: 2 },
    ],
  },
  {
    slug: 'colonne_cuisine', nom: 'Colonne de cuisine', univers: ['cuisine'], zone: 'colonne',
    description: 'Colonne toute hauteur : rangement ou électroménager encastré.',
    dimensionsDefault: D(600, 2200, 580), dimensionsMin: D(400, 1800, 400), dimensionsMax: D(1200, 2600, 700),
    prixBase: 320, actif: true, sortOrder: 5,
    options: [
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 40, max: 4, defaut: 2 },
      { slug: 'etagere', nom: 'Étagères intérieures', type: 'compteur', prix: 15, max: 6, defaut: 4 },
      { slug: 'niche_electromenager', nom: 'Niche électroménager (four…)', type: 'toggle', prix: 60, defaut: 0 },
    ],
  },
  /* ── Dressing ── */
  {
    slug: 'module_penderie', nom: 'Module penderie', univers: ['dressing'], zone: 'colonne',
    description: 'Penderie avec tringle, étagère haute en option.',
    dimensionsDefault: D(1000, 2400, 600), dimensionsMin: D(500, 1800, 400), dimensionsMax: D(1500, 2700, 700),
    prixBase: 260, actif: true, sortOrder: 10,
    options: [
      { slug: 'tringle', nom: 'Tringles de penderie', type: 'compteur', prix: 25, max: 2, defaut: 1 },
      { slug: 'etagere', nom: 'Étagères', type: 'compteur', prix: 18, max: 3, defaut: 1 },
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 55, max: 2, defaut: 0 },
    ],
  },
  {
    slug: 'colonne_tiroirs', nom: 'Colonne de tiroirs', univers: ['dressing'], zone: 'colonne',
    description: 'Tiroirs sur coulisses + étagères au-dessus.',
    dimensionsDefault: D(600, 2400, 600), dimensionsMin: D(400, 1800, 400), dimensionsMax: D(1200, 2700, 700),
    prixBase: 280, actif: true, sortOrder: 11,
    options: [
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 45, max: 6, defaut: 4 },
      { slug: 'etagere', nom: 'Étagères', type: 'compteur', prix: 18, max: 4, defaut: 2 },
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 55, max: 2, defaut: 0 },
    ],
  },
  {
    slug: 'module_etageres', nom: 'Module étagères', univers: ['dressing'], zone: 'colonne',
    description: 'Niches ouvertes toute hauteur.',
    dimensionsDefault: D(600, 2400, 600), dimensionsMin: D(300, 1800, 300), dimensionsMax: D(1200, 2700, 700),
    prixBase: 220, actif: true, sortOrder: 12,
    options: [
      { slug: 'etagere', nom: 'Étagères', type: 'compteur', prix: 18, max: 8, defaut: 5 },
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 55, max: 2, defaut: 0 },
    ],
  },
  /* ── Salle de bain ── */
  {
    slug: 'meuble_vasque', nom: 'Meuble vasque', univers: ['salle_de_bain'], zone: 'bas',
    description: 'Meuble sous-vasque, tiroirs ou portes.',
    dimensionsDefault: D(800, 550, 500), dimensionsMin: D(450, 400, 350), dimensionsMax: D(1600, 800, 600),
    prixBase: 240, actif: true, sortOrder: 20,
    options: [
      { slug: 'vasque', nom: 'Découpe vasque', type: 'compteur', prix: 45, max: 2, defaut: 1 },
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 45, max: 4, defaut: 2 },
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 35, max: 2, defaut: 0 },
      { slug: 'suspendu', nom: 'Pose suspendue', type: 'toggle', prix: 35, defaut: 1 },
    ],
  },
  {
    slug: 'colonne_sdb', nom: 'Colonne de rangement', univers: ['salle_de_bain'], zone: 'colonne',
    description: 'Colonne fine pour le linge et les produits.',
    dimensionsDefault: D(400, 1600, 350), dimensionsMin: D(300, 1000, 250), dimensionsMax: D(800, 2400, 500),
    prixBase: 180, actif: true, sortOrder: 21,
    options: [
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 35, max: 2, defaut: 1 },
      { slug: 'etagere', nom: 'Étagères', type: 'compteur', prix: 15, max: 5, defaut: 3 },
    ],
  },
  {
    slug: 'miroir_rangement', nom: 'Armoire miroir', univers: ['salle_de_bain'], zone: 'haut',
    description: 'Rangement mural à façade miroir au-dessus de la vasque.',
    dimensionsDefault: D(800, 700, 150), dimensionsMin: D(400, 400, 100), dimensionsMax: D(1600, 900, 250),
    prixBase: 150, actif: true, sortOrder: 22,
    options: [
      { slug: 'porte', nom: 'Portes miroir', type: 'compteur', prix: 45, max: 3, defaut: 2 },
      { slug: 'etagere', nom: 'Étagères', type: 'compteur', prix: 12, max: 3, defaut: 2 },
    ],
  },
];

async function migrate() {
  for (const [key, value] of [
    ['univers', UNIVERS],
    ['module_types', MODULE_TYPES],
  ] as const) {
    const result = await pool.query(
      `INSERT INTO configurateur_settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [key, JSON.stringify(value)]
    );
    console.log(`${result.rowCount ? '✓ créé' : '· déjà présent'} configurateur_settings.${key}`);
  }
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
