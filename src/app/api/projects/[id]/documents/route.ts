import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import type { ProjectDocument } from '@/lib/types';

/**
 * Documents d'un projet : l'admin voit tout, le client (propriétaire du projet)
 * ne voit que les documents en visibilité 'client'.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const project = await queryOne<{ id: string; userId: string }>(
      'SELECT id, user_id FROM projects WHERE id = $1', [id]
    );
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    const isAdmin = auth.role === 'admin';
    if (!isAdmin && project.userId !== auth.userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const result = isAdmin
      ? await rawQuery('SELECT * FROM project_documents WHERE project_id = $1 ORDER BY created_at DESC', [id])
      : await rawQuery(
          `SELECT * FROM project_documents WHERE project_id = $1 AND visibility = 'client' ORDER BY created_at DESC`,
          [id]
        );

    return NextResponse.json({ documents: result.rows.map((row) => toCamelCase<ProjectDocument>(row)) });
  } catch (err) {
    console.error('List project documents error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
