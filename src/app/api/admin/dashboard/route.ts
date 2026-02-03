import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import type { DashboardStats } from '@/lib/types';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const stats = await queryOne<DashboardStats>(`
      SELECT
        (SELECT COUNT(*)::int FROM profiles WHERE role = 'client') as total_clients,
        (SELECT COUNT(*)::int FROM quotes WHERE status IN ('sent', 'viewed')) as pending_quotes,
        (SELECT COALESCE(SUM(total_ttc), 0)::float FROM quotes
         WHERE status = 'accepted'
         AND EXTRACT(MONTH FROM accepted_at) = EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM accepted_at) = EXTRACT(YEAR FROM NOW())
        ) as monthly_revenue,
        (SELECT COUNT(*)::int FROM projects WHERE status IN ('in_production', 'quoted')) as active_projects,
        (SELECT COUNT(*)::int FROM quotes WHERE status = 'accepted') as total_orders
    `);

    return NextResponse.json(stats);
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
