import { Pool } from 'pg';

/**
 * Corrige la règle de suppression de la FK quotes.project_id.
 *
 * La migration d'origine (migrate-quote-project.ts) voulait ON DELETE SET NULL,
 * mais un run antérieur avait déjà créé la colonne : le `ADD COLUMN IF NOT EXISTS`
 * a alors sauté la définition de contrainte, laissant la FK en NO ACTION. Résultat :
 * supprimer un projet lié — ou supprimer un compte RGPD (qui supprime les projets
 * draft) — échoue en erreur FK. On recrée explicitement la contrainte en SET NULL.
 *
 * Idempotent.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  // La colonne doit exister (créée par migrate-quote-project). Filet de sécurité.
  await pool.query(
    `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS project_id UUID`
  );

  await pool.query(`ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_project_id_fkey`);
  await pool.query(
    `ALTER TABLE quotes
       ADD CONSTRAINT quotes_project_id_fkey
       FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL`
  );
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_project ON quotes(project_id)`);

  // Vérification : la règle de suppression est bien SET NULL (rule 'n').
  const { rows } = await pool.query(
    `SELECT confdeltype FROM pg_constraint WHERE conname = 'quotes_project_id_fkey'`
  );
  const rule = rows[0]?.confdeltype;
  console.log(`✓ FK quotes_project_id_fkey → ON DELETE ${rule === 'n' ? 'SET NULL' : rule}`);

  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
