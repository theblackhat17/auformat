import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, insert } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query(
      `SELECT m.*, c.label as category_label, c.slug as category_slug
       FROM materiaux m
       LEFT JOIN categories c ON m.category_id = c.id
       ORDER BY m.sort_order`
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Materiaux GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name, latinName, image, categoryId, tag, description, hardness, stability, origin, color, features, usages, published, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    const materiau = await insert('materiaux', {
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

    return NextResponse.json(materiau, { status: 201 });
  } catch (err) {
    console.error('Materiaux POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
