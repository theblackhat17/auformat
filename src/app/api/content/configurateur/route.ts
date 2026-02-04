import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { ConfigurateurSettingsRow } from '@/lib/types';

export async function GET() {
  try {
    const rows = await query<ConfigurateurSettingsRow>(
      'SELECT key, value, updated_at FROM configurateur_settings'
    );

    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
  } catch (err) {
    console.error('Error fetching configurateur settings:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
