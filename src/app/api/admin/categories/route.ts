import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, insert } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let rows;
    if (type) {
      rows = await query('SELECT * FROM categories WHERE type = $1 ORDER BY sort_order', [type]);
    } else {
      rows = await query('SELECT * FROM categories ORDER BY type, sort_order');
    }
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Categories GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { slug, label, icon, type, sortOrder, published } = body;

    if (!slug || !label || !type) {
      return NextResponse.json({ error: 'Slug, label et type sont requis' }, { status: 400 });
    }

    const category = await insert('categories', {
      slug,
      label,
      icon: icon || null,
      type,
      sortOrder: sortOrder ?? 0,
      published: published ?? true,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes('unique')) {
      return NextResponse.json({ error: 'Ce slug existe deja' }, { status: 409 });
    }
    console.error('Categories POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
