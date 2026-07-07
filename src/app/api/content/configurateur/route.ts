import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getMateriauxForConfigurateur } from '@/lib/content';
import { getOptionalRole } from '@/lib/middleware-auth';
import { stripPrices } from '@/lib/strip-prices';
import type { ConfigurateurSettingsRow } from '@/lib/types';

export async function GET() {
  try {
    const [rows, dbMaterials, role] = await Promise.all([
      query<ConfigurateurSettingsRow>(
        'SELECT key, value, updated_at FROM configurateur_settings'
      ),
      getMateriauxForConfigurateur(),
      getOptionalRole(),
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
      image: m.image || null,
      renderType: (m as unknown as { renderType?: string }).renderType || null,
      grainHex: (m as unknown as { grainHex?: string }).grainHex || null,
    }));

    // L'assistant IA n'est proposé que s'il est explicitement activé en base
    // (interrupteur admin) ET que la clé API est configurée côté serveur.
    // Défaut (clé absente) : masqué.
    settings.ai_enabled = settings.assistant_enabled === true && !!process.env.ANTHROPIC_API_KEY;

    // Seul l'admin voit les prix ; pour tout autre visiteur, l'UI affiche
    // « Prix sur devis » (jamais « 0 € »). On expose l'info au client…
    settings.pricesVisible = role === 'admin';

    // …et, défense en profondeur, on retire physiquement les prix du payload
    // d'un non-admin (ils ne transitent jamais dans la réponse réseau).
    const payload = role === 'admin' ? settings : (stripPrices(settings) as Record<string, unknown>);

    return NextResponse.json(payload);
  } catch (err) {
    console.error('Error fetching configurateur settings:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
