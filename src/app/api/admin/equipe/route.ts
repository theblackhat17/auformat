import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, insert } from '@/lib/db';
import { logAdminAction } from '@/lib/activity-logger';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query('SELECT * FROM team_members ORDER BY sort_order');
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Equipe GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name, role, photo, description, sortOrder, published } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    const member = await insert('team_members', {
      name,
      role: role || '',
      photo: photo || null,
      description: description || null,
      sortOrder: sortOrder ?? 0,
      published: published ?? false,
    });

    logAdminAction(request, auth, 'create_member', 'team_member', (member as { id: string }).id, `Membre "${name}" ajouté`);

    revalidatePath('/', 'layout');
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    console.error('Equipe POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
