import { NextRequest, NextResponse } from 'next/server';
import { auth } from './better-auth';
import { headers } from 'next/headers';
import { rawQuery } from './db';
import type { Profile } from './types';

/**
 * Marque l'utilisateur comme « vu à l'instant » (profiles.last_seen_at).
 * Throttlé côté SQL (au plus une écriture / 10 min) et fire-and-forget :
 * n'ajoute aucune latence et ne fait jamais échouer la requête appelante.
 */
export function touchLastSeen(userId: string): void {
  void rawQuery(
    `UPDATE profiles SET last_seen_at = NOW()
     WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '10 minutes')`,
    [userId]
  ).catch(() => { /* best effort */ });
}

export interface AuthenticatedRequest {
  userId: string;
  role: string;
  profile: Profile;
}

/**
 * Require authentication for an API route.
 * Returns the authenticated user info, or a 401 JSON response.
 */
export async function requireAuth(request: NextRequest): Promise<AuthenticatedRequest | NextResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const user = session.user;
    const profile: Profile = {
      id: user.id,
      email: user.email,
      fullName: (user as Record<string, unknown>).fullName as string || user.name || null,
      companyName: (user as Record<string, unknown>).companyName as string || null,
      phone: (user as Record<string, unknown>).phone as string || null,
      address: (user as Record<string, unknown>).address as string || null,
      role: ((user as Record<string, unknown>).role as string || 'client') as 'client' | 'admin',
      avatarUrl: user.image || null,
      discountRate: (user as Record<string, unknown>).discountRate as number || 0,
      createdAt: user.createdAt?.toISOString?.() || String(user.createdAt),
      updatedAt: user.updatedAt?.toISOString?.() || String(user.updatedAt),
    };

    touchLastSeen(user.id);
    return { userId: user.id, role: profile.role, profile };
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Erreur d\'authentification' }, { status: 500 });
  }
}

/**
 * Require admin role for an API route.
 * Returns the authenticated admin info, or a 401/403 JSON response.
 */
export async function requireAdmin(request: NextRequest): Promise<AuthenticatedRequest | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;

  if (result.role !== 'admin') {
    return NextResponse.json({ error: 'Acces reserve aux administrateurs' }, { status: 403 });
  }

  return result;
}

/**
 * Rôle de la session courante sans bloquer la requête (null si non connecté).
 * Utile pour adapter une réponse publique selon admin/client sans renvoyer 401.
 */
export async function getOptionalRole(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    return ((session.user as Record<string, unknown>).role as string) || 'client';
  } catch {
    return null;
  }
}

/**
 * Vraie IP du client pour le rate limiting.
 *
 * Chaîne de proxy réelle : client → Cloudflare (tunnel) → cloudflared (local) →
 * nginx (127.0.0.1) → app. Deux pièges à éviter :
 *  - `x-real-ip` / `$remote_addr` vaut l'adresse de cloudflared (constante) — inutilisable.
 *  - la PREMIÈRE valeur de `x-forwarded-for` est fournie par le client : usurpable à
 *    volonté (il suffit d'envoyer un XFF aléatoire pour repartir de zéro).
 *
 * Cloudflare écrase toujours `CF-Connecting-IP` avec l'IP observée à la périphérie
 * et ignore toute valeur envoyée par le client : c'est la seule source de confiance
 * (l'app n'étant joignable que par le tunnel). On retombe sur la DERNIÈRE valeur de
 * XFF — celle injectée par le proxy de confiance — jamais la première.
 */
export function getClientIp(request: NextRequest): string {
  const cf = request.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;

  const trueClient = request.headers.get('true-client-ip')?.trim();
  if (trueClient) return trueClient;

  const xff = (request.headers.get('x-forwarded-for') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (xff.length > 0) return xff[xff.length - 1];

  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}
