import nodemailer from 'nodemailer';
import { getEmailTemplate, renderTemplate } from './email-templates';
import { PROJECT_MAIL_SIGNATURE } from './project-mail-templates';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: (process.env.SMTP_PORT || '465') === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@auformat.fr';

/** Escape user input for safe HTML embedding */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'contact@auformat.fr';

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://auformat.com';

const formatEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

function isConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
): Promise<boolean> {
  if (!isConfigured()) {
    console.warn('[mailer] SMTP not configured, skipping email to:', to);
    return false;
  }

  try {
    await transporter.sendMail({ from: FROM, to, subject, html, attachments });
    return true;
  } catch (err) {
    console.error('[mailer] Failed to send email:', err);
    return false;
  }
}

// =============================================
// Résolution des modèles (registre + overrides DB)
// =============================================

type TemplateOverride = { subject: string | null; bodyHtml: string | null };

const OVERRIDE_CACHE_TTL_MS = 60_000;
const overrideCache = new Map<string, { row: TemplateOverride | null; at: number }>();

/** Invalide le cache des overrides (appelé par l'API admin après modification) */
export function invalidateEmailTemplateCache(key?: string): void {
  if (key) overrideCache.delete(key);
  else overrideCache.clear();
}

async function getTemplateOverride(key: string): Promise<TemplateOverride | null> {
  const cached = overrideCache.get(key);
  if (cached && Date.now() - cached.at < OVERRIDE_CACHE_TTL_MS) return cached.row;

  let row: TemplateOverride | null = null;
  try {
    const { queryOne } = await import('./db');
    row = await queryOne<TemplateOverride>(
      'SELECT subject, body_html FROM email_templates WHERE key = $1',
      [key]
    );
  } catch {
    // Table absente (migration non exécutée) ou DB indisponible :
    // on retombe sur les défauts du code, l'envoi ne doit jamais échouer ici.
    row = null;
  }
  overrideCache.set(key, { row, at: Date.now() });
  return row;
}

/**
 * Résout un modèle d'e-mail : override en base s'il existe (cache 60 s),
 * sinon défauts du registre, puis interpolation des variables `{{nom}}`.
 *
 * IMPORTANT : les valeurs de `vars` issues d'une saisie utilisateur doivent
 * être passées DÉJÀ échappées via esc(). `subjectVars` permet d'interpoler le
 * sujet (texte brut) avec des valeurs non échappées si nécessaire.
 */
export async function resolveTemplate(
  key: string,
  vars: Record<string, string>,
  subjectVars?: Record<string, string>
): Promise<{ subject: string; body: string }> {
  const def = getEmailTemplate(key);
  if (!def) throw new Error(`[mailer] Modèle d'e-mail inconnu : ${key}`);

  const override = await getTemplateOverride(key);
  const allVars = { siteUrl: SITE, ...vars };
  return renderTemplate(
    def,
    override ? { subject: override.subject, body: override.bodyHtml } : null,
    allVars,
    subjectVars ? { siteUrl: SITE, ...subjectVars } : undefined
  );
}

// =============================================
// Envois
// =============================================

export async function notifyAdminsNewQuote(quoteNumber: string, clientName: string, clientEmail: string, totalTtc: string): Promise<void> {
  const { query } = await import('./db');
  const admins = await query<{ email: string }>('SELECT email FROM profiles WHERE role = $1', ['admin']);

  const recipients = new Set([NOTIFY_EMAIL, ...admins.map((a) => a.email)]);

  const { subject, body } = await resolveTemplate('admin_new_quote', {
    quoteNumber: esc(quoteNumber),
    clientName: esc(clientName),
    clientEmail: esc(clientEmail),
    totalTtc: esc(totalTtc),
  });

  for (const recipient of recipients) {
    await sendMail(recipient, subject, body);
  }
}

export async function sendWelcomeEmail(to: string, clientName: string): Promise<boolean> {
  const { subject, body } = await resolveTemplate('welcome', { clientName: esc(clientName) });
  return sendMail(to, subject, body);
}

export async function notifyNewRegistration(clientName: string, clientEmail: string): Promise<void> {
  const { subject, body } = await resolveTemplate('admin_new_registration', {
    clientName: esc(clientName),
    clientEmail: esc(clientEmail),
    registrationDate: new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }),
  });
  await sendMail(NOTIFY_EMAIL, subject, body);
}

export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<boolean> {
  const { subject, body } = await resolveTemplate('email_verification', { verificationUrl });
  return sendMail(to, subject, body);
}

