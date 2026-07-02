import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { clearGoogleConfig } from '@/lib/google-calendar';
import { logAdminAction } from '@/lib/activity-logger';

/** Déconnecte Google Agenda (supprime la configuration stockée) */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await clearGoogleConfig();
    logAdminAction(request, auth, 'disconnect_google', 'settings', null, 'Google Agenda déconnecté');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Google Calendar disconnect error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
