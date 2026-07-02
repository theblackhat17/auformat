import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { PROJECT_PRODUCTION_TASKS } from '@/lib/constants';

type Production = Record<string, { done: boolean; note?: string | null }>;

/**
 * Checklist de production d'un projet (admin) : coche une tâche et/ou
 * enregistre une note (décors, panneaux…) dans projects.production (JSONB).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const body = await request.json();
    const key: string = typeof body.key === 'string' ? body.key : '';

    const task = PROJECT_PRODUCTION_TASKS.find((t) => t.key === key);
    if (!task) {
      return NextResponse.json({ error: 'Tâche inconnue' }, { status: 400 });
    }

    const project = await queryOne<{ id: string; name: string; production: Production | null }>(
      'SELECT id, name, production FROM projects WHERE id = $1', [id]
    );
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    const production: Production = project.production || {};
    const existing = production[key];
    production[key] = {
      done: typeof body.done === 'boolean' ? body.done : existing?.done ?? false,
      note: typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : existing?.note ?? null,
    };

    const result = await rawQuery(
      'UPDATE projects SET production = $1, updated_at = NOW() WHERE id = $2 RETURNING production',
      [JSON.stringify(production), id]
    );

    logAdminAction(request, auth, 'update_production_task', 'project', id,
      `Tâche de production « ${task.label} » mise à jour sur « ${project.name} »`);

    return NextResponse.json({ production: result.rows[0].production });
  } catch (err) {
    console.error('Update project production error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
