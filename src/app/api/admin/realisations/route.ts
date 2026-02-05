import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, insert } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query(
      `SELECT r.*, c.label as category_label, c.slug as category_slug
       FROM realisations r
       LEFT JOIN categories c ON r.category_id = c.id
       ORDER BY r.sort_order, r.date DESC`
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Realisations GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { title, slug, categoryId, description, body: bodyText, image, gallery, duration, surface, material, location, features, published, date, sortOrder } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Titre et slug sont requis' }, { status: 400 });
    }

    const realisation = await insert('realisations', {
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

    revalidatePath('/', 'layout');
    return NextResponse.json(realisation, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('unique')) {
      return NextResponse.json({ error: 'Ce slug existe deja' }, { status: 409 });
    }
    console.error('Realisations POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
