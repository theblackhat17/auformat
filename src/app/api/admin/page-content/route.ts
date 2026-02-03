import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query('SELECT * FROM page_content ORDER BY page_key, sort_order');
    return NextResponse.json(rows);
  } catch (err) {
    console.error('PageContent GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
