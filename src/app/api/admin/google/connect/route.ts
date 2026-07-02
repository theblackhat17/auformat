import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { getAuthUrl } from '@/lib/google-calendar';

/** Démarre le flux OAuth Google Agenda (redirection vers le consentement Google) */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.redirect(getAuthUrl());
}
