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
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'contact@auformat.fr';

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
        <p><strong>Devis n&deg;</strong> ${quoteNumber}</p>
        <p><strong>Client :</strong> ${clientName}</p>
        <p><strong>Email :</strong> ${clientEmail}</p>
        <p><strong>Total TTC :</strong> ${totalTtc}</p>
        <br/>
        <p>Connectez-vous a l'espace admin pour consulter et traiter ce devis.</p>
      </div>
    </div>
  `;

  for (const recipient of recipients) {
    await sendMail(recipient, `Nouveau devis ${quoteNumber} - ${clientName}`, html);
  }
}

export async function sendWelcomeEmail(to: string, clientName: string): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Bienvenue chez Au Format !</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${clientName},</p>
        <p>Votre compte a bien ete cree sur <strong>Au Format</strong>.</p>
        <p>Vous pouvez desormais :</p>
        <ul>
          <li>Configurer vos meubles sur mesure avec notre configurateur</li>
          <li>Demander des devis en ligne</li>
          <li>Suivre l'avancement de vos commandes</li>
        </ul>
        <p>N'hesitez pas a nous contacter pour toute question.</p>
        <br/>
        <p style="color: #888; font-size: 13px;">Au Format - Menuiserie sur mesure</p>
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
        <p><strong>Nom :</strong> ${clientName}</p>
        <p><strong>Email :</strong> ${clientEmail}</p>
        <p style="color: #888; font-size: 13px;">Inscription le ${new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
      </div>
    </div>
  `;

  await sendMail(NOTIFY_EMAIL, `Nouveau client inscrit - ${clientName}`, html);
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
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatEur(item.unitPrice)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatEur(item.total)}</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Au Format - Votre devis</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour ${clientName},</p>
        <p>Voici votre devis <strong>${quoteNumber}</strong> :</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="padding: 8px; text-align: left;">Description</th>
              <th style="padding: 8px; text-align: center;">Qte</th>
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
        <p style="color: #888; font-size: 13px;">Ce devis est estimatif. Notre equipe vous recontactera pour confirmer les details et le prix final.</p>
        <p style="color: #888; font-size: 13px;">Au Format - Menuiserie sur mesure</p>
      </div>
    </div>
  `;

  return sendMail(to, `Votre devis ${quoteNumber} - Au Format`, html);
}
