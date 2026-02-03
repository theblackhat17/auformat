import { NextRequest, NextResponse } from 'next/server';
import { rawQuery } from '@/lib/db';
import { requireAuth, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { toCamelCase } from '@/lib/db';
import type { Quote } from '@/lib/types';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));

    const result = await rawQuery(
      `UPDATE quotes SET status = 'refused', refused_at = NOW(), client_notes = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('sent', 'viewed') RETURNING *`,
      [id, auth.userId, body.reason || null]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Devis introuvable ou ne peut pas etre refuse' }, { status: 404 });
    }

    const quote = toCamelCase<Quote>(result.rows[0]);
    const ip = getClientIp(request);
    const ua = getUserAgent(request);
    await logActivity(auth.userId, 'refuse_quote', 'quote', id, { description: `Devis ${quote.quoteNumber} refuse` }, ip, ua);

    return NextResponse.json(quote);
  } catch (err) {
    console.error('Refuse quote error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
