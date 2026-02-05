import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { update, deleteById } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, latinName, image, categoryId, tag, description, hardness, stability, origin, color, features, usages, published, sortOrder } = body;

    const materiau = await update('materiaux', id, {
      name,
      latinName: latinName || null,
      image: image || null,
      categoryId: categoryId || null,
      tag: tag || null,
      description: description || '',
      hardness: hardness ?? 0,
      stability: stability ?? 0,
      origin: origin || '',
      color: color || '',
      features: JSON.stringify(features || []),
      usages: JSON.stringify(usages || []),
      published: published ?? false,
      sortOrder: sortOrder ?? 0,
    });

    if (!materiau) {
      return NextResponse.json({ error: 'Materiau introuvable' }, { status: 404 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json(materiau);
  } catch (err) {
    console.error('Materiaux PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const deleted = await deleteById('materiaux', id);

    if (!deleted) {
      return NextResponse.json({ error: 'Materiau introuvable' }, { status: 404 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Materiaux DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
