const UMAMI_URL = process.env.UMAMI_INTERNAL_URL || 'http://localhost:3001';
const UMAMI_USERNAME = process.env.UMAMI_USERNAME || 'admin';
// Compat : UMAMI_PASSWORD (nom canonique) ou UMAMI_PASS (ancien nom dans .env.local),
// avec repli sur le défaut Umami pour ne pas casser une installation existante.
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD || process.env.UMAMI_PASS || 'umami';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(force = false): Promise<string> {
  if (!force && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch(`${UMAMI_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: UMAMI_USERNAME, password: UMAMI_PASSWORD }),
  });

  if (!res.ok) {
    cachedToken = null;
    throw new Error(`Umami auth failed: ${res.status}`);
  }

  const { token } = await res.json();
  cachedToken = { token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return token;
}

async function umamiGet<T>(path: string): Promise<T> {
  let token = await getToken();
  let res = await fetch(`${UMAMI_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  // Token caché révoqué (redémarrage Umami, rotation du secret…) : on ré-authentifie une fois
  if (res.status === 401) {
    token = await getToken(true);
    res = await fetch(`${UMAMI_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
  }
  if (!res.ok) throw new Error(`Umami API error: ${res.status} ${path}`);
  return res.json();
}

/**
 * État de la connexion Umami : service joignable (heartbeat) et authentification OK.
 * Utilisé par la page Analytics pour afficher un statut clair au lieu d'une erreur brute.
 */
export async function getUmamiHealth(): Promise<{ up: boolean; auth: boolean }> {
  try {
    const hb = await fetch(`${UMAMI_URL}/api/heartbeat`, { next: { revalidate: 0 }, signal: AbortSignal.timeout(4000) });
    if (!hb.ok) return { up: false, auth: false };
  } catch {
    return { up: false, auth: false };
  }
  try {
    await getToken(true);
    return { up: true, auth: true };
  } catch {
    return { up: true, auth: false };
  }
}

// --- Types ---

interface UmamiStatsRaw {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
  comparison: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
}

export interface UmamiStats {
  pageviews: { value: number; prev: number };
  visitors: { value: number; prev: number };
  visits: { value: number; prev: number };
  bounces: { value: number; prev: number };
  totaltime: { value: number; prev: number };
}

export interface UmamiMetric {
  x: string;
  y: number;
}

export interface UmamiActiveVisitors {
  visitors: number;
}

export interface UmamiPageview {
  x: string;
  y: number;
}

export interface UmamiSession {
  id: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  language: string;
  country: string;
  city: string | null;
  firstAt: string;
  lastAt: string;
  visits: number;
  views: number;
}

export interface UmamiEvent {
  id: string;
  sessionId: string;
  createdAt: string;
  urlPath: string;
  referrerPath: string | null;
  referrerDomain: string | null;
  pageTitle: string;
  browser: string;
  os: string;
  device: string;
  country: string;
  eventType: number;
  eventName: string | null;
}

// --- API calls ---

export async function getActiveVisitors(websiteId: string) {
  return umamiGet<UmamiActiveVisitors>(`/api/websites/${websiteId}/active`);
}

export async function getStats(websiteId: string, startAt: number, endAt: number): Promise<UmamiStats> {
  const raw = await umamiGet<UmamiStatsRaw>(
    `/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`
  );
  return {
    pageviews: { value: raw.pageviews, prev: raw.comparison.pageviews },
    visitors: { value: raw.visitors, prev: raw.comparison.visitors },
    visits: { value: raw.visits, prev: raw.comparison.visits },
    bounces: { value: raw.bounces, prev: raw.comparison.bounces },
    totaltime: { value: raw.totaltime, prev: raw.comparison.totaltime },
  };
}

export async function getPageviews(websiteId: string, startAt: number, endAt: number, unit = 'day') {
  return umamiGet<{ pageviews: UmamiPageview[]; sessions: UmamiPageview[] }>(
    `/api/websites/${websiteId}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=${unit}&timezone=Europe/Paris`
  );
}

type MetricType = 'path' | 'referrer' | 'browser' | 'os' | 'device' | 'country' | 'city' | 'title' | 'language' | 'screen' | 'event' | 'query' | 'region';

export async function getMetrics(websiteId: string, startAt: number, endAt: number, type: MetricType) {
  return umamiGet<UmamiMetric[]>(
    `/api/websites/${websiteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=${type}`
  );
}

export async function getSessions(websiteId: string, startAt: number, endAt: number) {
  return umamiGet<{ data: UmamiSession[]; count: number }>(
    `/api/websites/${websiteId}/sessions?startAt=${startAt}&endAt=${endAt}`
  );
}

export async function getEvents(websiteId: string, startAt: number, endAt: number) {
  return umamiGet<{ data: UmamiEvent[]; count: number }>(
    `/api/websites/${websiteId}/events?startAt=${startAt}&endAt=${endAt}&pageSize=200`
  );
}
