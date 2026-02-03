import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // Client profile with stats
    const client = await queryOne(`
      SELECT
        p.id, p.email, p.full_name, p.company_name, p.phone, p.address,
        p.avatar_url, p.discount_rate, p.created_at, p.updated_at,
        COALESCE(proj.total_projects, 0)::int as total_projects,
        COALESCE(proj.draft_projects, 0)::int as draft_projects,
        COALESCE(proj.quote_requested_projects, 0)::int as quote_requested_projects,
        COALESCE(q.total_quotes, 0)::int as total_quotes,
        COALESCE(q.accepted_quotes, 0)::int as accepted_quotes,
        COALESCE(q.total_revenue, 0)::float as total_revenue,
        COALESCE(s.total_logins, 0)::int as total_logins,
        s.last_login
      FROM profiles p
      LEFT JOIN (
        SELECT user_id,
          COUNT(*)::int as total_projects,
          COUNT(*) FILTER (WHERE status = 'draft')::int as draft_projects,
          COUNT(*) FILTER (WHERE status = 'quote_requested')::int as quote_requested_projects
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
      WHERE p.id = $1
    `, [id]);

    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    // Get projects
    const projects = await query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get quotes
    const quotes = await query(
      'SELECT * FROM quotes WHERE user_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get sessions
    const sessions = await query(
      'SELECT * FROM user_sessions WHERE user_id = $1 ORDER BY logged_in_at DESC LIMIT 10',
      [id]
    );

    return NextResponse.json({ client, projects, quotes, sessions });
  } catch (err) {
    console.error('Admin client detail error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
