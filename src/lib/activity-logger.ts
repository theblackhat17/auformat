import { NextRequest } from 'next/server';
import { rawQuery } from './db';
import type { AuthenticatedRequest } from './middleware-auth';

/**
 * Log an activity to the activity_logs table (server-side)
 */
export async function logActivity(
  userId: string | null,
  actionType: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> | null,
  ipAddress: string,
  userAgent: string,
  success: boolean = true
): Promise<void> {
  try {
    await rawQuery(
      `INSERT INTO activity_logs (user_id, action_type, target_type, target_id, details, ip_address, user_agent, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, actionType, targetType, targetId, details ? JSON.stringify(details) : null, ipAddress, userAgent, success]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

/**
 * Simplified logging for admin API routes.
 * Extracts IP/UserAgent from request and userId from auth result.
 */
export function logAdminAction(
  request: NextRequest,
  auth: AuthenticatedRequest,
  actionType: string,
  targetType: string,
  targetId: string | null,
  description: string,
): void {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';
  void logActivity(auth.userId, actionType, targetType, targetId, { description }, ip, ua);
}

/**
 * Log a user session (login event)
 */
export async function logSession(
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  try {
    await rawQuery(
      `INSERT INTO user_sessions (user_id, ip_address, user_agent, logged_in_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, ipAddress, userAgent]
    );
  } catch (err) {
    console.error('Failed to log session:', err);
  }
}
