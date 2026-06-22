import { NextRequest, NextResponse } from 'next/server';
import { rawQuery } from '@/lib/db';
import { requireAuth, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { notifyAdminsQuoteRevision } from '@/lib/mailer';
import { toCamelCase } from '@/lib/db';
import type { Quote } from '@/lib/types';

/**
 * Le client demande une modification sur son devis au lieu de le refuser :
 * le message est enregistré sur le devis et l'atelier est prévenu par email.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const { message } = await request.json();
    const msg = typeof message === 'string' ? message.trim().slice(0, 2000) : '';
    if (!msg) {
      return NextResponse.json({ error: 'Décrivez la modification souhaitée' }, { status: 400 });
    }

    const result = await rawQuery(
      `UPDATE quotes SET revision_requested_at = NOW(), revision_message = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND status IN ('sent', 'viewed') RETURNING *`,
      [msg, id, auth.userId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Devis introuvable ou déjà traité' }, { status: 404 });
    }

    const quote = toCamelCase<Quote>(result.rows[0]);
    void notifyAdminsQuoteRevision(
      quote.quoteNumber,
      quote.clientName || 'Client',
      quote.clientEmail || '',
      msg
    );
    await logActivity(auth.userId, 'update_quote', 'quote', id, {
      description: `Modification demandée sur ${quote.quoteNumber}`,
    }, getClientIp(request), getUserAgent(request));

    return NextResponse.json(quote);
  } catch (err) {
    console.error('Quote revision error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
