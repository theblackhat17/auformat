import { NextRequest, NextResponse } from 'next/server';
import { rawQuery, queryOne } from '@/lib/db';
import { requireAdmin, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { toCamelCase } from '@/lib/db';
import { sendQuoteToClient } from '@/lib/mailer';
import { generateQuotePdf } from '@/lib/quote-pdf';
import type { Quote } from '@/lib/types';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // Envoi (et renvoi) possible tant que le devis n'est pas accepté/refusé
    const result = await rawQuery(
      `UPDATE quotes SET status = 'sent', sent_at = COALESCE(sent_at, NOW()), updated_at = NOW()
       WHERE id = $1 AND status IN ('draft', 'sent', 'viewed', 'expired') RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Devis introuvable ou déjà accepté/refusé' }, { status: 404 });
    }

    const quote = toCamelCase<Quote>(result.rows[0]);

    // Send email to client (PDF officiel joint)
    const client = await queryOne<{ email: string; fullName: string }>(
      'SELECT email, full_name FROM profiles WHERE id = $1',
      [quote.userId]
    );
    const email = client?.email || quote.clientEmail;

    if (email) {
      let pdf: Buffer | undefined;
      try {
        pdf = await generateQuotePdf(quote);
      } catch (e) {
        console.error('Quote PDF generation failed, sending without attachment:', e);
      }
      await sendQuoteToClient(
        email,
        client?.fullName || quote.clientName || 'Client',
        quote.quoteNumber,
        quote.items,
        quote.subtotalHt,
        quote.taxAmount,
        quote.totalTtc,
        pdf ? { filename: `devis-${quote.quoteNumber}.pdf`, content: pdf } : undefined,
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
