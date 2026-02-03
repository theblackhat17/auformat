import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin, requireAuth, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const logs = await query(
      `SELECT al.*, p.full_name, p.email
       FROM activity_logs al
       LEFT JOIN profiles p ON al.user_id = p.id
       ORDER BY al.created_at DESC
       LIMIT 1000`
    );
    return NextResponse.json(logs);
  } catch (err) {
    console.error('List logs error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const ip = getClientIp(request);
    const ua = getUserAgent(request);

    await logActivity(
      auth.userId,
      body.actionType || 'view_page',
      body.targetType || 'page',
      body.targetId || null,
      body.details || null,
      ip,
      ua,
      body.success !== false
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Create log error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
