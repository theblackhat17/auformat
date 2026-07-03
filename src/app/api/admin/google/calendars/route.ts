import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { listCalendars } from '@/lib/google-calendar';

/** Liste des agendas du compte connecté (pour choisir la cible côté admin) */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json({ calendars: await listCalendars() });
  } catch (err) {
    console.error('Google calendars list error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
