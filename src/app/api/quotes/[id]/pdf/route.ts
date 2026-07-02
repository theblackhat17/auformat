import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import { generateQuotePdf } from '@/lib/quote-pdf';
import type { Quote } from '@/lib/types';

/** Téléchargement du PDF officiel du devis — admin uniquement (jamais le client). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const quote = await queryOne<Quote>('SELECT * FROM quotes WHERE id = $1', [id]);
    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const pdf = await generateQuotePdf(quote);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="devis-${quote.quoteNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('Quote PDF error:', err);
    return NextResponse.json({ error: 'Erreur de génération du PDF' }, { status: 500 });
  }
}
