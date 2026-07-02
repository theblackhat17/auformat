import { NextRequest, NextResponse } from 'next/server';
import { queryOne, update, deleteById } from '@/lib/db';
import { requireAuth, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
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
    // Devis = argent : réservé à l'admin, jamais accessible au client.
    if (auth.role !== 'admin') {
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

      // Lignes du devis : validées puis totaux recalculés côté serveur (jamais ceux du client)
      if (body.items !== undefined) {
        if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
          return NextResponse.json({ error: 'Lignes de devis invalides' }, { status: 400 });
        }
        const items = [];
        for (const it of body.items) {
          const description = typeof it.description === 'string' ? it.description.trim().slice(0, 500) : '';
          const quantity = Number(it.quantity);
          const unitPrice = Number(it.unitPrice);
          if (!description || !isFinite(quantity) || quantity <= 0 || quantity > 1000 || !isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000) {
            return NextResponse.json({ error: 'Ligne de devis invalide (désignation, quantité ou prix)' }, { status: 400 });
          }
          items.push({ description, quantity, unitPrice, total: Math.round(quantity * unitPrice * 100) / 100 });
        }
        const subtotalHt = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;
        const taxRate = existing.taxRate ?? 20;
        const taxAmount = Math.round(subtotalHt * (taxRate / 100) * 100) / 100;
        updates.items = JSON.stringify(items);
        updates.subtotalHt = subtotalHt;
        updates.taxAmount = taxAmount;
        updates.totalTtc = Math.round((subtotalHt + taxAmount) * 100) / 100;
      }
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

/** Suppression d'un devis — réservée à l'admin */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await queryOne<Quote>('SELECT id, quote_number FROM quotes WHERE id = $1', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    }

    await deleteById('quotes', id);
    await logActivity(
      auth.userId, 'delete_quote', 'quote', id,
      { description: `Devis ${existing.quoteNumber} supprimé` },
      getClientIp(request), getUserAgent(request)
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete quote error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
