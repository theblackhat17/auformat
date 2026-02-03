import { NextResponse } from 'next/server';
import { getEquipe } from '@/lib/content';

export async function GET() {
  try {
    return NextResponse.json(await getEquipe());
  } catch (err) {
    console.error('Content equipe error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
