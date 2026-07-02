import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { getGoogleStatus } from '@/lib/google-calendar';

/** Statut de la connexion Google Agenda (jamais le refresh token) */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json(await getGoogleStatus());
  } catch (err) {
    console.error('Google Calendar status error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
