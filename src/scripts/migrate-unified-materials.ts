/**
 * Migration: Unify materials into a single source (table `materiaux`)
 *
 * 1. Add color_hex and prix_m2 columns to materiaux
 * 2. Back-fill from configurateur_settings materials
 * 3. Add material_id FK on realisations
 * 4. Back-fill material_id by matching names
 *
 * Usage: source .env.local && npx tsx src/scripts/migrate-unified-materials.ts
 */

import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Add columns to materiaux
    console.log('--- Adding color_hex and prix_m2 to materiaux ---');
    await client.query(`ALTER TABLE materiaux ADD COLUMN IF NOT EXISTS color_hex TEXT`);
    await client.query(`ALTER TABLE materiaux ADD COLUMN IF NOT EXISTS prix_m2 NUMERIC`);
    console.log('Columns added (or already exist).');

    // 2. Back-fill from configurateur_settings
    console.log('\n--- Back-filling from configurateur_settings ---');
    const settingsRes = await client.query(
      `SELECT value FROM configurateur_settings WHERE key = 'materials'`
    );

    if (settingsRes.rows.length > 0) {
      const configMaterials = settingsRes.rows[0].value as {
        name: string;
        colorHex: string;
        prixM2: number;
        sortOrder: number;
      }[];

      console.log(`Found ${configMaterials.length} materials in configurateur_settings.`);

      for (const cm of configMaterials) {
        // Try to match by name (case-insensitive)
        const matchRes = await client.query(
          `SELECT id FROM materiaux WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [cm.name]
        );

        if (matchRes.rows.length > 0) {
          // Update existing
          await client.query(
            `UPDATE materiaux SET color_hex = COALESCE(color_hex, $1), prix_m2 = COALESCE(prix_m2, $2) WHERE id = $3`,
            [cm.colorHex, cm.prixM2, matchRes.rows[0].id]
          );
          console.log(`  Updated "${cm.name}" (matched existing).`);
        } else {
          // Insert as new
          await client.query(
            `INSERT INTO materiaux (name, color_hex, prix_m2, description, hardness, stability, origin, color, features, usages, published, sort_order)
             VALUES ($1, $2, $3, '', 0, 0, '', '', '[]', '[]', true, $4)`,
            [cm.name, cm.colorHex, cm.prixM2, cm.sortOrder]
          );
          console.log(`  Inserted "${cm.name}" (new).`);
        }
      }
    } else {
      console.log('No materials found in configurateur_settings. Skipping back-fill.');
    }

    // 3. Add material_id FK to realisations
    console.log('\n--- Adding material_id FK to realisations ---');
    await client.query(
      `ALTER TABLE realisations ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materiaux(id) ON DELETE SET NULL`
    );
    console.log('Column material_id added (or already exists).');

    // 4. Back-fill material_id by matching names
    console.log('\n--- Back-filling material_id on realisations ---');
    const realRes = await client.query(
      `SELECT id, material FROM realisations WHERE material IS NOT NULL AND material != '' AND material_id IS NULL`
    );

    let matched = 0;
    let unmatched = 0;

    for (const row of realRes.rows) {
      const matMatch = await client.query(
        `SELECT id FROM materiaux WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [row.material]
      );

      if (matMatch.rows.length > 0) {
        await client.query(
          `UPDATE realisations SET material_id = $1 WHERE id = $2`,
          [matMatch.rows[0].id, row.id]
        );
        matched++;
      } else {
        console.log(`  WARNING: No match for realisation material "${row.material}" (id: ${row.id})`);
        unmatched++;
      }
    }

    console.log(`Back-fill done: ${matched} matched, ${unmatched} unmatched.`);

    await client.query('COMMIT');
    console.log('\nMigration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
