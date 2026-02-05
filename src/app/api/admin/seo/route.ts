import { NextRequest, NextResponse } from 'next/server';
import { query, rawQuery } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query<{
      pagePath: string;
      metaTitle: string;
      metaDescription: string;
      metaKeywords: string;
    }>('SELECT page_path, meta_title, meta_description, meta_keywords FROM seo_metadata ORDER BY page_path');

    return NextResponse.json(rows);
  } catch (err) {
    console.error('SEO GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { pages } = await request.json();

    if (!Array.isArray(pages)) {
      return NextResponse.json({ error: 'Format invalide' }, { status: 400 });
    }

    for (const p of pages) {
      await rawQuery(
        `INSERT INTO seo_metadata (page_path, meta_title, meta_description, meta_keywords, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (page_path) DO UPDATE SET
           meta_title = $2, meta_description = $3, meta_keywords = $4, updated_at = NOW()`,
        [p.pagePath, p.metaTitle || '', p.metaDescription || '', p.metaKeywords || '']
      );
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('SEO PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
