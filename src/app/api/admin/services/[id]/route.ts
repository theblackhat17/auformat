import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { update, deleteById } from '@/lib/db';
import { logAdminAction } from '@/lib/activity-logger';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { slug, title, subtitle, icon, shortDescription, image, content, metaTitle, metaDescription, metaKeywords, sortOrder, published } = body;

    const service = await update('services', id, {
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

    if (!service) {
      return NextResponse.json({ error: 'Service introuvable' }, { status: 404 });
    }

    logAdminAction(request, auth, 'update_service', 'service', id, `Service "${title}" modifie`);

    revalidatePath('/', 'layout');
    return NextResponse.json(service);
  } catch (err) {
    console.error('Services PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const deleted = await deleteById('services', id);

    if (!deleted) {
      return NextResponse.json({ error: 'Service introuvable' }, { status: 404 });
    }

    logAdminAction(request, auth, 'delete_service', 'service', id, 'Service supprime');

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Services DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
