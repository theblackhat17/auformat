import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import type { ProjectUpdate } from '@/lib/types';

/** Timeline de suivi d'un dossier — visible par son client propriétaire (et l'admin). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const folder = await queryOne<{ userId: string | null }>('SELECT user_id FROM project_folders WHERE id = $1', [id]);
    if (!folder) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    if (auth.role !== 'admin' && folder.userId !== auth.userId) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    const updates = await query<ProjectUpdate>(
      `SELECT id, folder_id, status, note, photos, created_at FROM project_updates WHERE folder_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    return NextResponse.json(updates);
  } catch (err) {
    console.error('Folder updates (client) error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
