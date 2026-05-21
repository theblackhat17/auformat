import { rawQuery } from '../lib/db';

const DEFAULT_COLORS = {
  color_bois_clair: '#D4A574',
  color_bois_fonce: '#8B6F47',
  color_vert_foret: '#2C5F2D',
  color_vert_foret_dark: '#234a24',
  color_beige: '#F5F1E8',
  color_noir: '#2B2B2B',
  color_blanc: '#FFFFFF',
};

async function migrate() {
  console.log('Adding theme color columns to site_settings...');

  for (const [col, def] of Object.entries(DEFAULT_COLORS)) {
    await rawQuery(`
      ALTER TABLE site_settings
      ADD COLUMN IF NOT EXISTS ${col} VARCHAR(9) NOT NULL DEFAULT '${def}'
    `);
  }

  console.log('Done. Default brand colors applied.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
