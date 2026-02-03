import { NextResponse } from 'next/server';
import { getMateriaux } from '@/lib/content';

export async function GET() {
  try {
    return NextResponse.json(await getMateriaux());
  } catch (err) {
    console.error('Content materiaux error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
