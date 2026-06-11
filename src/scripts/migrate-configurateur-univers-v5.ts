import { Pool } from 'pg';

/**
 * Configurateur v5 — l'univers « Meuble à l'unité » rejoint le moteur de composition
 * (l'ancien outil mono-meuble ne sert plus qu'aux anciens projets enregistrés).
 * Modules : meuble de rangement, bibliothèque, meuble TV, bureau, étagère murale.
 * Idempotent.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const D = (largeur: number, hauteur: number, profondeur: number) => ({ largeur, hauteur, profondeur });

/* Packs d'options communs (mêmes slugs que le reste du catalogue → rendus 2D/3D garantis) */
const POIGNEES = [
  { slug: 'poignee_barre', nom: 'Poignées barre', type: 'choix', groupe: 'poignee', prix: 0, defaut: 1 },
  { slug: 'poignee_bouton', nom: 'Poignées bouton', type: 'choix', groupe: 'poignee', prix: 0, defaut: 0 },
  { slug: 'poignee_invisible', nom: 'Sans poignée (ouverture push)', type: 'choix', groupe: 'poignee', prix: 30, defaut: 0 },
];
const SENS = [
  { slug: 'ouverture_droite', nom: 'Ouverture à droite', type: 'choix', groupe: 'sens_ouverture', prix: 0, defaut: 1 },
  { slug: 'ouverture_gauche', nom: 'Ouverture à gauche', type: 'choix', groupe: 'sens_ouverture', prix: 0, defaut: 0 },
];
const AMORTIE = { slug: 'fermeture_amortie', nom: 'Fermeture amortie (charnières à frein)', type: 'toggle', prix: 18, defaut: 1 };
const COULISSES = { slug: 'coulisses_douces', nom: 'Coulisses à fermeture douce', type: 'toggle', prix: 22, defaut: 1 };
const LED_INT = { slug: 'led_interieur', nom: 'Éclairage LED intérieur', type: 'toggle', prix: 45, defaut: 0 };

const UNIVERS_MEUBLE = {
  slug: 'meuble',
  nom: "Meuble à l'unité",
  description: 'Bibliothèque, meuble TV, bureau, étagère murale… un meuble unique ou un petit agencement, configuré en détail.',
  actif: true,
  sortOrder: 4,
  starterModules: ['meuble_rangement'],
  planTravail: { disponible: false, prixMl: 0 },
};

