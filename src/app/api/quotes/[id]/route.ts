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
    // Check ownership before update
    const existing = await queryOne<Quote>('SELECT * FROM quotes WHERE id = $1', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }
    if (auth.role !== 'admin' && existing.userId !== auth.userId) {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    const body = await request.json();

    // Input validation
    const MAX_LEN = 1000;
    for (const field of ['title', 'description', 'adminNotes']) {
      if (body[field] !== undefined && (typeof body[field] !== 'string' || body[field].length > MAX_LEN)) {
        return NextResponse.json({ error: `Champ ${field} invalide (max ${MAX_LEN} caracteres)` }, { status: 400 });
      }
    }
    if (body.validUntil !== undefined && body.validUntil !== null) {
      if (typeof body.validUntil !== 'string' || isNaN(Date.parse(body.validUntil))) {
        return NextResponse.json({ error: 'Format de date invalide pour validUntil' }, { status: 400 });
      }
    }

    const updates: Record<string, unknown> = {};

    // Only admins can modify admin-only fields
    if (auth.role === 'admin') {
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.adminNotes !== undefined) updates.adminNotes = body.adminNotes;
      if (body.validUntil !== undefined) updates.validUntil = body.validUntil;
    } else {
      // Clients can only update limited fields
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
    }

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
