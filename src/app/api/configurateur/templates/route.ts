import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { CompositionConfig } from '@/lib/types';

/**
 * Modèles de compositions (projets marqués is_template par un admin) :
 * proposés publiquement comme point de départ dans le configurateur.
 */
export async function GET() {
  try {
    const templates = await query<{ id: string; name: string; type: string; config: CompositionConfig }>(
      `SELECT id, name, type, config FROM projects
       WHERE is_template = TRUE AND config->>'version' = '2'
       ORDER BY updated_at DESC LIMIT 12`
    );
    return NextResponse.json(templates, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('List configurateur templates error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