const MODULES = [
  {
    slug: 'meuble_rangement', nom: 'Meuble de rangement', univers: ['meuble'], zone: 'colonne',
    description: 'Le meuble sur mesure polyvalent : étagères, portes et tiroirs à la carte.',
    dimensionsDefault: D(800, 1800, 450), dimensionsMin: D(400, 600, 250), dimensionsMax: D(2400, 2700, 800),
    prixBase: 220, actif: true, sortOrder: 30,
    options: [
      { slug: 'etagere', nom: 'Étagères', type: 'compteur', prix: 18, max: 8, defaut: 3 },
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 40, max: 2, defaut: 0 },
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 45, max: 4, defaut: 0 },
      { ...AMORTIE }, { ...COULISSES }, { ...LED_INT }, ...POIGNEES.map((o) => ({ ...o })), ...SENS.map((o) => ({ ...o })),
    ],
  },
  {
    slug: 'bibliotheque', nom: 'Bibliothèque', univers: ['meuble'], zone: 'colonne',
    description: 'Étagères toute hauteur, portes en partie basse en option.',
    dimensionsDefault: D(900, 2200, 350), dimensionsMin: D(400, 1000, 250), dimensionsMax: D(2400, 2700, 500),
    prixBase: 260, actif: true, sortOrder: 31,
    options: [
      { slug: 'etagere', nom: 'Étagères', type: 'compteur', prix: 18, max: 8, defaut: 5 },
      { slug: 'porte_basse', nom: 'Portes partie basse', type: 'compteur', prix: 40, max: 2, defaut: 0 },
      { ...AMORTIE }, { ...LED_INT }, ...POIGNEES.map((o) => ({ ...o })), ...SENS.map((o) => ({ ...o })),
    ],
  },
  {
    slug: 'meuble_tv', nom: 'Meuble TV', univers: ['meuble'], zone: 'bas',
    description: 'Banc TV bas, posé ou suspendu, tiroirs et niches.',
    dimensionsDefault: D(1600, 450, 450), dimensionsMin: D(800, 300, 300), dimensionsMax: D(2400, 700, 600),
    prixBase: 240, actif: true, sortOrder: 32,
    options: [
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 45, max: 3, defaut: 2 },
      { slug: 'porte', nom: 'Portes', type: 'compteur', prix: 40, max: 2, defaut: 0 },
      { slug: 'etagere', nom: 'Niches ouvertes', type: 'compteur', prix: 15, max: 2, defaut: 1 },
      { slug: 'suspendu', nom: 'Pose suspendue (murale)', type: 'toggle', prix: 35, defaut: 0 },
      { slug: 'led', nom: 'Éclairage LED sous le meuble', type: 'toggle', prix: 45, defaut: 0 },
      { ...AMORTIE }, { ...COULISSES }, ...POIGNEES.map((o) => ({ ...o })), ...SENS.map((o) => ({ ...o })),
    ],
  },
  {
    slug: 'bureau', nom: 'Bureau', univers: ['meuble'], zone: 'bas',
    description: 'Plateau de travail sur caisson : tiroirs et niche de rangement.',
    dimensionsDefault: D(1400, 750, 600), dimensionsMin: D(900, 650, 450), dimensionsMax: D(2200, 800, 800),
    prixBase: 280, actif: true, sortOrder: 33,
    options: [
      { slug: 'tiroir', nom: 'Tiroirs', type: 'compteur', prix: 45, max: 3, defaut: 2 },
      { slug: 'etagere', nom: 'Niche de rangement', type: 'compteur', prix: 15, max: 1, defaut: 0 },
      { ...COULISSES }, ...POIGNEES.map((o) => ({ ...o })),
    ],
  },
  {
    slug: 'etagere_murale', nom: 'Étagère murale', univers: ['meuble'], zone: 'haut',
    description: 'Étagères ouvertes fixées au mur, positionnables librement.',
    dimensionsDefault: D(900, 350, 250), dimensionsMin: D(300, 200, 150), dimensionsMax: D(2000, 1200, 400),
    prixBase: 90, actif: true, sortOrder: 34,
    options: [
      { slug: 'etagere', nom: 'Étagères intermédiaires', type: 'compteur', prix: 15, max: 4, defaut: 1 },
    ],
  },
];

async function migrate() {
  const { rows } = await pool.query(`SELECT key, value FROM configurateur_settings WHERE key IN ('univers', 'module_types')`);
  const univers: { slug: string }[] = rows.find((r) => r.key === 'univers')?.value || [];
  const moduleTypes: { slug: string }[] = rows.find((r) => r.key === 'module_types')?.value || [];
  const log: string[] = [];

  if (!univers.some((u) => u.slug === 'meuble')) {
    univers.push(UNIVERS_MEUBLE);
    log.push("+ univers meuble (Meuble à l'unité)");
  }
  for (const mod of MODULES) {
    if (!moduleTypes.some((m) => m.slug === mod.slug)) {
      moduleTypes.push(mod as unknown as { slug: string });
      log.push(`+ module ${mod.slug}`);
    }
  }

  await pool.query(`UPDATE configurateur_settings SET value = $1, updated_at = NOW() WHERE key = 'univers'`, [JSON.stringify(univers)]);
  await pool.query(`UPDATE configurateur_settings SET value = $1, updated_at = NOW() WHERE key = 'module_types'`, [JSON.stringify(moduleTypes)]);
  console.log(log.length ? log.join('\n') : '· rien à faire');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
