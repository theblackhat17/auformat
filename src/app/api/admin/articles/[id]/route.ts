import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { update, deleteById, queryOne } from '@/lib/db';
import { logAdminAction } from '@/lib/activity-logger';

function calcReadingTime(markdown: string): number {
  const words = markdown.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

interface ArticleRow {
  id: string;
  slug: string;
  published: boolean;
  publishedAt: string | null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      slug, title, excerpt, content, coverImage, categoryId,
      metaTitle, metaDescription, metaKeywords, published, sortOrder,
    } = body;

    const existing = await queryOne<ArticleRow>('SELECT id, slug, published, published_at FROM articles WHERE id = $1', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }

    const readingTime = calcReadingTime(content || '');
    const isPublished = published ?? false;
    const publishedAt = isPublished
      ? (existing.publishedAt || new Date().toISOString())
      : null;

    const article = await update('articles', id, {
      slug,
      title,
      excerpt: excerpt || null,
      content: content || '',
      coverImage: coverImage || null,
      categoryId: categoryId || null,
      readingTime,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      metaKeywords: metaKeywords || null,
      published: isPublished,
      publishedAt,
      sortOrder: sortOrder ?? 0,
    });

    if (!article) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }

    logAdminAction(request, auth, 'update_article', 'article', id, `Article "${title}" modifie`);

    revalidatePath('/blog');
    revalidatePath(`/blog/${existing.slug}`);
    if (slug !== existing.slug) revalidatePath(`/blog/${slug}`);
    return NextResponse.json(article);
  } catch (err) {
    console.error('Articles PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const existing = await queryOne<ArticleRow>('SELECT slug FROM articles WHERE id = $1', [id]);
    const deleted = await deleteById('articles', id);

    if (!deleted) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }

    logAdminAction(request, auth, 'delete_article', 'article', id, 'Article supprime');

    revalidatePath('/blog');
    if (existing?.slug) revalidatePath(`/blog/${existing.slug}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Articles DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
