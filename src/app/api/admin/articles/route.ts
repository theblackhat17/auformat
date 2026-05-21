import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, insert } from '@/lib/db';
import { logAdminAction } from '@/lib/activity-logger';

function calcReadingTime(markdown: string): number {
  const words = markdown.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query(
      `SELECT a.*, c.slug as category_slug, c.label as category_label, c.icon as category_icon,
              p.full_name as author_name
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN profiles p ON a.author_id = p.id
       ORDER BY a.created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Articles GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const {
      slug, title, excerpt, content, coverImage, categoryId,
      metaTitle, metaDescription, metaKeywords, published, sortOrder,
    } = body;

    if (!slug || !title) {
      return NextResponse.json({ error: 'Le slug et le titre sont requis' }, { status: 400 });
    }

    const readingTime = calcReadingTime(content || '');
    const isPublished = published ?? false;

    const article = await insert('articles', {
      slug,
      title,
      excerpt: excerpt || null,
      content: content || '',
      coverImage: coverImage || null,
      categoryId: categoryId || null,
      authorId: auth.userId,
      readingTime,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      metaKeywords: metaKeywords || null,
      published: isPublished,
      publishedAt: isPublished ? new Date().toISOString() : null,
      sortOrder: sortOrder ?? 0,
    });

    logAdminAction(request, auth, 'create_article', 'article', (article as { id: string }).id, `Article "${title}" cree`);

    revalidatePath('/blog');
    revalidatePath(`/blog/${slug}`);
    return NextResponse.json(article, { status: 201 });
  } catch (err) {
    console.error('Articles POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
