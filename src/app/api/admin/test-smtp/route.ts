import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { to } = await request.json();

  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: 'Champ "to" (email destinataire) requis' }, { status: 400 });
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465');
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || 'noreply@auformat.fr';

  if (!host || !user || !pass) {
    return NextResponse.json({
      success: false,
      error: 'SMTP non configure: variables SMTP_HOST, SMTP_USER ou SMTP_PASS manquantes',
      config: { host: host ? '***' : 'MISSING', port, secure, user: user ? '***' : 'MISSING', from },
    }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });

  // Step 1: Verify connection
  try {
    await transporter.verify();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      success: false,
      step: 'connection',
      error: `Connexion SMTP echouee: ${message}`,
      config: { host: '***', port, secure, user: '***', from },
    }, { status: 500 });
  }

  // Step 2: Send test email
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: '[Test] Au Format - Test SMTP',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
          <div style="background: #2C5F2D; color: white; padding: 20px;">
            <h2 style="margin: 0;">Test SMTP - Au Format</h2>
          </div>
          <div style="padding: 20px;">
            <p>Ce mail confirme que la configuration SMTP fonctionne correctement.</p>
            <p style="color: #888; font-size: 13px;">Envoye le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Email de test envoye a ${to}`,
      messageId: info.messageId,
      config: { host: '***', port, secure, user: '***', from },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      success: false,
      step: 'send',
      error: `Connexion OK mais envoi echoue: ${message}`,
      config: { host: '***', port, secure, user: '***', from },
    }, { status: 500 });
  }
}
