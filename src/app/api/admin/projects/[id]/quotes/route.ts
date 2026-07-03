import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import type { Quote } from '@/lib/types';

/**
 * Devis rattachés à un projet (admin uniquement : les montants ne sont
 * jamais exposés côté client).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const quotes = await query<Quote>(
      'SELECT * FROM quotes WHERE project_id = $1 ORDER BY created_at DESC',
      [id]
    );
    return NextResponse.json({ quotes });
  } catch (err) {
    console.error('List project quotes error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
