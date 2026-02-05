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
    const { slug, label, icon, type, sortOrder, published } = body;

    const category = await update('categories', id, {
      slug,
      label,
      icon: icon || null,
      type,
      sortOrder: sortOrder ?? 0,
      published: published ?? true,
    });

    if (!category) {
      return NextResponse.json({ error: 'Categorie introuvable' }, { status: 404 });
    }

    logAdminAction(request, auth, 'update_category', 'category', id, `Catégorie "${label}" modifiée`);

    revalidatePath('/', 'layout');
    return NextResponse.json(category);
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('unique')) {
      return NextResponse.json({ error: 'Ce slug existe deja' }, { status: 409 });
    }
    console.error('Categories PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const deleted = await deleteById('categories', id);

    if (!deleted) {
      return NextResponse.json({ error: 'Categorie introuvable' }, { status: 404 });
    }

    logAdminAction(request, auth, 'delete_category', 'category', id, `Catégorie supprimée`);

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Categories DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
