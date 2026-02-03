import { rawQuery } from './db';

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
