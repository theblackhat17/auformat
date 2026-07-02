import { google, calendar_v3 } from 'googleapis';
import { queryOne, rawQuery } from '@/lib/db';
import { PROJECT_EVENT_TYPES } from '@/lib/constants';
import type { ProjectEvent } from '@/lib/types';

/**
 * Synchronisation Google Agenda (sens unique : site → Google).
 * Réutilise le client OAuth Google déjà configuré pour la connexion (better-auth) ;
 * le refresh token est stocké côté serveur dans project_settings (clé 'google_calendar')
 * et ne doit JAMAIS être renvoyé au client ni journalisé.
 */

export const GOOGLE_CAL_SCOPES = ['https://www.googleapis.com/auth/calendar', 'openid', 'email'];

export const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'https://auformat.com'}/api/admin/google/callback`;

const SETTINGS_KEY = 'google_calendar';
const TIMEZONE = 'Europe/Paris';

interface GoogleCalendarConfig {
  refreshToken: string;
  email: string | null;
  calendarId: string;
}

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

/** URL de consentement Google (prompt=consent pour garantir un refresh token) */
export function getAuthUrl(): string {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_CAL_SCOPES,
  });
}

/** Lit la configuration stockée ; null si absente ou sans refresh token */
export async function getGoogleConfig(): Promise<GoogleCalendarConfig | null> {
  const row = await queryOne<{ value: Partial<GoogleCalendarConfig> | null }>(
    'SELECT value FROM project_settings WHERE key = $1', [SETTINGS_KEY]
  );
  const value = row?.value;
  if (!value || typeof value !== 'object' || typeof value.refreshToken !== 'string' || !value.refreshToken) {
    return null;
  }
  return {
    refreshToken: value.refreshToken,
    email: typeof value.email === 'string' ? value.email : null,
    calendarId: typeof value.calendarId === 'string' && value.calendarId ? value.calendarId : 'primary',
  };
}

export async function saveGoogleConfig(cfg: GoogleCalendarConfig): Promise<void> {
  await rawQuery(
    `INSERT INTO project_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [SETTINGS_KEY, JSON.stringify(cfg)]
  );
}

export async function clearGoogleConfig(): Promise<void> {
  await rawQuery('DELETE FROM project_settings WHERE key = $1', [SETTINGS_KEY]);
}

/** Statut exposable au client : jamais le refresh token */
export async function getGoogleStatus(): Promise<{ connected: boolean; email: string | null; calendarId: string | null }> {
  const cfg = await getGoogleConfig();
  return {
    connected: !!cfg,
    email: cfg?.email ?? null,
    calendarId: cfg?.calendarId ?? null,
  };
}

/**
 * Échange le code OAuth contre des tokens et persiste la configuration.
 * Google ne renvoie un refresh_token qu'au premier consentement (ou avec prompt=consent) :
 * si absent, on conserve le refresh token déjà stocké. Erreur si aucun n'est utilisable.
 */
export async function exchangeCodeAndStore(code: string): Promise<void> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);

  const existing = await getGoogleConfig();
  const refreshToken = tokens.refresh_token || existing?.refreshToken;
  if (!refreshToken) {
    throw new Error('Aucun refresh token Google disponible');
  }

  let email: string | null = existing?.email ?? null;
  try {
    client.setCredentials(tokens);
    const userinfo = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
    email = userinfo.data.email || email;
  } catch {
    // Best effort : l'email est purement informatif
  }

  await saveGoogleConfig({ refreshToken, email, calendarId: existing?.calendarId || 'primary' });
}

/** Client Calendar authentifié, ou null si non connecté */
async function getCalendarClient(): Promise<{ calendar: calendar_v3.Calendar; calendarId: string } | null> {
  const cfg = await getGoogleConfig();
  if (!cfg) return null;
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: cfg.refreshToken });
  return { calendar: google.calendar({ version: 'v3', auth }), calendarId: cfg.calendarId };
}

/** Date locale « YYYY-MM-DD » (Europe/Paris) d'un instant */
function parisDateString(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

/** Ajoute n jours à une date « YYYY-MM-DD » (la date de fin Google est exclusive) */
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Convertit un événement projet en ressource d'événement Google */
export function eventToGoogleBody(ev: ProjectEvent, projectName: string): calendar_v3.Schema$Event {
  const typeLabel = PROJECT_EVENT_TYPES.find((t) => t.key === ev.type)?.label || ev.title || ev.type;
  const start = new Date(ev.startAt);
  const end = ev.endAt ? new Date(ev.endAt) : null;

  const body: calendar_v3.Schema$Event = {
    summary: `${typeLabel} — ${projectName}`,
    description: ev.notes || '',
  };

  if (ev.allDay) {
    const startDate = parisDateString(start);
    const endDate = end ? parisDateString(end) : startDate;
    body.start = { date: startDate };
    // Google attend une date de fin exclusive pour les événements « journée entière »
    body.end = { date: addDays(endDate, 1) };
  } else {
    const endAt = end || new Date(start.getTime() + 60 * 60 * 1000);
    body.start = { dateTime: start.toISOString(), timeZone: TIMEZONE };
    body.end = { dateTime: endAt.toISOString(), timeZone: TIMEZONE };
  }

  return body;
}

/**
 * Pousse (crée ou met à jour) un événement vers Google Agenda.
 * Best effort : ne lève jamais, renvoie null en cas d'échec ou si non connecté.
 */
export async function pushEventToGoogle(ev: ProjectEvent, projectName: string): Promise<string | null> {
  try {
    const client = await getCalendarClient();
    if (!client) return null;
    const { calendar, calendarId } = client;
    const requestBody = eventToGoogleBody(ev, projectName);

    if (ev.googleEventId) {
      await calendar.events.update({ calendarId, eventId: ev.googleEventId, requestBody });
      return ev.googleEventId;
    }
    const created = await calendar.events.insert({ calendarId, requestBody });
    return created.data.id || null;
  } catch (err) {
    console.error('Google Calendar push error:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Supprime un événement de Google Agenda (best effort, ne lève jamais) */
export async function deleteEventFromGoogle(googleEventId: string): Promise<void> {
  try {
    const client = await getCalendarClient();
    if (!client) return;
    await client.calendar.events.delete({ calendarId: client.calendarId, eventId: googleEventId });
  } catch (err) {
    console.error('Google Calendar delete error:', err instanceof Error ? err.message : err);
  }
}
