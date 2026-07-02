import { Pool } from 'pg';

/**
 * Configurateur v10 (suite) — la penderie peut accueillir des tiroirs en bas.
 *
 * Ajoute l'option « tiroir » (et les coulisses à fermeture douce associées) au
 * module penderie. Les tiroirs se logent en bas du caisson, sous l'espace de
 * tringle, et une porte toute hauteur (`porte_pleine`) les recouvre comme le
 * reste du module. Le rendu est géré côté SVG (CompoCanvas : drawersAtBottom).
 *
 * Idempotent : relançable sans doublon (n'ajoute que les options manquantes).
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

type Opt = { slug: string; nom: string; type: 'compteur' | 'toggle' | 'choix'; groupe?: string; prix: number; max?: number; defaut: number };

/** Options à garantir sur le module penderie, insérées juste après « etagere » */
const PENDERIE_NEW_OPTIONS: Opt[] = [
  { slug: 'tiroir', nom: 'Tiroirs en bas', type: 'compteur', prix: 45, max: 4, defaut: 0 },
  { slug: 'coulisses_douces', nom: 'Coulisses à fermeture douce', type: 'toggle', prix: 22, defaut: 1 },
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

  for (const opt of PENDERIE_NEW_OPTIONS) {
    if (penderie.options.some((o) => o.slug === opt.slug)) {
      console.log(`· option ${opt.slug} déjà présente sur module_penderie`);
      continue;
    }
    // Insertion juste après « etagere » pour garder un ordre logique
    const idx = penderie.options.findIndex((o) => o.slug === 'etagere');
    if (idx >= 0) penderie.options.splice(idx + 1, 0, opt);
    else penderie.options.push(opt);
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
