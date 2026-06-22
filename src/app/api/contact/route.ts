import { NextRequest, NextResponse } from 'next/server';
import { sendContactNotification, sendContactConfirmation } from '@/lib/mailer';
import type { ContactFormData } from '@/lib/mailer';
import { checkContactRateLimit } from '@/lib/rate-limit';
import { saveUploadedFile } from '@/lib/upload';

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://auformat.com';
const MAX_FILES = 3;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const rateCheck = await checkContactRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Trop de messages envoyés. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    // Multipart (formulaire avec fichiers) ou JSON (compatibilité)
    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, string>;
    let files: File[] = [];
    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      body = {};
      for (const [key, value] of fd.entries()) {
        if (typeof value === 'string') body[key] = value;
      }
      files = fd.getAll('fichiers').filter((f): f is File => f instanceof File && f.size > 0).slice(0, MAX_FILES);
    } else {
      body = await request.json();
    }

    // Honeypot: if the hidden field is filled, it's a bot
    if (body._hp_website) {
      // Silently accept to not tip off the bot
      return NextResponse.json({ success: true });
    }

    const { nom, prenom, email, telephone, ville, codePostal, typeProjet, message } = body;

    if (!nom || !prenom || !email || !telephone || !ville || !codePostal || !message) {
      return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis' }, { status: 400 });
    }

    // Photos de la pièce / plans joints (validation stricte : type, taille, magic bytes)
    const attachments: { name: string; url: string }[] = [];
    for (const file of files) {
      try {
        const saved = await saveUploadedFile(file, { allowPdf: true, prefix: 'contact' });
        attachments.push({ name: saved.originalName, url: `${SITE}${saved.path}` });
      } catch (err) {
        return NextResponse.json({ error: `« ${file.name} » : ${err instanceof Error ? err.message : 'fichier refusé'}` }, { status: 400 });
      }
    }

    const data: ContactFormData = {
      nom, prenom, email, telephone, ville, codePostal,
      typeProjet: typeProjet || '',
      message,
    };

    // Send notification to admin + confirmation to client
    const [adminSent, clientSent] = await Promise.all([
      sendContactNotification(data, attachments),
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
