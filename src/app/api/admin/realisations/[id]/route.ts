import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { update, deleteById } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, slug, categoryId, description, body: bodyText, image, gallery, duration, surface, material, location, features, published, date, sortOrder } = body;

    const realisation = await update('realisations', id, {
      title,
      slug,
      categoryId: categoryId || null,
      description: description || '',
      body: bodyText || null,
      image: image || null,
      gallery: JSON.stringify(gallery || []),
      duration: duration || null,
      surface: surface || null,
      material: material || null,
      location: location || null,
      features: JSON.stringify(features || []),
      published: published ?? false,
      date: date || new Date().toISOString(),
      sortOrder: sortOrder ?? 0,
    });

    if (!realisation) {
      return NextResponse.json({ error: 'Realisation introuvable' }, { status: 404 });
    }

    return NextResponse.json(realisation);
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('unique')) {
      return NextResponse.json({ error: 'Ce slug existe deja' }, { status: 409 });
    }
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Realisations DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
