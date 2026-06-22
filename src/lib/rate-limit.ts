import { rawQuery } from './db';

/**
 * Rate limiting persistant (PostgreSQL) : fenêtre glissante par clé.
 * Survit aux redémarrages pm2, contrairement à l'ancien store en mémoire.
 * Fail-open : si la base est indisponible, on laisse passer plutôt que de
 * bloquer les connexions légitimes.
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

const IP_CONFIG: RateLimitConfig = { maxAttempts: 15, windowMs: 15 * 60 * 1000 };
const EMAIL_CONFIG: RateLimitConfig = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };
const CONTACT_CONFIG: RateLimitConfig = { maxAttempts: 3, windowMs: 60 * 60 * 1000 };
const QUOTE_CONFIG: RateLimitConfig = { maxAttempts: 5, windowMs: 60 * 60 * 1000 };

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

async function checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const res = await rawQuery(
      `SELECT COUNT(*)::int AS n, MIN(ts) AS oldest
       FROM rate_limit_hits
       WHERE key = $1 AND ts > NOW() - ($2 * interval '1 millisecond')`,
      [key, config.windowMs]
    );
    const n: number = res.rows[0]?.n ?? 0;
    if (n >= config.maxAttempts) {
      const oldest = res.rows[0]?.oldest ? new Date(res.rows[0].oldest).getTime() : Date.now();
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + config.windowMs - Date.now()) / 1000));
      return { allowed: false, retryAfterSeconds };
    }
    await rawQuery(`INSERT INTO rate_limit_hits (key) VALUES ($1)`, [key]);
    // Nettoyage opportuniste (~2 % des appels) : les traces de plus d'un jour ne servent plus
    if (Math.random() < 0.02) {
      void rawQuery(`DELETE FROM rate_limit_hits WHERE ts < NOW() - interval '1 day'`).catch(() => {});
    }
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err) {
    console.error('[rate-limit] check failed, allowing request:', err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export function checkIpRateLimit(ip: string): Promise<RateLimitResult> {
  return checkLimit(`ip:${ip}`, IP_CONFIG);
}

export function checkEmailRateLimit(email: string): Promise<RateLimitResult> {
  return checkLimit(`email:${email.toLowerCase()}`, EMAIL_CONFIG);
}

export async function resetEmailRateLimit(email: string): Promise<void> {
  try {
    await rawQuery(`DELETE FROM rate_limit_hits WHERE key = $1`, [`email:${email.toLowerCase()}`]);
  } catch { /* non bloquant */ }
}

export function checkContactRateLimit(ip: string): Promise<RateLimitResult> {
  return checkLimit(`contact:${ip}`, CONTACT_CONFIG);
}

export function checkQuoteRateLimit(ip: string): Promise<RateLimitResult> {
  return checkLimit(`quote:${ip}`, QUOTE_CONFIG);
}
