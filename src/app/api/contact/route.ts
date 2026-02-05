import { NextRequest, NextResponse } from 'next/server';
import { sendContactNotification, sendContactConfirmation } from '@/lib/mailer';
import type { ContactFormData } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
