import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, insert } from '@/lib/db';
import { logAdminAction } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query('SELECT * FROM services ORDER BY sort_order');
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Services GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { slug, title, subtitle, icon, shortDescription, image, content, metaTitle, metaDescription, metaKeywords, sortOrder, published } = body;

    if (!slug || !title) {
      return NextResponse.json({ error: 'Le slug et le titre sont requis' }, { status: 400 });
    }

    const service = await insert('services', {
      slug,
      title,
      subtitle: subtitle || null,
      icon: icon || null,
      shortDescription: shortDescription || null,
      image: image || null,
      content: JSON.stringify(content || {}),
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      metaKeywords: metaKeywords || null,
      sortOrder: sortOrder ?? 0,
      published: published ?? true,
    });

    logAdminAction(request, auth, 'create_service', 'service', (service as { id: string }).id, `Service "${title}" cree`);

    revalidatePath('/', 'layout');
    return NextResponse.json(service, { status: 201 });
  } catch (err) {
    console.error('Services POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
