import { Pool } from 'pg';

/**
 * Crée la table `project_settings` (stockage clé/valeur JSONB, même modèle que
 * `configurateur_settings`) et y seed le catalogue par défaut des jalons de projet
 * (« milestones ») : étiquettes, ordre, indicateur financier (interne) et
 * notification client. Idempotent : le seed n'écrase pas une configuration existante.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

/** Catalogue par défaut : copie de PROJECT_MILESTONES + clientNotify sur les grandes étapes client */
const DEFAULT_MILESTONES = [
  { key: 'configure', label: 'Projet configuré', financial: false, clientNotify: false },
  { key: 'envoye_3d', label: 'Projet envoyé en 3D au client', financial: false, clientNotify: true },
  { key: 'devis_realise', label: 'Devis réalisé', financial: true, clientNotify: false },
  { key: 'devis_envoye', label: 'Devis envoyé', financial: true, clientNotify: false },
  { key: 'devis_accepte', label: 'Devis accepté', financial: true, clientNotify: false },
  { key: 'acompte', label: "Demande d'acompte", financial: true, clientNotify: false },
  { key: 'production', label: 'Production', financial: false, clientNotify: true },
  { key: 'pose', label: 'Pose', financial: false, clientNotify: true },
  { key: 'facture_solde', label: 'Facture de solde', financial: true, clientNotify: false },
  { key: 'avis_google', label: 'Avis Google demandé', financial: false, clientNotify: false },
  { key: 'photos', label: 'Photos de réalisation', financial: false, clientNotify: false },
  { key: 'publie_insta', label: 'Publié sur Insta', financial: false, clientNotify: false },
  { key: 'publie_site', label: 'Publié sur le site', financial: false, clientNotify: false },
];

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✓ table project_settings prête');

  // Seed du catalogue de jalons uniquement s'il n'existe pas déjà
  await pool.query(
    `INSERT INTO project_settings (key, value) VALUES ('milestones', $1) ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(DEFAULT_MILESTONES)]
  );
  console.log('✓ clé « milestones » seedée (si absente)');

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
