import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';
import { queryOne } from './db';
import type { Profile } from './types';

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
  const token = request.cookies.get('auformat-session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Session expiree' }, { status: 401 });
  }

  const profile = await queryOne<Profile>(
    `SELECT id, email, full_name, company_name, phone, address, role,
            avatar_url, discount_rate, created_at, updated_at
     FROM profiles WHERE id = $1`,
    [payload.userId]
  );

  if (!profile) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 401 });
  }

  return { userId: payload.userId, role: profile.role, profile };
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
 * Extract client IP from request headers (set by Nginx)
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}
