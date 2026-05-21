import { NextResponse } from 'next/server';
import { getArticles } from '@/lib/content';

export async function GET() {
  try {
    const articles = await getArticles();
    return NextResponse.json(articles);
  } catch (err) {
    console.error('Content articles error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
