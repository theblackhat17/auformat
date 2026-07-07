import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, rawQuery } from '@/lib/db';
import { requireAuth, requireAdmin, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { toCamelCase } from '@/lib/db';
import { nextQuoteNumber } from '@/lib/quote-number';
import { TAX_RATE } from '@/lib/constants';
import type { Quote, QuoteItem } from '@/lib/types';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Les devis (et donc les montants) sont strictement réservés à l'admin : un client
    // ne voit jamais de prix. Toute requête non-admin est refusée.
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    const quotes = await query<Quote & { clientName?: string; clientEmail?: string }>(
      `SELECT q.*, p.full_name as client_name, p.email as client_email, p.company_name as client_company
       FROM quotes q
       LEFT JOIN profiles p ON q.user_id = p.id
       ORDER BY q.created_at DESC`
    );
    return NextResponse.json(quotes);
  } catch (err) {
    console.error('List quotes error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json({ error: 'Client requis' }, { status: 400 });
    }

    // client_name / client_email sont NOT NULL en base : on les renseigne depuis
    // le profil du client (sans quoi chaque création échouait en violation NOT NULL).
    const client = await queryOne<{ fullName: string | null; email: string; companyName: string | null }>(
      'SELECT full_name, email, company_name FROM profiles WHERE id = $1',
      [body.userId]
    );
    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }
    const clientName = client.fullName || client.companyName || client.email;

    // Numéro de devis atomique (voir nextQuoteNumber : anti-course + anti-réutilisation)
    const quoteNumber = await nextQuoteNumber();

    // Calculate totals
    const items: QuoteItem[] = body.items || [];
    const subtotalHt = Math.round(items.reduce((sum: number, item: QuoteItem) => sum + item.quantity * item.unitPrice, 0) * 100) / 100;
    const taxAmount = Math.round(subtotalHt * TAX_RATE * 100) / 100;
    const totalTtc = Math.round((subtotalHt + taxAmount) * 100) / 100;

    const result = await rawQuery(
      `INSERT INTO quotes (user_id, quote_number, title, description, client_name, client_email, items, subtotal_ht, tax_rate, tax_amount, total_ttc, status, valid_until, admin_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, 'draft', $12, $13) RETURNING *`,
      [
        body.userId,
        quoteNumber,
        body.title,
        body.description || null,
        clientName,
        client.email,
        JSON.stringify(items),
        subtotalHt,
        TAX_RATE * 100,
        taxAmount,
        totalTtc,
        body.validUntil || null,
        body.adminNotes || null,
      ]
    );

    const quote = toCamelCase<Quote>(result.rows[0]);

    const ip = getClientIp(request);
    const ua = getUserAgent(request);
    await logActivity(auth.userId, 'create_quote', 'quote', quote.id, { description: `Devis ${quoteNumber} cree - ${totalTtc} EUR` }, ip, ua);

    return NextResponse.json(quote, { status: 201 });
  } catch (err) {
    console.error('Create quote error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