export async function sendQuoteToClient(
  to: string,
  clientName: string,
  quoteNumber: string,
  items: { description: string; quantity: number; unitPrice: number; total: number }[],
  subtotalHt: number,
  tva: number,
  totalTtc: number,
  pdfAttachment?: { filename: string; content: Buffer },
  /**
   * Confirmation sans montant (soumission publique du configurateur) : le client
   * reçoit l'accusé de sa demande, mais aucun prix — le chiffrage reste réservé
   * au commercial. Le devis stocké en base garde, lui, les montants calculés.
   */
  hidePrices = false,
): Promise<boolean> {
  const priceCell = (n: number) => (hidePrices ? 'Sur devis' : formatEur(n));

  const itemRows = items.map((item) =>
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(item.description)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${priceCell(item.unitPrice)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${priceCell(item.total)}</td>
    </tr>`
  ).join('');

  const footerBlock = hidePrices
    ? `<p style="color: #555; font-size: 13px;">Votre demande nous est bien parvenue. Notre atelier étudie votre projet et vous transmet un devis chiffré sous 48h — gratuit et sans engagement.</p>`
    : pdfAttachment
    ? `<p style="color: #555; font-size: 13px;">Votre devis détaillé est joint à cet email au format PDF. Pour l'accepter, retournez-le signé avec la mention « bon pour accord », ou répondez simplement à cet email.</p>`
    : `<p style="color: #888; font-size: 13px;">Ce devis est estimatif. Notre équipe vous recontactera pour confirmer les détails et le prix final.</p>`;

  const { subject, body } = await resolveTemplate('quote_sent', {
    clientName: esc(clientName),
    quoteNumber: esc(quoteNumber),
    itemRows,
    subtotalHt: priceCell(subtotalHt),
    tva: priceCell(tva),
    totalTtc: priceCell(totalTtc),
    footerBlock,
  });

  return sendMail(
    to,
    subject,
    body,
    pdfAttachment ? [{ ...pdfAttachment, contentType: 'application/pdf' }] : undefined
  );
}

export interface ContactFormData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  ville: string;
  codePostal: string;
  typeProjet: string;
  message: string;
}

export async function sendContactNotification(
  data: ContactFormData,
  attachments?: { name: string; url: string }[]
): Promise<boolean> {
  const typeProjetLabel = data.typeProjet || 'Non précisé';
  const attachmentsBlock = attachments?.length
    ? `<hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />
       <p style="margin: 0 0 8px; color: #888; font-size: 13px;">Fichiers joints par le client :</p>
       <ul style="margin: 0; padding-left: 18px;">${attachments.map((a) => `<li><a href="${a.url}">${esc(a.name)}</a></li>`).join('')}</ul>`
    : '';

  const { subject, body } = await resolveTemplate('admin_contact', {
    firstName: esc(data.prenom),
    lastName: esc(data.nom),
    email: esc(data.email),
    phone: esc(data.telephone),
    city: esc(data.ville),
    zipCode: esc(data.codePostal),
    projectType: esc(typeProjetLabel),
    message: esc(data.message),
    attachmentsBlock,
  });

  return sendMail(NOTIFY_EMAIL, subject, body);
}

export async function sendContactConfirmation(data: ContactFormData): Promise<boolean> {
  const { subject, body } = await resolveTemplate('contact_confirmation', {
    firstName: esc(data.prenom),
    messageHtml: esc(data.message).replace(/\n/g, '<br/>'),
  });
  return sendMail(data.email, subject, body);
}

/** Le projet du client avance à l'atelier : nouvelle étape de fabrication */
export async function sendProjectUpdateEmail(
  to: string,
  clientName: string,
  projectName: string,
  statusLabel: string,
  note?: string | null,
  photoCount = 0
): Promise<boolean> {
  const noteBlock = note
    ? `<blockquote style="margin: 12px 0; padding: 12px; background: #f9f9f9; border-left: 3px solid #2C5F2D; border-radius: 4px; color: #555;">${esc(note).replace(/\n/g, '<br/>')}</blockquote>`
    : '';
  const photosBlock = photoCount > 0
    ? `<p>📷 ${photoCount} photo${photoCount > 1 ? 's' : ''} d'atelier ${photoCount > 1 ? 'ont été ajoutées' : 'a été ajoutée'} à votre suivi.</p>`
    : '';

  const vars = {
    clientName: esc(clientName),
    projectName: esc(projectName),
    statusLabel: esc(statusLabel),
    noteBlock,
    photosBlock,
  };
  // Le sujet est du texte brut : projectName/statusLabel y restent non échappés
  const { subject, body } = await resolveTemplate('project_update', vars, {
    ...vars,
    projectName,
    statusLabel,
  });
  return sendMail(to, subject, body);
}

/** Bouton et gabarit des e-mails d'étape (même style que la route /notify) */
const stageBtn = (href: string, label: string) => `
  <div style="text-align: center; margin: 24px 0;">
    <a href="${href}" style="display: inline-block; padding: 12px 32px; background: #2C5F2D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${label}</a>
  </div>`;
const stageWrap = (title: string, body: string) => `
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
 * E-mail automatique de franchissement d'étape : utilise le modèle « Étape : … »
 * dédié (`stage_<clé>`, éditable dans Mails) s'il existe, sinon retombe sur le
 * modèle générique « Avancement du projet ». Aucun prix. Ne jette jamais.
 */
export async function sendProjectStageEmail(
  to: string,
  clientName: string,
  projectName: string,
  stageKey: string,
  fallbackLabel: string
): Promise<boolean> {
  try {
    if (getEmailTemplate(`stage_${stageKey}`)) {
      const { subject, body } = await resolveTemplate(`stage_${stageKey}`, {
        clientName: esc(clientName),
        projectName: esc(projectName),
      });
      const insertion = stageBtn(`${SITE}/mes-projets`, 'Voir mon projet');
      const bodyHtml = body.includes(PROJECT_MAIL_SIGNATURE)
        ? body.replace(PROJECT_MAIL_SIGNATURE, `${insertion}${PROJECT_MAIL_SIGNATURE}`)
        : `${body}${insertion}`;
      return sendMail(to, `${subject} — Au Format`, stageWrap(subject, bodyHtml));
    }
    return sendProjectUpdateEmail(to, clientName, projectName, fallbackLabel, null, 0);
  } catch (err) {
    console.error('[mailer] sendProjectStageEmail failed:', err);
    return false;
  }
}

/** Relance d'un devis resté sans réponse (J+7) */
export async function sendQuoteReminderEmail(
  to: string,
  clientName: string,
  quoteNumber: string,
  totalTtc: number,
  validUntil?: string | null
): Promise<boolean> {
  const validityLine = validUntil
    ? `<p style="color: #888; font-size: 13px;">Ce devis est valable jusqu'au ${new Date(validUntil).toLocaleDateString('fr-FR')}.</p>`
    : '';
  const { subject, body } = await resolveTemplate('quote_reminder', {
    clientName: esc(clientName),
    quoteNumber: esc(quoteNumber),
    totalTtc: formatEur(totalTtc),
    validityLine,
  });
  return sendMail(to, subject, body);
}

