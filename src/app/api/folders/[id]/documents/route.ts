import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import type { ProjectDocument } from '@/lib/types';

/** Documents partagés d'un dossier — visibles par son client propriétaire (visibilité 'client'). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const folder = await queryOne<{ userId: string | null }>('SELECT user_id FROM project_folders WHERE id = $1', [id]);
    if (!folder) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    if (auth.role !== 'admin' && folder.userId !== auth.userId) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    const isAdmin = auth.role === 'admin';
    const documents = await query<ProjectDocument>(
      `SELECT id, folder_id, name, url, visibility, created_at FROM project_documents
        WHERE folder_id = $1 ${isAdmin ? '' : "AND visibility = 'client'"} ORDER BY created_at DESC`,
      [id]
    );
    return NextResponse.json(documents);
  } catch (err) {
    console.error('Folder documents (client) error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
