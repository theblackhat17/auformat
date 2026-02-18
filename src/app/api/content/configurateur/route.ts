import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getMateriauxForConfigurateur } from '@/lib/content';
import type { ConfigurateurSettingsRow } from '@/lib/types';

export async function GET() {
  try {
    const [rows, dbMaterials] = await Promise.all([
      query<ConfigurateurSettingsRow>(
        'SELECT key, value, updated_at FROM configurateur_settings'
      ),
      getMateriauxForConfigurateur(),
    ]);

    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    // Override materials with unified DB source
    settings.materials = dbMaterials.map((m) => ({
      name: m.name,
      colorHex: m.colorHex || '#CCCCCC',
      prixM2: m.prixM2 || 0,
      sortOrder: m.sortOrder || 0,
    }));

    return NextResponse.json(settings);
  } catch (err) {
    console.error('Error fetching configurateur settings:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
