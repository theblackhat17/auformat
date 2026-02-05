import { NextRequest, NextResponse } from 'next/server';
import { rawQuery, queryOne } from '@/lib/db';
import { requireAdmin, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { toCamelCase } from '@/lib/db';
import { sendQuoteToClient } from '@/lib/mailer';
import type { Quote } from '@/lib/types';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const result = await rawQuery(
      `UPDATE quotes SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'draft' RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Devis introuvable ou deja envoye' }, { status: 404 });
    }

    const quote = toCamelCase<Quote>(result.rows[0]);

    // Send email to client
    const client = await queryOne<{ email: string; fullName: string }>(
      'SELECT email, full_name FROM profiles WHERE id = $1',
      [quote.userId]
    );

    if (client?.email) {
      await sendQuoteToClient(
        client.email,
        client.fullName || 'Client',
        quote.quoteNumber,
        quote.items,
        quote.subtotalHt,
        quote.taxAmount,
        quote.totalTtc,
      );
    }

    const ip = getClientIp(request);
    const ua = getUserAgent(request);
    await logActivity(auth.userId, 'send_quote', 'quote', id, { description: `Devis ${quote.quoteNumber} envoye` }, ip, ua);

    return NextResponse.json(quote);
  } catch (err) {
    console.error('Send quote error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