/** Le devis expire bientôt (J-5) */
export async function sendQuoteExpiryEmail(
  to: string,
  clientName: string,
  quoteNumber: string,
  validUntil: string
): Promise<boolean> {
  const { subject, body } = await resolveTemplate('quote_expiry', {
    clientName: esc(clientName),
    quoteNumber: esc(quoteNumber),
    validUntilDate: new Date(validUntil).toLocaleDateString('fr-FR'),
  });
  return sendMail(to, subject, body);
}

/** Le client demande une modification sur son devis */
export async function notifyAdminsQuoteRevision(
  quoteNumber: string,
  clientName: string,
  clientEmail: string,
  message: string
): Promise<void> {
  const { subject, body } = await resolveTemplate('admin_quote_revision', {
    quoteNumber: esc(quoteNumber),
    clientName: esc(clientName),
    clientEmail: esc(clientEmail),
    messageHtml: esc(message).replace(/\n/g, '<br/>'),
  });
  await sendMail(NOTIFY_EMAIL, subject, body);
}

/** Rappel J-1 : le client a un rendez-vous demain (RDV découverte, technique ou pose) */
export async function sendRdvReminderEmail(
  to: string,
  opts: { clientName: string; typeLabel: string; projectName: string; whenLabel: string }
): Promise<boolean> {
  const { subject, body } = await resolveTemplate('rdv_reminder', {
    clientName: esc(opts.clientName),
    typeLabel: esc(opts.typeLabel),
    projectName: esc(opts.projectName),
    whenLabel: esc(opts.whenLabel),
  });
  return sendMail(to, subject, body);
}

/** Le chantier est terminé : on invite le client à laisser un avis Google */
export async function sendReviewRequestEmail(
  to: string,
  clientName: string,
  projectName: string,
  reviewUrl: string
): Promise<boolean> {
  const { subject, body } = await resolveTemplate('review_request', {
    clientName: esc(clientName),
    projectName: esc(projectName),
    reviewUrl,
  });
  return sendMail(to, subject, body);
}

/** Nouveau message de l'atelier en attente côté client */
export async function sendChatNotificationToClient(
  to: string,
  clientName: string,
  contextLabel: string,
  preview: string
): Promise<boolean> {
  const { subject, body } = await resolveTemplate('chat_client', {
    clientName: esc(clientName),
    contextLabel: esc(contextLabel),
    preview: esc(preview),
  });
  return sendMail(to, subject, body);
}

/** Nouveau message client en attente côté atelier */
export async function notifyAdminsChatMessage(
  clientName: string,
  contextLabel: string,
  preview: string
): Promise<void> {
  const { subject, body } = await resolveTemplate('admin_chat', {
    clientName: esc(clientName),
    contextLabel: esc(contextLabel),
    preview: esc(preview),
  });
  await sendMail(NOTIFY_EMAIL, subject, body);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const { subject, body } = await resolveTemplate('password_reset', { resetUrl });
  return sendMail(to, subject, body);
}
