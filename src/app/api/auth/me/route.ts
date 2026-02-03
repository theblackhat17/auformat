import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const profile = await getCurrentUser();

    if (!profile) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('Auth me error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
