interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.firstAttempt > 30 * 60 * 1000) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

const IP_CONFIG: RateLimitConfig = {
  maxAttempts: 15,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 15 * 60 * 1000, // blocked 15 minutes
};

const EMAIL_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationMs: 30 * 60 * 1000, // blocked 30 minutes
};

function checkLimit(key: string, config: RateLimitConfig): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, firstAttempt: now, blockedUntil: 0 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // Currently blocked
  if (entry.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // Window expired, reset
  if (now - entry.firstAttempt > config.windowMs) {
    store.set(key, { count: 1, firstAttempt: now, blockedUntil: 0 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  entry.count++;

  if (entry.count > config.maxAttempts) {
    entry.blockedUntil = now + config.blockDurationMs;
    const retryAfterSeconds = Math.ceil(config.blockDurationMs / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function checkIpRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  return checkLimit(`ip:${ip}`, IP_CONFIG);
}

export function checkEmailRateLimit(email: string): { allowed: boolean; retryAfterSeconds: number } {
  return checkLimit(`email:${email.toLowerCase()}`, EMAIL_CONFIG);
}

export function resetEmailRateLimit(email: string): void {
  store.delete(`email:${email.toLowerCase()}`);
}
