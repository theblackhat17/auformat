import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { auth } from './better-auth';
import type { Profile } from './types';

/**
 * Hash a password with bcrypt (12 rounds)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Get the current authenticated user (server-side)
 * Returns profile without password_hash
 */
export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) return null;

    const user = session.user;
    return {
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
  } catch {
    return null;
  }
}
