import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import { PROJECT_EVENT_TYPES } from '@/lib/constants';
import type { ProjectEvent } from '@/lib/types';

/**
 * Agenda d'un projet : l'admin voit tout, le client (propriétaire du projet)
 * ne voit que ses rendez-vous (types `clientVisible`), jamais les jours d'atelier.
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

    const clientVisibleTypes = PROJECT_EVENT_TYPES.filter((t) => t.clientVisible).map((t) => t.key);
    const result = isAdmin
      ? await rawQuery('SELECT * FROM project_events WHERE project_id = $1 ORDER BY start_at ASC', [id])
      : await rawQuery(
          'SELECT * FROM project_events WHERE project_id = $1 AND type = ANY($2) ORDER BY start_at ASC',
          [id, clientVisibleTypes]
        );

    return NextResponse.json({ events: result.rows.map((row) => toCamelCase<ProjectEvent>(row)) });
  } catch (err) {
    console.error('List project events error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
