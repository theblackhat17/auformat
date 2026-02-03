import { NextRequest, NextResponse } from 'next/server';
import { query, rawQuery } from '@/lib/db';
import { requireAuth, requireAdmin, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { toCamelCase } from '@/lib/db';
import { TAX_RATE } from '@/lib/constants';
import type { Quote, QuoteItem } from '@/lib/types';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    if (auth.role === 'admin') {
      // Admin: get all quotes with client info
      const quotes = await query<Quote & { clientName?: string; clientEmail?: string }>(
        `SELECT q.*, p.full_name as client_name, p.email as client_email, p.company_name as client_company
         FROM quotes q
         LEFT JOIN profiles p ON q.user_id = p.id
         ORDER BY q.created_at DESC`
      );
      return NextResponse.json(quotes);
    }

    // Client: get own quotes
    const quotes = await query<Quote>(
      'SELECT * FROM quotes WHERE user_id = $1 ORDER BY created_at DESC',
      [auth.userId]
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

    // Generate quote number
    const yearResult = await rawQuery(
      "SELECT COUNT(*)::int as count FROM quotes WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())"
    );
    const nextNum = (yearResult.rows[0]?.count || 0) + 1;
    const quoteNumber = `DEV-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

    // Calculate totals
    const items: QuoteItem[] = body.items || [];
    const subtotalHt = items.reduce((sum: number, item: QuoteItem) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = Math.round(subtotalHt * TAX_RATE * 100) / 100;
    const totalTtc = Math.round((subtotalHt + taxAmount) * 100) / 100;

    const result = await rawQuery(
      `INSERT INTO quotes (user_id, quote_number, title, description, items, subtotal_ht, tax_rate, tax_amount, total_ttc, status, valid_until, admin_notes)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, 'draft', $10, $11) RETURNING *`,
      [
        body.userId,
        quoteNumber,
        body.title,
        body.description || null,
        JSON.stringify(items),
        subtotalHt,
        20,
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
