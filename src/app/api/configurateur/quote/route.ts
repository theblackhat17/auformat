import { NextRequest, NextResponse } from 'next/server';
import { rawQuery, queryOne } from '@/lib/db';
import { TAX_RATE } from '@/lib/constants';
import { notifyAdminsNewQuote, sendQuoteToClient } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, email, telephone, message, productType, dimensions, materiau, items, subtotalHt, tva, totalTtc } = body;

    if (!nom || !email || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Donnees incompletes' }, { status: 400 });
    }

    // Find or create a profile for this email
    let profile = await queryOne<{ id: string; role: string }>(
      'SELECT id, role FROM profiles WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (!profile) {
      // Create a lightweight client profile (no password - they can register later)
      const result = await rawQuery(
        `INSERT INTO profiles (email, full_name, phone, role, discount_rate)
         VALUES ($1, $2, $3, 'client', 0) RETURNING id, role`,
        [email.toLowerCase().trim(), nom, telephone || null]
      );
      profile = { id: result.rows[0].id, role: result.rows[0].role };
    }

    // Generate quote number
    const yearResult = await rawQuery(
      "SELECT COUNT(*)::int as count FROM quotes WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())"
    );
    const nextNum = (yearResult.rows[0]?.count || 0) + 1;
    const quoteNumber = `DEV-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

    // Build description from config
    const description = [
      `Produit : ${productType}`,
      `Dimensions : ${dimensions}`,
      `Materiau : ${materiau}`,
      message ? `Message : ${message}` : null,
      telephone ? `Tel : ${telephone}` : null,
    ].filter(Boolean).join('\n');

    // Convert line items to quote items format
    const quoteItems = items.map((item: { label: string; quantity: number; unitPrice: number; total: number }) => ({
      description: item.label,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    }));

    const calcSubtotalHt = subtotalHt || quoteItems.reduce((s: number, i: { total: number }) => s + i.total, 0);
    const calcTva = tva || Math.round(calcSubtotalHt * TAX_RATE * 100) / 100;
    const calcTotalTtc = totalTtc || Math.round((calcSubtotalHt + calcTva) * 100) / 100;

    const result = await rawQuery(
      `INSERT INTO quotes (user_id, quote_number, title, description, client_name, client_email, client_phone, items, subtotal_ht, tax_rate, tax_amount, total_ttc, status, client_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, 'draft', $13) RETURNING *`,
      [
        profile.id,
        quoteNumber,
        `Configurateur - ${productType}`,
        description,
        nom,
        email.toLowerCase().trim(),
        telephone || null,
        JSON.stringify(quoteItems),
        calcSubtotalHt,
        20,
        calcTva,
        calcTotalTtc,
        message || null,
      ]
    );

    const formatEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

    // Send email to client (copy of quote)
    await sendQuoteToClient(
      email,
      nom,
      quoteNumber,
      quoteItems,
      calcSubtotalHt,
      calcTva,
      calcTotalTtc,
    );

    // Notify admins
    await notifyAdminsNewQuote(quoteNumber, nom, email, formatEur(calcTotalTtc));

    return NextResponse.json({ success: true, quoteNumber }, { status: 201 });
  } catch (err) {
    console.error('Configurateur quote error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
