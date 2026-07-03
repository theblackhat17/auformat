import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { exchangeCodeAndStore, APP_ORIGIN } from '@/lib/google-calendar';
import { logAdminAction } from '@/lib/activity-logger';

/**
 * Callback OAuth Google Agenda. L'admin a initié le flux depuis /admin/agenda :
 * son cookie de session est présent, on exige donc toujours requireAdmin.
 * On redirige vers l'origine canonique de prod (APP_ORIGIN) et non request.nextUrl.origin,
 * qui vaut l'adresse interne 0.0.0.0:3006 derrière le proxy.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const errorRedirect = new URL('/admin/agenda?google=error', APP_ORIGIN);
  const code = request.nextUrl.searchParams.get('code');
  if (!code || request.nextUrl.searchParams.get('error')) {
    return NextResponse.redirect(errorRedirect);
  }

  try {
    await exchangeCodeAndStore(code);
    logAdminAction(request, auth, 'connect_google', 'settings', null, 'Google Agenda connecté');
    return NextResponse.redirect(new URL('/admin/agenda?google=connected', APP_ORIGIN));
  } catch (err) {
    console.error('Google Calendar callback error:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(errorRedirect);
  }
}
