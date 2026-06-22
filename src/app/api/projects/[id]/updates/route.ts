import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import type { ProjectUpdate } from '@/lib/types';

/** Timeline de fabrication d'un projet — visible par son propriétaire (et l'admin) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const project = await queryOne<{ userId: string }>('SELECT user_id FROM projects WHERE id = $1', [id]);
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    if (auth.role !== 'admin' && project.userId !== auth.userId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const updates = await query<ProjectUpdate>(
      `SELECT id, project_id, status, note, photos, created_at FROM project_updates
       WHERE project_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    return NextResponse.json(updates);
  } catch (err) {
    console.error('List project updates error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
