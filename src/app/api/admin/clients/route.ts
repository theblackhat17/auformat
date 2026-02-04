import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const clients = await query(`
      SELECT
        p.id, p.email, p.full_name, p.company_name, p.phone, p.address,
        p.role, p.avatar_url, p.discount_rate, p.created_at, p.updated_at,
        COALESCE(proj.total_projects, 0)::int as total_projects,
        COALESCE(q.total_quotes, 0)::int as total_quotes,
        COALESCE(q.accepted_quotes, 0)::int as accepted_quotes,
        COALESCE(q.total_revenue, 0)::float as total_revenue,
        COALESCE(s.total_logins, 0)::int as total_logins,
        s.last_login
      FROM profiles p
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int as total_projects
        FROM projects GROUP BY user_id
      ) proj ON proj.user_id = p.id
      LEFT JOIN (
        SELECT user_id,
          COUNT(*)::int as total_quotes,
          COUNT(*) FILTER (WHERE status = 'accepted')::int as accepted_quotes,
          COALESCE(SUM(total_ttc) FILTER (WHERE status = 'accepted'), 0) as total_revenue
        FROM quotes GROUP BY user_id
      ) q ON q.user_id = p.id
      LEFT JOIN (
        SELECT user_id,
          COUNT(*)::int as total_logins,
          MAX(logged_in_at) as last_login
        FROM user_sessions GROUP BY user_id
      ) s ON s.user_id = p.id
      ORDER BY p.role ASC, p.created_at DESC
    `);

    return NextResponse.json(clients);
  } catch (err) {
    console.error('Admin clients error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
