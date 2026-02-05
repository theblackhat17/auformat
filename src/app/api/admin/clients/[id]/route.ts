import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query, rawQuery } from '@/lib/db';
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // Prevent deleting yourself
    if (id === auth.userId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 });
    }

    const profile = await queryOne<{ id: string; role: string }>('SELECT id, role FROM profiles WHERE id = $1', [id]);
    if (!profile) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Nullify references in shared tables
    await rawQuery('UPDATE settings SET updated_by = NULL WHERE updated_by = $1', [id]);
    await rawQuery('UPDATE uploads SET uploaded_by = NULL WHERE uploaded_by = $1', [id]);

    // Delete user-owned data
    await rawQuery('DELETE FROM activity_logs WHERE user_id = $1', [id]);
    await rawQuery('DELETE FROM notifications WHERE user_id = $1', [id]);
    await rawQuery('DELETE FROM user_sessions WHERE user_id = $1', [id]);
    await rawQuery('DELETE FROM quotes WHERE user_id = $1', [id]);
    await rawQuery('DELETE FROM projects WHERE user_id = $1', [id]);

    // Delete the profile
    await rawQuery('DELETE FROM profiles WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin delete client error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const { role } = await request.json();

    if (role !== 'admin' && role !== 'client') {
      return NextResponse.json({ error: 'Role invalide' }, { status: 400 });
    }

    // Prevent demoting yourself
    if (id === auth.userId && role !== 'admin') {
      return NextResponse.json({ error: 'Vous ne pouvez pas retirer votre propre role admin' }, { status: 400 });
    }

    await rawQuery(
      'UPDATE profiles SET role = $1, updated_at = NOW() WHERE id = $2',
      [role, id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin role update error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
