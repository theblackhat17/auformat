import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await queryOne(`
      SELECT
        (SELECT COUNT(*)::int FROM activity_logs WHERE created_at >= $1) as logs_today,
        (SELECT COUNT(DISTINCT user_id)::int FROM activity_logs WHERE created_at >= $1 AND user_id IS NOT NULL) as active_users,
        (SELECT COUNT(*)::int FROM activity_logs WHERE created_at >= $1 AND success = false) as error_count
    `, [today.toISOString()]);

    // Calculate success rate
    const totalToday = await rawQuery(
      'SELECT COUNT(*)::int as count FROM activity_logs WHERE created_at >= $1',
      [today.toISOString()]
    );
    const successToday = await rawQuery(
      'SELECT COUNT(*)::int as count FROM activity_logs WHERE created_at >= $1 AND success = true',
      [today.toISOString()]
    );

    const total = totalToday.rows[0]?.count || 0;
    const success = successToday.rows[0]?.count || 0;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 100;

    return NextResponse.json({ ...(stats ?? {}), successRate });
  } catch (err) {
    console.error('Log stats error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
