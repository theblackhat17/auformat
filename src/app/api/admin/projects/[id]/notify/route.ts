import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { sendMail } from '@/lib/mailer';
import { getStageTemplate, PROJECT_MAIL_SIGNATURE } from '@/lib/project-mail-templates';

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://auformat.com';

/** Échappe les saisies utilisateur pour insertion HTML (même logique que src/lib/mailer.ts) */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Bouton d'action — même style que le helper `btn` de src/lib/mailer.ts */
const btn = (href: string, label: string) => `
  <div style="text-align: center; margin: 24px 0;">
    <a href="${href}" style="display: inline-block; padding: 12px 32px; background: #2C5F2D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${label}</a>
  </div>`;

/** Gabarit HTML — même mise en page que le helper `wrap` de src/lib/mailer.ts */
const wrap = (title: string, body: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
      <h2 style="margin: 0;">${title}</h2>
    </div>
    <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
      ${body}
      <p style="color: #888; font-size: 13px; margin-top: 16px;">Au Format — Menuiserie sur mesure</p>
    </div>
  </div>`;

/**
 * Prévenir le client d'une grande étape de son projet par e-mail,
 * à partir d'un modèle prédéfini (jamais de prix), avec message
 * personnalisé optionnel de l'atelier.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const body = await request.json().catch(() => null);
    const templateKey: string = typeof body?.templateKey === 'string' ? body.templateKey : '';
    const customMessage: string | null =
      typeof body?.customMessage === 'string' && body.customMessage.trim()
        ? body.customMessage.trim().slice(0, 1000)
        : null;

    const template = getStageTemplate(templateKey);
    if (!template) {
      return NextResponse.json({ error: "Modèle d'e-mail inconnu" }, { status: 400 });
    }

    // Projet + client propriétaire (jointure profiles, comme les autres routes admin)
    const project = await queryOne<{
      id: string;
      name: string;
      clientEmail: string | null;
      clientName: string | null;
      clientRole: string | null;
    }>(
      `SELECT p.id, p.name, pr.email AS client_email, pr.full_name AS client_name, pr.role AS client_role
       FROM projects p
       LEFT JOIN profiles pr ON pr.id = p.user_id
       WHERE p.id = $1`,
      [id]
    );
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    if (!project.clientEmail || project.clientEmail.endsWith('@anonyme.local')) {
      return NextResponse.json(
        { error: "Ce projet n'a pas de client avec une adresse e-mail valide" },
        { status: 400 }
      );
    }

    const clientName = project.clientName || project.clientEmail.split('@')[0];
    let bodyHtml = template.body({ clientName: esc(clientName), projectName: esc(project.name) });

    // Message personnalisé + bouton, insérés avant la signature « L'atelier Au Format »
    const insertion = `${
      customMessage
        ? `<blockquote style="margin: 12px 0; padding: 12px; background: #f9f9f9; border-left: 3px solid #2C5F2D; border-radius: 4px; color: #555;">${esc(customMessage).replace(/\n/g, '<br/>')}</blockquote>`
        : ''
    }${btn(`${SITE}/mes-projets`, 'Voir mon projet')}`;
    bodyHtml = bodyHtml.includes(PROJECT_MAIL_SIGNATURE)
      ? bodyHtml.replace(PROJECT_MAIL_SIGNATURE, `${insertion}${PROJECT_MAIL_SIGNATURE}`)
      : `${bodyHtml}${insertion}`;

    const sent = await sendMail(
      project.clientEmail,
      `${template.subject} — Au Format`,
      wrap(template.subject, bodyHtml)
    );
    if (!sent) {
      return NextResponse.json(
        { error: "L'e-mail n'a pas pu être envoyé (SMTP indisponible ou non configuré)" },
        { status: 502 }
      );
    }

    logAdminAction(
      request,
      auth,
      'notify_client',
      'project',
      id,
      `E-mail « ${template.label} » envoyé au client pour « ${project.name} »`
    );

    return NextResponse.json({ emailed: true });
  } catch (err) {
    console.error('Notify client error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
