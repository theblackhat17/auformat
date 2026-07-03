import { Pool } from 'pg';
import { sendQuoteReminderEmail, sendQuoteExpiryEmail, sendReviewRequestEmail, sendRdvReminderEmail } from '../lib/mailer';
import { PROJECT_EVENT_TYPES } from '../lib/constants';

/**
 * Tâches quotidiennes (lancé chaque matin par cron) :
 * 1. devis envoyé/consulté sans réponse depuis 7 jours → email de relance (une seule fois) ;
 * 2. devis qui expire dans les 5 jours → email « votre devis expire bientôt » (une seule fois) ;
 * 3. devis dont la validité est dépassée → statut 'expired' ;
 * 4. projet terminé depuis 3 jours → demande d'avis Google (si le lien est configuré
 *    dans Admin → Paramètres, une seule fois par projet) ;
 * 5. RDV client demain (Europe/Paris) → rappel J-1 au client (une seule fois par événement,
 *    types visibles client uniquement — jamais les jours d'atelier).
 * Lancement : npx tsx src/scripts/cron-relances-devis.ts (avec .env.local sourcé).
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

type QuoteRow = {
  id: string;
  quote_number: string;
  total_ttc: string;
  valid_until: string | null;
  client_name: string | null;
  client_email: string | null;
  profile_email: string | null;
  profile_name: string | null;
};

const recipient = (q: QuoteRow) => ({
  email: (q.client_email || q.profile_email || '').toLowerCase(),
  name: q.client_name || q.profile_name || 'client',
});

// 5. Rappels J-1 : RDV client (types visibles client uniquement) qui ont lieu demain (Europe/Paris)
async function remindRdv(pool: Pool): Promise<number> {
  const clientVisibleTypes = PROJECT_EVENT_TYPES.filter((t) => t.clientVisible).map((t) => t.key);
  const events = await pool.query<{
    id: string;
    type: string;
    start_at: string;
    all_day: boolean;
    project_name: string;
    client_name: string | null;
    client_email: string | null;
  }>(
    `SELECT e.id, e.type, e.start_at, e.all_day, p.name AS project_name,
            pr.full_name AS client_name, pr.email AS client_email
     FROM project_events e
     JOIN projects p ON e.project_id = p.id
     LEFT JOIN profiles pr ON p.user_id = pr.id
     WHERE e.reminder_sent_at IS NULL
       AND e.type = ANY($1)
       AND (e.start_at AT TIME ZONE 'Europe/Paris')::date = ((NOW() AT TIME ZONE 'Europe/Paris')::date + INTERVAL '1 day')`,
    [clientVisibleTypes]
  );

  let sent = 0;
  for (const e of events.rows) {
    const email = (e.client_email || '').toLowerCase();
    if (!email || email.endsWith('@anonyme.local')) continue;
    const typeLabel = PROJECT_EVENT_TYPES.find((t) => t.key === e.type)?.label || 'Rendez-vous';
    const start = new Date(e.start_at);
    const dateLabel = start.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
    });
    const whenLabel = e.all_day
      ? dateLabel
      : `${dateLabel} à ${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`;
    const ok = await sendRdvReminderEmail(email, {
      clientName: e.client_name || 'client',
      typeLabel,
      projectName: e.project_name,
      whenLabel,
    });
    if (ok) {
      await pool.query(`UPDATE project_events SET reminder_sent_at = NOW() WHERE id = $1`, [e.id]);
      console.log(`  rappel J-1 envoyé : ${typeLabel} « ${e.project_name} » (${whenLabel}) → ${email}`);
      sent++;
    }
  }
  return sent;
}

async function run() {
  const stamp = new Date().toISOString();
  console.log(`[relances] ${stamp}`);

  // 3. Marque les devis dépassés comme expirés (avant les relances, pour ne pas relancer un mort)
  const expired = await pool.query(
    `UPDATE quotes SET status = 'expired', updated_at = NOW()
     WHERE status IN ('sent', 'viewed') AND valid_until IS NOT NULL AND valid_until < NOW()
     RETURNING quote_number`
  );
  if (expired.rows.length) console.log(`  ${expired.rows.length} devis passés en expiré : ${expired.rows.map((r) => r.quote_number).join(', ')}`);

  // 1. Relance J+7 sans réponse
  const toRemind = await pool.query<QuoteRow>(
    `SELECT q.id, q.quote_number, q.total_ttc, q.valid_until, q.client_name, q.client_email,
            p.email AS profile_email, p.full_name AS profile_name
     FROM quotes q LEFT JOIN profiles p ON p.id = q.user_id
     WHERE q.status IN ('sent', 'viewed')
       AND q.sent_at IS NOT NULL AND q.sent_at < NOW() - interval '7 days'
       AND q.reminder_sent_at IS NULL
       AND (q.valid_until IS NULL OR q.valid_until > NOW())`
  );
  for (const q of toRemind.rows) {
    const { email, name } = recipient(q);
    if (!email || email.endsWith('@anonyme.local')) continue;
    const ok = await sendQuoteReminderEmail(email, name, q.quote_number, Number(q.total_ttc), q.valid_until);
    if (ok) {
      await pool.query(`UPDATE quotes SET reminder_sent_at = NOW() WHERE id = $1`, [q.id]);
      console.log(`  relance J+7 envoyée : ${q.quote_number} → ${email}`);
    }
  }

  // 2. Expiration dans 5 jours
  const toWarn = await pool.query<QuoteRow>(
    `SELECT q.id, q.quote_number, q.total_ttc, q.valid_until, q.client_name, q.client_email,
            p.email AS profile_email, p.full_name AS profile_name
     FROM quotes q LEFT JOIN profiles p ON p.id = q.user_id
     WHERE q.status IN ('sent', 'viewed')
       AND q.valid_until IS NOT NULL
       AND q.valid_until BETWEEN NOW() AND NOW() + interval '5 days'
       AND q.expiry_reminder_sent_at IS NULL`
  );
  for (const q of toWarn.rows) {
    const { email, name } = recipient(q);
    if (!email || email.endsWith('@anonyme.local') || !q.valid_until) continue;
    const ok = await sendQuoteExpiryEmail(email, name, q.quote_number, q.valid_until);
    if (ok) {
      await pool.query(`UPDATE quotes SET expiry_reminder_sent_at = NOW() WHERE id = $1`, [q.id]);
      console.log(`  alerte expiration envoyée : ${q.quote_number} → ${email}`);
    }
  }

  // 4. Demandes d'avis Google : projets terminés depuis 3 jours, jamais sollicités
  let reviewCount = 0;
  const settings = await pool.query<{ google_review_url: string | null }>(
    `SELECT google_review_url FROM site_settings LIMIT 1`
  );
  const reviewUrl = settings.rows[0]?.google_review_url;
  if (reviewUrl) {
    const completed = await pool.query<{ id: string; name: string; email: string; full_name: string | null }>(
      `SELECT p.id, p.name, pr.email, pr.full_name
       FROM projects p JOIN profiles pr ON pr.id = p.user_id
       WHERE p.status = 'completed'
         AND p.updated_at < NOW() - interval '3 days'
         AND p.review_request_sent_at IS NULL
         AND pr.role != 'admin'
         AND pr.email NOT LIKE '%@anonyme.local'`
    );
    for (const p of completed.rows) {
      const ok = await sendReviewRequestEmail(p.email, p.full_name || p.email.split('@')[0], p.name, reviewUrl);
      if (ok) {
        // updated_at inchangé : on ne fausse pas la date de fin du chantier
        await pool.query(`UPDATE projects SET review_request_sent_at = NOW() WHERE id = $1`, [p.id]);
        console.log(`  demande d'avis Google envoyée : « ${p.name} » → ${p.email}`);
        reviewCount++;
      }
    }
  }

  // 5. Rappels J-1 des rendez-vous client (une erreur ici ne bloque pas le reste)
  let rdvCount = 0;
  try {
    rdvCount = await remindRdv(pool);
    console.log(`  ${rdvCount} rappel${rdvCount > 1 ? 's' : ''} de RDV J-1 envoyé${rdvCount > 1 ? 's' : ''}`);
  } catch (err) {
    console.error('  échec des rappels de RDV J-1 :', err);
  }

  // Ménage du rate limiting persistant
  await pool.query(`DELETE FROM rate_limit_hits WHERE ts < NOW() - interval '1 day'`);

  console.log(`  terminé (${toRemind.rows.length} relances, ${toWarn.rows.length} alertes, ${reviewCount} demandes d'avis, ${rdvCount} rappels RDV)`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
