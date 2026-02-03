import { NextResponse } from 'next/server';
import { getAvis } from '@/lib/content';

export async function GET() {
  try {
    return NextResponse.json(await getAvis());
  } catch (err) {
    console.error('Content avis error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
