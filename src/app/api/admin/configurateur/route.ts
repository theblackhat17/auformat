import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, rawQuery } from '@/lib/db';
import type { ConfigurateurSettingsRow } from '@/lib/types';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

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

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Cle et valeur requises' }, { status: 400 });
    }

    const validKeys = ['materials', 'product_types', 'option_prices', 'labels'];
    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: 'Cle invalide' }, { status: 400 });
    }

    await rawQuery(
      `INSERT INTO configurateur_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating configurateur settings:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
