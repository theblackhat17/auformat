import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { queryOne } from './db';
import type { Profile, ProfileRow, JwtPayload } from './types';
import { toCamelCase } from './db';

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = 'auformat-session';
const TOKEN_EXPIRY = '7d';

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
 * Sign a JWT token
 */
export function signToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Set the authentication cookie (httpOnly, secure in production)
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

/**
 * Clear the authentication cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get the auth token from cookies
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

/**
 * Get the current authenticated user (server-side)
 * Returns profile without password_hash
 */
export async function getCurrentUser(): Promise<Profile | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await queryOne<Profile>(
    `SELECT id, email, full_name, company_name, phone, address, role,
            avatar_url, discount_rate, created_at, updated_at
     FROM profiles WHERE id = $1`,
    [payload.userId]
  );

  return user;
}

/**
 * Get the current user's JWT payload from cookies (lightweight, no DB query)
 */
export async function getAuthPayload(): Promise<JwtPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;
  return verifyToken(token);
}
