import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import type { ProjectFolder } from '@/lib/types';

async function ownFolder(auth: { userId: string; role: string }, id: string) {
  const folder = await queryOne<{ userId: string }>('SELECT user_id FROM project_folders WHERE id = $1', [id]);
  if (!folder) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
  if (auth.role !== 'admin' && folder.userId !== auth.userId) {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
  }
  return folder;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const check = await ownFolder(auth, id);
    if (check instanceof NextResponse) return check;

    const { name } = await request.json();
    const trimmed = typeof name === 'string' ? name.trim().slice(0, 120) : '';
    if (!trimmed) return NextResponse.json({ error: 'Nom du dossier requis' }, { status: 400 });

    const result = await rawQuery(
      `UPDATE project_folders SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [trimmed, id]
    );
    return NextResponse.json(toCamelCase<ProjectFolder>(result.rows[0]));
  } catch (err) {
    console.error('Folder PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Supprime le dossier : les projets redeviennent « sans dossier », la discussion du dossier est perdue */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const check = await ownFolder(auth, id);
    if (check instanceof NextResponse) return check;

    await rawQuery('DELETE FROM project_folders WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Folder DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
