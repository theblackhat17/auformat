import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { setCalendarId, getGoogleStatus } from '@/lib/google-calendar';
import { logAdminAction } from '@/lib/activity-logger';

/** Définit l'agenda Google cible (ex. « AU FORMAT ») */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const calendarId = String(body.calendarId || '').trim();
    if (!calendarId) return NextResponse.json({ error: 'Agenda manquant' }, { status: 400 });
    await setCalendarId(calendarId);
    logAdminAction(request, auth, 'update_settings', 'settings', null, `Agenda Google cible : ${calendarId}`);
    return NextResponse.json(await getGoogleStatus());
  } catch (err) {
    console.error('Google set calendar error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
