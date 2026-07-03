import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { getEmailTemplate, renderTemplate, wrapForPreview } from '@/lib/email-templates';
import { sendMail, invalidateEmailTemplateCache } from '@/lib/mailer';

const SUBJECT_MAX = 500;
const BODY_MAX = 100_000;

function isMissingTableError(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === '42P01';
}

const MIGRATION_HINT =
  'Table email_templates absente — exécutez la migration : npx tsx src/scripts/migrate-email-templates.ts';

/**
 * PUT : personnalise un modèle (upsert de l'override),
 * ou envoie un e-mail de test à l'admin connecté si body.action === 'test'.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { key } = await params;

  const def = getEmailTemplate(key);
  if (!def) return NextResponse.json({ error: "Modèle d'e-mail inconnu" }, { status: 404 });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const bodyHtml = typeof body.body === 'string' ? body.body : '';

    // ----- Envoi d'un e-mail de test à l'admin connecté (rien n'est enregistré) -----
    if (body.action === 'test') {
      let saved: { subject: string | null; bodyHtml: string | null } | null = null;
      try {
        saved = await queryOne<{ subject: string | null; bodyHtml: string | null }>(
          'SELECT subject, body_html FROM email_templates WHERE key = $1',
          [key]
        );
      } catch {
        // table absente : test sur les défauts du code
      }
      const samples = Object.fromEntries(def.variables.map((v) => [v.name, v.sample]));
      const rendered = renderTemplate(
        def,
        {
          subject: subject || saved?.subject || null,
          body: bodyHtml.trim() ? bodyHtml : saved?.bodyHtml || null,
        },
        samples
      );
      const html = def.layout === 'inner' ? wrapForPreview(rendered.subject, rendered.body) : rendered.body;
      const sent = await sendMail(auth.profile.email, `[TEST] ${rendered.subject}`, html);
      if (!sent) {
        return NextResponse.json(
          { error: "L'e-mail de test n'a pas pu être envoyé (SMTP indisponible ou non configuré)" },
          { status: 502 }
        );
      }
      return NextResponse.json({ sent: true, to: auth.profile.email });
    }

    // ----- Enregistrement de la personnalisation -----
    if (!subject || !bodyHtml.trim()) {
      return NextResponse.json({ error: 'Le sujet et le corps sont requis' }, { status: 400 });
    }
    if (subject.length > SUBJECT_MAX || bodyHtml.length > BODY_MAX) {
      return NextResponse.json({ error: 'Contenu trop long' }, { status: 400 });
    }

    try {
      await rawQuery(
        `INSERT INTO email_templates (key, subject, body_html, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, updated_at = NOW()`,
        [key, subject, bodyHtml]
      );
    } catch (err) {
      if (isMissingTableError(err)) {
        return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
      }
      throw err;
    }

    invalidateEmailTemplateCache(key);
    logAdminAction(request, auth, 'update', 'email_template', key, `Modèle d'e-mail « ${def.label} » personnalisé`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Email template update error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** DELETE : supprime l'override — le modèle repart sur les défauts du code */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { key } = await params;

  const def = getEmailTemplate(key);
  if (!def) return NextResponse.json({ error: "Modèle d'e-mail inconnu" }, { status: 404 });

  try {
    try {
      await rawQuery('DELETE FROM email_templates WHERE key = $1', [key]);
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
      // table absente : rien à réinitialiser, les défauts s'appliquent déjà
    }

    invalidateEmailTemplateCache(key);
    logAdminAction(request, auth, 'delete', 'email_template', key, `Modèle d'e-mail « ${def.label} » réinitialisé`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Email template reset error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
