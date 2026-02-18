import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { update, deleteById, rawQuery } from '@/lib/db';
import { logAdminAction } from '@/lib/activity-logger';

async function uniqueSlug(base: string, excludeId: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await rawQuery(
      `SELECT id FROM realisations WHERE slug = $1 AND id != $2 LIMIT 1`,
      [slug, excludeId]
    );
    if (existing.rows.length === 0) return slug;
    slug = `${base}-${suffix}`;
    suffix++;
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, slug, categoryId, description, body: bodyText, image, gallery, duration, surface, material, materialId, location, features, published, date, sortOrder } = body;

    const finalSlug = await uniqueSlug(slug, id);

    const realisation = await update('realisations', id, {
      title,
      slug: finalSlug,
      categoryId: categoryId || null,
      description: description || '',
      body: bodyText || null,
      image: image || null,
      gallery: JSON.stringify(gallery || []),
      duration: duration || null,
      surface: surface || null,
      material: material || null,
      materialId: materialId || null,
      location: location || null,
      features: JSON.stringify(features || []),
      published: published ?? false,
      date: date || new Date().toISOString(),
      sortOrder: sortOrder ?? 0,
    });

    if (!realisation) {
      return NextResponse.json({ error: 'Realisation introuvable' }, { status: 404 });
    }

    logAdminAction(request, auth, 'update_realisation', 'realisation', id, `Réalisation "${title}" modifiée`);

    revalidatePath('/', 'layout');
    return NextResponse.json(realisation);
  } catch (err) {
    console.error('Realisations PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const deleted = await deleteById('realisations', id);

    if (!deleted) {
      return NextResponse.json({ error: 'Realisation introuvable' }, { status: 404 });
    }

    logAdminAction(request, auth, 'delete_realisation', 'realisation', id, `Réalisation supprimée`);

    revalidatePath('/', 'layout');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Realisations DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
