import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { exchangeCodeAndStore } from '@/lib/google-calendar';
import { logAdminAction } from '@/lib/activity-logger';

/**
 * Callback OAuth Google Agenda. L'admin a initié le flux depuis /admin/agenda :
 * son cookie de session est présent, on exige donc toujours requireAdmin.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const errorRedirect = new URL('/admin/agenda?google=error', request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get('code');
  if (!code || request.nextUrl.searchParams.get('error')) {
    return NextResponse.redirect(errorRedirect);
  }

  try {
    await exchangeCodeAndStore(code);
    logAdminAction(request, auth, 'connect_google', 'settings', null, 'Google Agenda connecté');
    return NextResponse.redirect(new URL('/admin/agenda?google=connected', request.nextUrl.origin));
  } catch (err) {
    console.error('Google Calendar callback error:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(errorRedirect);
  }
}
