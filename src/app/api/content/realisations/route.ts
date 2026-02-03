import { NextResponse } from 'next/server';
import { getRealisations } from '@/lib/content';

export async function GET() {
  try {
    const realisations = await getRealisations();
    return NextResponse.json(realisations);
  } catch (err) {
    console.error('Content realisations error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
