import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// Full options list with categories for woodworking
const DEFAULT_OPTIONS = [
  // Furniture options
  { slug: 'etagere', nom: 'Etagere', prix: 10, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 1 },
  { slug: 'tiroir', nom: 'Tiroir', prix: 15, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 2 },
  { slug: 'porte_battante', nom: 'Porte battante', prix: 20, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 3 },
  { slug: 'porte_coulissante', nom: 'Porte coulissante', prix: 50, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 4 },
  { slug: 'dos', nom: 'Panneau de dos', prix: 25, categorie: 'furniture', type: 'toggle', actif: true, sortOrder: 5 },
  { slug: 'pied_rond', nom: 'Pied rond', prix: 8, categorie: 'furniture', type: 'choix', groupe: 'pieds', actif: true, sortOrder: 6 },
  { slug: 'pied_carre', nom: 'Pied carre', prix: 8, categorie: 'furniture', type: 'choix', groupe: 'pieds', actif: true, sortOrder: 7 },
  { slug: 'pied_oblique', nom: 'Pied oblique', prix: 10, categorie: 'furniture', type: 'choix', groupe: 'pieds', actif: true, sortOrder: 8 },
  // Quincaillerie / Hardware
  { slug: 'charniere_standard', nom: 'Charniere standard 110\u00b0', prix: 3.5, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 9 },
  { slug: 'charniere_frein', nom: 'Charniere frein integre', prix: 6.8, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 10 },
  { slug: 'charniere_push', nom: 'Charniere push-to-open', prix: 9.5, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 11 },
  { slug: 'coulisse_standard', nom: 'Coulisse tiroir standard', prix: 8.5, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 12 },
  { slug: 'coulisse_totale', nom: 'Coulisse sortie totale', prix: 18, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 13 },
  { slug: 'coulisse_frein', nom: 'Coulisse fermeture douce', prix: 28, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 14 },
  { slug: 'poignee_moderne', nom: 'Poignee barre moderne', prix: 8, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 15 },
  { slug: 'poignee_bouton', nom: 'Poignee bouton', prix: 5, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 16 },
  { slug: 'poignee_coquille', nom: 'Poignee coquille', prix: 12, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 17 },
  { slug: 'poignee_invisible', nom: 'Poignee invisible (push)', prix: 15, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 18 },
  { slug: 'serrure', nom: 'Serrure a cle', prix: 22, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 19 },
  { slug: 'led_interieur', nom: 'Eclairage LED interieur', prix: 35, categorie: 'furniture', type: 'toggle', actif: true, sortOrder: 20 },
  { slug: 'tringle', nom: 'Tringle penderie', prix: 18, categorie: 'furniture', type: 'compteur', actif: true, sortOrder: 21 },
  { slug: 'miroir', nom: 'Miroir integre', prix: 45, categorie: 'furniture', type: 'toggle', actif: true, sortOrder: 22 },
  // Worktop options
  { slug: 'bord_droit', nom: 'Bord droit', prix: 0, categorie: 'worktop', type: 'choix', groupe: 'bord', actif: true, sortOrder: 1 },
  { slug: 'bord_arrondi', nom: 'Bord arrondi', prix: 8, categorie: 'worktop', type: 'choix', groupe: 'bord', actif: true, sortOrder: 2 },
  { slug: 'bord_chanfrein', nom: 'Bord chanfrein', prix: 6, categorie: 'worktop', type: 'choix', groupe: 'bord', actif: true, sortOrder: 3 },
  { slug: 'decoupe_ronde', nom: 'Decoupe ronde (evier, plaque)', prix: 12, categorie: 'worktop', type: 'compteur', actif: true, sortOrder: 4 },
  { slug: 'decoupe_rectangulaire', nom: 'Decoupe rectangulaire', prix: 18, categorie: 'worktop', type: 'compteur', actif: true, sortOrder: 5 },
  { slug: 'credence', nom: 'Credence assortie', prix: 30, categorie: 'worktop', type: 'toggle', actif: true, sortOrder: 6 },
  { slug: 'joint_etancheite', nom: 'Joint etancheite', prix: 5, categorie: 'worktop', type: 'toggle', actif: true, sortOrder: 7 },
  // Shelf options
  { slug: 'niveau', nom: 'Niveau / Tablette', prix: 10, categorie: 'shelf', type: 'compteur', actif: true, sortOrder: 1 },
  { slug: 'separateur', nom: 'Separateur vertical', prix: 12, categorie: 'shelf', type: 'compteur', actif: true, sortOrder: 2 },
  { slug: 'fixation_murale', nom: 'Fixation murale', prix: 15, categorie: 'shelf', type: 'choix', groupe: 'fixation', actif: true, sortOrder: 3 },
  { slug: 'fixation_sol', nom: 'Fixation au sol', prix: 10, categorie: 'shelf', type: 'choix', groupe: 'fixation', actif: true, sortOrder: 4 },
  { slug: 'equerre_renforcee', nom: 'Equerres renforcees', prix: 8, categorie: 'shelf', type: 'toggle', actif: true, sortOrder: 5 },
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Migrating options to new format...');

    await client.query(
      `INSERT INTO configurateur_settings (key, value, updated_at)
       VALUES ('options', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [JSON.stringify(DEFAULT_OPTIONS)]
    );

    console.log(`  -> ${DEFAULT_OPTIONS.length} options seeded`);

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
