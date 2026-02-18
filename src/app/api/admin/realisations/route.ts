import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, insert, rawQuery } from '@/lib/db';
import { logAdminAction } from '@/lib/activity-logger';

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await rawQuery(
      excludeId
        ? `SELECT id FROM realisations WHERE slug = $1 AND id != $2 LIMIT 1`
        : `SELECT id FROM realisations WHERE slug = $1 LIMIT 1`,
      excludeId ? [slug, excludeId] : [slug]
    );
    if (existing.rows.length === 0) return slug;
    slug = `${base}-${suffix}`;
    suffix++;
  }
}

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
    const { title, slug, categoryId, description, body: bodyText, image, gallery, duration, surface, material, materialId, location, features, published, date, sortOrder } = body;

    if (!title) {
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
    }

    const finalSlug = await uniqueSlug(slug || title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    const realisation = await insert('realisations', {
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

    logAdminAction(request, auth, 'create_realisation', 'realisation', (realisation as { id: string }).id, `Réalisation "${title}" créée`);

    revalidatePath('/', 'layout');
    return NextResponse.json(realisation, { status: 201 });
  } catch (err) {
    console.error('Realisations POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
