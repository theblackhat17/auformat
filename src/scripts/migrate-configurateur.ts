import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const DEFAULT_MATERIALS = [
  { name: 'Chene massif', colorHex: '#D4A574', prixM2: 45, sortOrder: 1 },
  { name: 'Noyer', colorHex: '#8B5A3C', prixM2: 55, sortOrder: 2 },
  { name: 'Pin', colorHex: '#E8D4B0', prixM2: 35, sortOrder: 3 },
  { name: 'Hetre', colorHex: '#DEB887', prixM2: 42, sortOrder: 4 },
  { name: 'Bouleau', colorHex: '#EDE0C8', prixM2: 38, sortOrder: 5 },
  { name: 'Frene', colorHex: '#C8B990', prixM2: 48, sortOrder: 6 },
  { name: 'Melamine blanc', colorHex: '#F5F5F5', prixM2: 40, sortOrder: 7 },
  { name: 'Melamine noir', colorHex: '#2D2D2D', prixM2: 42, sortOrder: 8 },
  { name: 'MDF laque', colorHex: '#E8E8E8', prixM2: 35, sortOrder: 9 },
  { name: 'Contreplaque bouleau', colorHex: '#D2C4A8', prixM2: 30, sortOrder: 10 },
];

const DEFAULT_PRODUCT_TYPES = [
  {
    slug: 'meuble',
    nom: 'Meuble sur mesure',
    icon: 'meuble',
    dimensionsMin: { largeur: 300, hauteur: 300, profondeur: 200, epaisseur: 15 },
    dimensionsMax: { largeur: 3000, hauteur: 2800, profondeur: 800, epaisseur: 50 },
    optionsCategorie: 'furniture',
  },
  {
    slug: 'meuble_tv',
    nom: 'Meuble TV',
    icon: 'meuble_tv',
    dimensionsMin: { largeur: 800, hauteur: 300, profondeur: 300, epaisseur: 15 },
    dimensionsMax: { largeur: 2500, hauteur: 800, profondeur: 600, epaisseur: 50 },
    optionsCategorie: 'furniture',
  },
  {
    slug: 'bibliotheque',
    nom: 'Bibliotheque',
    icon: 'bibliotheque',
    dimensionsMin: { largeur: 400, hauteur: 800, profondeur: 200, epaisseur: 15 },
    dimensionsMax: { largeur: 3000, hauteur: 2800, profondeur: 500, epaisseur: 50 },
    optionsCategorie: 'furniture',
  },
  {
    slug: 'dressing',
    nom: 'Dressing',
    icon: 'dressing',
    dimensionsMin: { largeur: 600, hauteur: 1500, profondeur: 400, epaisseur: 15 },
    dimensionsMax: { largeur: 4000, hauteur: 2800, profondeur: 800, epaisseur: 50 },
    optionsCategorie: 'furniture',
  },
  {
    slug: 'bureau',
    nom: 'Bureau',
    icon: 'bureau',
    dimensionsMin: { largeur: 800, hauteur: 600, profondeur: 400, epaisseur: 18 },
    dimensionsMax: { largeur: 2400, hauteur: 900, profondeur: 800, epaisseur: 50 },
    optionsCategorie: 'furniture',
  },
  {
    slug: 'plan_travail',
    nom: 'Plan de travail',
    icon: 'plan_travail',
    dimensionsMin: { largeur: 600, hauteur: 20, profondeur: 400, epaisseur: 20 },
    dimensionsMax: { largeur: 4000, hauteur: 80, profondeur: 900, epaisseur: 80 },
    optionsCategorie: 'worktop',
  },
  {
    slug: 'etagere',
    nom: 'Etagere murale',
    icon: 'etagere',
    dimensionsMin: { largeur: 300, hauteur: 200, profondeur: 150, epaisseur: 15 },
    dimensionsMax: { largeur: 3000, hauteur: 2400, profondeur: 400, epaisseur: 50 },
    optionsCategorie: 'shelf',
  },
];

const DEFAULT_OPTION_PRICES = {
  tiroir: 15,
  porte: 20,
  pied: 8,
  coulissantes: 50,
  etagere: 10,
  dos: 25,
  decoupe_ronde: 12,
  decoupe_rectangulaire: 18,
  bord_arrondi: 8,
  bord_chanfrein: 6,
  bord_droit: 0,
  fixation_murale: 15,
  fixation_sol: 10,
  separateur: 12,
};

const DEFAULT_LABELS = {
  titre: 'Configurateur Sur-Mesure',
  sousTitre: 'Concevez votre meuble ideal en quelques clics',
  boutonDevis: 'Demander un devis gratuit',
  prixEstimatif: 'Prix estimatif TTC',
  etape1: 'Choisissez votre produit',
  etape2: 'Definissez les dimensions',
  etape3: 'Selectionnez le materiau',
  etape4: 'Personnalisez les options',
  recapTitre: 'Recapitulatif de votre configuration',
  modalTitre: 'Demande de devis',
  modalDescription: 'Remplissez vos coordonnees pour recevoir votre devis personnalise.',
};

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Creating configurateur_settings table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS configurateur_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('Seeding default data...');

    // Upsert each setting
    const upsert = `
      INSERT INTO configurateur_settings (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
    `;

    await client.query(upsert, ['materials', JSON.stringify(DEFAULT_MATERIALS)]);
    console.log('  -> materials seeded');

    await client.query(upsert, ['product_types', JSON.stringify(DEFAULT_PRODUCT_TYPES)]);
    console.log('  -> product_types seeded');

    await client.query(upsert, ['option_prices', JSON.stringify(DEFAULT_OPTION_PRICES)]);
    console.log('  -> option_prices seeded');

    await client.query(upsert, ['labels', JSON.stringify(DEFAULT_LABELS)]);
    console.log('  -> labels seeded');

    await client.query('COMMIT');
    console.log('Migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
