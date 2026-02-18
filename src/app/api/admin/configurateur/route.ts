import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, rawQuery } from '@/lib/db';
import type { ConfigurateurSettingsRow } from '@/lib/types';
import { logAdminAction } from '@/lib/activity-logger';

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

    const validKeys = ['product_types', 'option_prices', 'options', 'labels'];
    if (!validKeys.includes(key)) {
      return NextResponse.json({ error: 'Cle invalide' }, { status: 400 });
    }

    await rawQuery(
      `INSERT INTO configurateur_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );

    logAdminAction(request, auth, 'update_configurateur', 'configurateur', null, `Configuration configurateur modifiée`);

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating configurateur settings:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
