import { Pool } from 'pg';

/**
 * Configurateur v13 — bornes de dimensions homogènes + socle partout.
 *
 * 1. Chaque module : dimensionsMin = 100 mm et dimensionsMax = 2800 mm sur L/H/P
 *    (dimensionsDefault conservé, simplement borné dans [100, 2800]).
 * 2. Choix de socle (plinthe / pieds métal / pieds bois) garanti sur TOUT module
 *    posé au sol (zone 'bas' ou 'ilot'), hors électroménager, décor et panneaux
 *    de finition (fileur, joue, plan de travail libre).
 *
 * Idempotent : n'écrase que les bornes de dimensions et n'ajoute le socle que s'il manque.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const DIM_MIN = 100;
const DIM_MAX = 2800;

const SOCLE_OPTIONS = [
  { slug: 'socle_plinthe', nom: 'Plinthe', type: 'choix', groupe: 'socle', prix: 0, defaut: 1 },
  { slug: 'socle_pieds_metal', nom: 'Pieds métal', type: 'choix', groupe: 'socle', prix: 40, defaut: 0 },
  { slug: 'socle_pieds_bois', nom: 'Pieds bois', type: 'choix', groupe: 'socle', prix: 50, defaut: 0 },
];

/** Modules posés qui ne reçoivent PAS le choix de socle (électroménager, décor, panneaux de finition) */
const SOCLE_EXCLUS = ['module_lave_vaisselle', 'porte_piece', 'range_bouteilles', 'fileur', 'joue_finition', 'plan_de_travail'];

type Dim = { largeur: number; hauteur: number; profondeur: number };
type ModuleType = {
  slug: string;
  zone: string;
  decor?: boolean;
  dimensionsDefault: Dim;
  dimensionsMin: Dim;
  dimensionsMax: Dim;
  options: { slug: string; [k: string]: unknown }[];
  [k: string]: unknown;
};

const clamp = (v: number) => Math.min(DIM_MAX, Math.max(DIM_MIN, Math.round(v)));

async function migrate() {
  const { rows } = await pool.query(`SELECT value FROM configurateur_settings WHERE key = 'module_types'`);
  const moduleTypes: ModuleType[] = rows[0]?.value || [];
  if (moduleTypes.length === 0) {
    console.error('! aucun module_types en base — rien à faire');
    await pool.end();
    return;
  }

  for (const m of moduleTypes) {
    // 1. Bornes de dimensions homogènes 100 / 2800
    m.dimensionsMin = { largeur: DIM_MIN, hauteur: DIM_MIN, profondeur: DIM_MIN };
    m.dimensionsMax = { largeur: DIM_MAX, hauteur: DIM_MAX, profondeur: DIM_MAX };
    m.dimensionsDefault = {
      largeur: clamp(m.dimensionsDefault?.largeur ?? 600),
      hauteur: clamp(m.dimensionsDefault?.hauteur ?? 700),
      profondeur: clamp(m.dimensionsDefault?.profondeur ?? 500),
    };

    // 2. Socle sur tout module posé au sol éligible
    m.options = m.options || [];
    if (['bas', 'ilot'].includes(m.zone) && !m.decor && !SOCLE_EXCLUS.includes(m.slug)) {
      if (!m.options.some((o) => o.slug === 'socle_plinthe')) {
        m.options.push(...SOCLE_OPTIONS.map((o) => ({ ...o })));
        console.log(`+ choix de socle sur ${m.slug}`);
      }
    }
    console.log(`· ${m.slug} : dims ${m.dimensionsDefault.largeur}×${m.dimensionsDefault.hauteur}×${m.dimensionsDefault.profondeur} (min ${DIM_MIN} / max ${DIM_MAX})`);
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
