import { rawQuery } from '../lib/db';

async function migrate() {
  console.log('Adding configurateur_enabled column to site_settings...');

  await rawQuery(`
    ALTER TABLE site_settings
    ADD COLUMN IF NOT EXISTS configurateur_enabled BOOLEAN NOT NULL DEFAULT false
  `);

  console.log('Done. Configurateur is disabled by default.');
  console.log('Enable it from Admin > Parametres when ready to launch.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
