import { NextRequest, NextResponse } from 'next/server';
import { queryOne, update } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import type { Quote } from '@/lib/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const quote = await queryOne<Quote>('SELECT * FROM quotes WHERE id = $1', [id]);
    if (!quote) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }
    if (auth.role !== 'admin' && quote.userId !== auth.userId) {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }
    return NextResponse.json(quote);
  } catch (err) {
    console.error('Get quote error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.adminNotes !== undefined) updates.adminNotes = body.adminNotes;
    if (body.validUntil !== undefined) updates.validUntil = body.validUntil;

    const quote = await update<Quote>('quotes', id, updates);
    if (!quote) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }
    return NextResponse.json(quote);
  } catch (err) {
    console.error('Update quote error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
