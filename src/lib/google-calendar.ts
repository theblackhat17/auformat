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

// Origine canonique de prod (BETTER_AUTH_URL = https://auformat.com). On évite NEXT_PUBLIC_APP_URL
// qui peut valoir http://localhost:3000 → sinon redirect_uri_mismatch côté Google.
export const APP_ORIGIN = (process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://auformat.com').replace(/\/$/, '');
export const REDIRECT_URI = `${APP_ORIGIN}/api/admin/google/callback`;

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

/** Liste les agendas accessibles par le compte connecté (pour choisir la cible, ex. « AU FORMAT ») */
export async function listCalendars(): Promise<{ id: string; summary: string; primary: boolean }[]> {
  try {
    const client = await getCalendarClient();
    if (!client) return [];
    const res = await client.calendar.calendarList.list({ maxResults: 250, showHidden: false });
    return (res.data.items || [])
      .filter((c) => !!c.id && (c.accessRole === 'owner' || c.accessRole === 'writer'))
      .map((c) => ({ id: c.id as string, summary: c.summaryOverride || c.summary || (c.id as string), primary: !!c.primary }));
  } catch (err) {
    console.error('Google Calendar list error:', err instanceof Error ? err.message : err);
    return [];
  }
}

/** Change l'agenda cible (ex. bascule de « primary » vers l'agenda « AU FORMAT ») */
export async function setCalendarId(calendarId: string): Promise<void> {
  const cfg = await getGoogleConfig();
  if (!cfg) throw new Error('Google Agenda non connecté');
  await saveGoogleConfig({ ...cfg, calendarId: calendarId || 'primary' });
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

export interface GoogleAgendaEvent {
  id: string;
  summary: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  htmlLink: string | null;
}

/** Lit les événements de l'agenda cible sur une plage (sens Google → site). Best effort. */
export async function listGoogleEvents(fromISO: string, toISO: string): Promise<GoogleAgendaEvent[]> {
  try {
    const client = await getCalendarClient();
    if (!client) return [];
    const res = await client.calendar.events.list({
      calendarId: client.calendarId,
      timeMin: fromISO,
      timeMax: toISO,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    });
    return (res.data.items || [])
      .filter((e) => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
      .map((e) => {
        const allDay = !!e.start?.date && !e.start?.dateTime;
        // Google : end.date des événements « journée entière » est exclusif → on retire 1 jour
        let endAt: string | null = e.end?.dateTime || null;
        if (allDay && e.end?.date) {
          const d = new Date(`${e.end.date}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() - 1);
          endAt = `${d.toISOString().slice(0, 10)}T00:00:00`;
        }
        return {
          id: e.id || '',
          summary: e.summary || '(Sans titre)',
          startAt: e.start?.dateTime || (e.start?.date ? `${e.start.date}T00:00:00` : ''),
          endAt,
          allDay,
          htmlLink: e.htmlLink || null,
        };
      })
      .filter((e) => e.id && e.startAt);
  } catch (err) {
    console.error('Google Calendar list events error:', err instanceof Error ? err.message : err);
    return [];
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
