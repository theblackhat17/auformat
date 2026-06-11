import { Pool } from 'pg';

/**
 * Matériaux v4 — rendu 3D réaliste et catalogue réel Au Format :
 * - colonnes : render_type ('uni'|'bois' — texture procédurale), grain_hex (couleur du veinage),
 *   configurateur_only (matériau du configurateur, absent de la page publique /materiaux)
 * - seed du catalogue panneaux (95 % de l'activité) : mélaminé blanc, couleurs unies,
 *   décors bois, et médium (MDF) — idempotent par nom.
 * - configurateur_settings.pricing_mode = 'masque' (le client ne voit pas les prix).
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

type Mat = { name: string; colorHex: string; renderType: 'uni' | 'bois'; grainHex?: string; prixM2: number; sortOrder: number };

const CATALOGUE: Mat[] = [
  // Mélaminé blanc + couleurs unies
  { name: 'Mélaminé blanc', colorHex: '#F4F4F1', renderType: 'uni', prixM2: 32, sortOrder: 100 },
  { name: 'Mélaminé gris clair', colorHex: '#C7C9C8', renderType: 'uni', prixM2: 34, sortOrder: 101 },
  { name: 'Mélaminé gris anthracite', colorHex: '#4A4D50', renderType: 'uni', prixM2: 34, sortOrder: 102 },
  { name: 'Mélaminé noir', colorHex: '#2B2B2B', renderType: 'uni', prixM2: 34, sortOrder: 103 },
  { name: 'Mélaminé beige sable', colorHex: '#D9CDB8', renderType: 'uni', prixM2: 34, sortOrder: 104 },
  { name: 'Mélaminé jaune', colorHex: '#E8B73A', renderType: 'uni', prixM2: 36, sortOrder: 105 },
  { name: 'Mélaminé vert sauge', colorHex: '#8A9B7E', renderType: 'uni', prixM2: 36, sortOrder: 106 },
  { name: 'Mélaminé vert forêt', colorHex: '#3C5743', renderType: 'uni', prixM2: 36, sortOrder: 107 },
  { name: 'Mélaminé bleu canard', colorHex: '#3A6470', renderType: 'uni', prixM2: 36, sortOrder: 108 },
  { name: 'Mélaminé bleu nuit', colorHex: '#2E3A52', renderType: 'uni', prixM2: 36, sortOrder: 109 },
  { name: 'Mélaminé rouge brique', colorHex: '#9E4A3A', renderType: 'uni', prixM2: 36, sortOrder: 110 },
  { name: 'Mélaminé terracotta', colorHex: '#C0764F', renderType: 'uni', prixM2: 36, sortOrder: 111 },
  { name: 'Mélaminé rose poudré', colorHex: '#D8B7AC', renderType: 'uni', prixM2: 36, sortOrder: 112 },
  // Mélaminé décor bois
  { name: 'Mélaminé chêne clair', colorHex: '#D8B98C', renderType: 'bois', grainHex: '#B6925E', prixM2: 38, sortOrder: 120 },
  { name: 'Mélaminé chêne foncé', colorHex: '#9A713F', renderType: 'bois', grainHex: '#6E4C26', prixM2: 38, sortOrder: 121 },
  { name: 'Mélaminé noyer', colorHex: '#7B5538', renderType: 'bois', grainHex: '#54371F', prixM2: 40, sortOrder: 122 },
  // Médium (MDF)
  { name: 'MDF brun brut', colorHex: '#A98C66', renderType: 'uni', prixM2: 28, sortOrder: 130 },
  { name: 'MDF plaqué chêne clair', colorHex: '#DCC09A', renderType: 'bois', grainHex: '#BD9C6B', prixM2: 42, sortOrder: 131 },
  { name: 'MDF plaqué chêne foncé', colorHex: '#A07847', renderType: 'bois', grainHex: '#74522B', prixM2: 42, sortOrder: 132 },
  { name: 'MDF plaqué noyer', colorHex: '#80583A', renderType: 'bois', grainHex: '#583A22', prixM2: 44, sortOrder: 133 },
];

async function migrate() {
  await pool.query(`ALTER TABLE materiaux ADD COLUMN IF NOT EXISTS render_type TEXT`);
  await pool.query(`ALTER TABLE materiaux ADD COLUMN IF NOT EXISTS grain_hex TEXT`);
  await pool.query(`ALTER TABLE materiaux ADD COLUMN IF NOT EXISTS configurateur_only BOOLEAN NOT NULL DEFAULT false`);
  console.log('~ colonnes render_type / grain_hex / configurateur_only');

  let created = 0;
  for (const m of CATALOGUE) {
    const exists = await pool.query(`SELECT id FROM materiaux WHERE name = $1`, [m.name]);
    if (exists.rows.length > 0) {
      // Met à jour uniquement les champs de rendu (jamais le prix, modifiable en admin)
      await pool.query(
        `UPDATE materiaux SET render_type = COALESCE(render_type, $2), grain_hex = COALESCE(grain_hex, $3) WHERE name = $1`,
        [m.name, m.renderType, m.grainHex || null]
      );
      continue;
    }
    await pool.query(
      `INSERT INTO materiaux (name, description, hardness, stability, color_hex, prix_m2, published, sort_order, render_type, grain_hex, configurateur_only)
       VALUES ($1, $2, 3, 4, $3, $4, true, $5, $6, $7, true)`,
      [m.name, 'Panneau pour agencement sur mesure.', m.colorHex, m.prixM2, m.sortOrder, m.renderType, m.grainHex || null]
    );
    created++;
  }
  console.log(`+ ${created} matériaux du catalogue panneaux`);

  await pool.query(
    `INSERT INTO configurateur_settings (key, value) VALUES ('pricing_mode', '"masque"') ON CONFLICT (key) DO NOTHING`
  );
  console.log('~ pricing_mode (masque par défaut)');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
