import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, rawQuery } from '@/lib/db';
import { logAdminAction } from '@/lib/activity-logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ pageKey: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { pageKey } = await params;
    const rows = await query('SELECT * FROM page_content WHERE page_key = $1 ORDER BY sort_order', [pageKey]);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('PageContent GET by page error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ pageKey: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { pageKey } = await params;
    const body = await request.json();
    const { sections } = body as { sections: { sectionKey: string; content: Record<string, unknown>; sortOrder?: number }[] };

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json({ error: 'Format invalide' }, { status: 400 });
    }

    for (const section of sections) {
      await rawQuery(
        `INSERT INTO page_content (page_key, section_key, content, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (page_key, section_key)
         DO UPDATE SET content = $3, sort_order = $4, updated_at = NOW()`,
        [pageKey, section.sectionKey, JSON.stringify(section.content), section.sortOrder ?? 0]
      );
    }

    logAdminAction(request, auth, 'update_content', 'page_content', null, `Contenu page "${pageKey}" modifié`);

    revalidatePath('/', 'layout');

    const rows = await query('SELECT * FROM page_content WHERE page_key = $1 ORDER BY sort_order', [pageKey]);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('PageContent PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
