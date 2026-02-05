import nodemailer from 'nodemailer';

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

const SIGNATURE = `
  <br/>
  <p style="margin: 0; color: #555;">À bientôt, chez <strong>Au Format</strong></p>
  <p style="color: #888; font-size: 13px;">Au Format — Menuiserie sur mesure</p>
`;

function isConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isConfigured()) {
    console.warn('[mailer] SMTP not configured, skipping email to:', to);
    return false;
  }

  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    return true;
  } catch (err) {
    console.error('[mailer] Failed to send email:', err);
    return false;
  }
}

export async function notifyAdminsNewQuote(quoteNumber: string, clientName: string, clientEmail: string, totalTtc: string): Promise<void> {
  const { query } = await import('./db');
  const admins = await query<{ email: string }>('SELECT email FROM profiles WHERE role = $1', ['admin']);

  const recipients = new Set([NOTIFY_EMAIL, ...admins.map((a) => a.email)]);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Nouvelle demande de devis</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p><strong>Devis n&deg;</strong> ${esc(quoteNumber)}</p>
        <p><strong>Client :</strong> ${esc(clientName)}</p>
        <p><strong>Email :</strong> ${esc(clientEmail)}</p>
        <p><strong>Total TTC :</strong> ${esc(totalTtc)}</p>
        <br/>
        <p>Connectez-vous à l'espace admin pour consulter et traiter ce devis.</p>
        ${SIGNATURE}
      </div>
    </div>
  `;

  for (const recipient of recipients) {
    await sendMail(recipient, `Nouveau devis ${esc(quoteNumber)} - ${esc(clientName)}`, html);
  }
}

export async function sendWelcomeEmail(to: string, clientName: string): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Bienvenue chez Au Format !</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${esc(clientName)},</p>
        <p>Votre compte a bien été créé sur <strong>Au Format</strong>.</p>
        <p>Vous pouvez désormais :</p>
        <ul>
          <li>Configurer vos meubles sur mesure avec notre configurateur</li>
          <li>Demander des devis en ligne</li>
          <li>Suivre l'avancement de vos commandes</li>
        </ul>
        <p>N'hésitez pas à nous contacter pour toute question.</p>
        ${SIGNATURE}
      </div>
    </div>
  `;

  return sendMail(to, 'Bienvenue chez Au Format !', html);
}

export async function notifyNewRegistration(clientName: string, clientEmail: string): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Nouveau client inscrit</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p><strong>Nom :</strong> ${esc(clientName)}</p>
        <p><strong>Email :</strong> ${esc(clientEmail)}</p>
        <p style="color: #888; font-size: 13px;">Inscription le ${new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
        ${SIGNATURE}
      </div>
    </div>
  `;

  await sendMail(NOTIFY_EMAIL, `Nouveau client inscrit - ${esc(clientName)}`, html);
}

export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Vérifiez votre adresse email</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour,</p>
        <p>Merci de vous être inscrit sur <strong>Au Format</strong>. Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 32px; background: #2C5F2D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Vérifier mon email
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
        ${SIGNATURE}
      </div>
    </div>
  `;

  return sendMail(to, 'Vérifiez votre email — Au Format', html);
}

export async function sendQuoteToClient(
  to: string,
  clientName: string,
  quoteNumber: string,
  items: { description: string; quantity: number; unitPrice: number; total: number }[],
  subtotalHt: number,
  tva: number,
  totalTtc: number,
): Promise<boolean> {
  const formatEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const itemRows = items.map((item) =>
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(item.description)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatEur(item.unitPrice)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatEur(item.total)}</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Au Format — Votre devis</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${esc(clientName)},</p>
        <p>Voici votre devis <strong>${esc(quoteNumber)}</strong> :</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="padding: 8px; text-align: left;">Description</th>
              <th style="padding: 8px; text-align: center;">Qté</th>
              <th style="padding: 8px; text-align: right;">P.U.</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="text-align: right; margin-top: 12px;">
          <p style="margin: 4px 0; color: #666;">Sous-total HT : ${formatEur(subtotalHt)}</p>
          <p style="margin: 4px 0; color: #666;">TVA (20%) : ${formatEur(tva)}</p>
          <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #2C5F2D;">Total TTC : ${formatEur(totalTtc)}</p>
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #888; font-size: 13px;">Ce devis est estimatif. Notre équipe vous recontactera pour confirmer les détails et le prix final.</p>
        ${SIGNATURE}
      </div>
    </div>
  `;

  return sendMail(to, `Votre devis ${esc(quoteNumber)} — Au Format`, html);
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

export async function sendContactNotification(data: ContactFormData): Promise<boolean> {
  const typeProjetLabel = data.typeProjet || 'Non précisé';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Nouvelle demande de contact</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #888; width: 120px;">Nom</td><td style="padding: 6px 0;"><strong>${esc(data.prenom)} ${esc(data.nom)}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #888;">Email</td><td style="padding: 6px 0;"><a href="mailto:${esc(data.email)}">${esc(data.email)}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #888;">Téléphone</td><td style="padding: 6px 0;"><a href="tel:${esc(data.telephone)}">${esc(data.telephone)}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #888;">Ville</td><td style="padding: 6px 0;">${esc(data.ville)} (${esc(data.codePostal)})</td></tr>
          <tr><td style="padding: 6px 0; color: #888;">Type de projet</td><td style="padding: 6px 0;">${esc(typeProjetLabel)}</td></tr>
        </table>
        <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />
        <p style="margin: 0 0 8px; color: #888; font-size: 13px;">Message :</p>
        <p style="margin: 0; white-space: pre-wrap;">${esc(data.message)}</p>
        ${SIGNATURE}
      </div>
    </div>
  `;

  return sendMail(NOTIFY_EMAIL, `Contact : ${esc(data.prenom)} ${esc(data.nom)} — ${esc(typeProjetLabel)}`, html);
}

export async function sendContactConfirmation(data: ContactFormData): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Votre demande a bien été reçue</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${esc(data.prenom)},</p>
        <p>Nous avons bien reçu votre demande de contact et nous vous répondrons dans les <strong>24 heures</strong>.</p>
        <p style="color: #888; font-size: 13px;">Voici un récapitulatif de votre message :</p>
        <blockquote style="margin: 12px 0; padding: 12px; background: #f9f9f9; border-left: 3px solid #2C5F2D; border-radius: 4px; font-size: 14px; color: #555;">
          ${esc(data.message).replace(/\n/g, '<br/>')}
        </blockquote>
        <p>N'hésitez pas à nous appeler directement si votre demande est urgente.</p>
        ${SIGNATURE}
      </div>
    </div>
  `;

  return sendMail(data.email, 'Votre demande de contact — Au Format', html);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Réinitialisation de votre mot de passe</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe sur <strong>Au Format</strong>.</p>
        <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #2C5F2D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez simplement cet email.</p>
        ${SIGNATURE}
      </div>
    </div>
  `;

  return sendMail(to, 'Réinitialisation de mot de passe — Au Format', html);
}
