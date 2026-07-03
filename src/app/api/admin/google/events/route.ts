import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { listGoogleEvents } from '@/lib/google-calendar';

/** Événements de l'agenda Google cible sur une plage (sens Google → site, lecture seule) */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const from = request.nextUrl.searchParams.get('from') || new Date(Date.now() - 31 * 864e5).toISOString();
    const to = request.nextUrl.searchParams.get('to') || new Date(Date.now() + 62 * 864e5).toISOString();
    return NextResponse.json({ events: await listGoogleEvents(from, to) });
  } catch (err) {
    console.error('Google events route error:', err);
    return NextResponse.json({ events: [] });
  }
}
