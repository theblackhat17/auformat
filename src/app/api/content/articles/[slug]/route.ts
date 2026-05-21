import { NextRequest, NextResponse } from 'next/server';
import { getArticleBySlug } from '@/lib/content';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }
    return NextResponse.json(article);
  } catch (err) {
    console.error('Content article error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
