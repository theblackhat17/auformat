import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { getProjectMilestones } from '@/lib/project-config-server';

type Milestones = Record<string, { done: boolean; date?: string | null; by?: string | null }>;

/**
 * Jalons du cycle de vie d'un projet (admin) : coche / décoche un jalon
 * (configuré, devis envoyé, acompte…) stocké dans projects.milestones (JSONB).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const body = await request.json();
    const key: string = typeof body.key === 'string' ? body.key : '';
    const done: boolean = body.done === true;

    // Validation contre le catalogue configuré (admin), pas la constante codée en dur
    const catalog = await getProjectMilestones();
    const milestone = catalog.find((m) => m.key === key);
    if (!milestone) {
      return NextResponse.json({ error: 'Jalon inconnu' }, { status: 400 });
    }

    const project = await queryOne<{ id: string; name: string; milestones: Milestones | null }>(
      'SELECT id, name, milestones FROM projects WHERE id = $1', [id]
    );
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    const milestones: Milestones = project.milestones || {};
    milestones[key] = { done, date: done ? new Date().toISOString() : null, by: auth.userId };

    const result = await rawQuery(
      'UPDATE projects SET milestones = $1, updated_at = NOW() WHERE id = $2 RETURNING milestones',
      [JSON.stringify(milestones), id]
    );

    logAdminAction(request, auth, 'update_milestone', 'project', id,
      `Jalon « ${milestone.label} » ${done ? 'coché' : 'décoché'} sur « ${project.name} »`);

    return NextResponse.json({ milestones: result.rows[0].milestones });
  } catch (err) {
    console.error('Update project milestone error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
