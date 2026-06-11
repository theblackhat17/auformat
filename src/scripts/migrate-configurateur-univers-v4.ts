import { Pool } from 'pg';

/**
 * Configurateur v4.1 : sens d'ouverture des portes (gauche/droite) — option de type
 * 'choix' (groupe sens_ouverture) sur tous les modules à porte battante. Utilisé en 3D
 * pour les portes seules (les doubles portes s'ouvrent par le centre). Idempotent.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const SENS = [
  { slug: 'ouverture_droite', nom: 'Ouverture à droite', type: 'choix', groupe: 'sens_ouverture', prix: 0, defaut: 1 },
  { slug: 'ouverture_gauche', nom: 'Ouverture à gauche', type: 'choix', groupe: 'sens_ouverture', prix: 0, defaut: 0 },
];

async function migrate() {
  const { rows } = await pool.query(`SELECT value FROM configurateur_settings WHERE key = 'module_types'`);
  const moduleTypes: { slug: string; options: { slug: string }[] }[] = rows[0]?.value || [];
  const log: string[] = [];

  for (const mod of moduleTypes) {
    const hasPorte = mod.options.some((o) => ['porte', 'porte_basse', 'porte_haute', 'porte_pleine'].includes(o.slug));
    if (hasPorte && !mod.options.some((o) => o.slug === 'ouverture_droite')) {
      mod.options.push(...SENS.map((o) => ({ ...o })));
      log.push(`~ ${mod.slug} : sens d'ouverture`);
    }
  }

  await pool.query(`UPDATE configurateur_settings SET value = $1, updated_at = NOW() WHERE key = 'module_types'`, [JSON.stringify(moduleTypes)]);
  console.log(log.length ? log.join('\n') : '· rien à faire');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
