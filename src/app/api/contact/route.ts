import { NextRequest, NextResponse } from 'next/server';
import { sendContactNotification, sendContactConfirmation } from '@/lib/mailer';
import type { ContactFormData } from '@/lib/mailer';
import { checkContactRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const rateCheck = checkContactRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de messages envoyés. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    const body = await request.json();

    // Honeypot: if the hidden field is filled, it's a bot
    if (body._hp_website) {
      // Silently accept to not tip off the bot
      return NextResponse.json({ success: true });
    }

    const { nom, prenom, email, telephone, ville, codePostal, typeProjet, message } = body as ContactFormData;

    if (!nom || !prenom || !email || !telephone || !ville || !codePostal || !message) {
      return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis' }, { status: 400 });
    }

    const data: ContactFormData = { nom, prenom, email, telephone, ville, codePostal, typeProjet: typeProjet || '', message };

    // Send notification to admin + confirmation to client
    const [adminSent, clientSent] = await Promise.all([
      sendContactNotification(data),
      sendContactConfirmation(data),
    ]);

    if (!adminSent && !clientSent) {
      return NextResponse.json({ error: 'Erreur lors de l\'envoi. Veuillez réessayer ou nous appeler directement.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
