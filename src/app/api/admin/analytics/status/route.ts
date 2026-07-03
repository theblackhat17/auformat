import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { getUmamiHealth } from '@/lib/umami';

/** Statut de la connexion au service d'analytics (Umami) : joignable + authentifié. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const health = await getUmamiHealth();
  return NextResponse.json(health);
}
