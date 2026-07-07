import { NextRequest, NextResponse } from 'next/server';
import { query, rawQuery, toCamelCase } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import { getProjectMilestones } from '@/lib/project-config-server';
import { currentClientMilestone } from '@/lib/project-config';
import type { ProjectFolder } from '@/lib/types';

/** Dossiers de chantier du client connecté (plusieurs projets qui vont ensemble) */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const folders = await query<ProjectFolder & { milestones?: Record<string, { done: boolean }> }>(
      `SELECT f.id, f.user_id, f.name, f.status, f.milestones, f.created_at, f.updated_at,
              (SELECT COUNT(*)::int FROM projects p WHERE p.folder_id = f.id) AS project_count
         FROM project_folders f WHERE f.user_id = $1 ORDER BY f.created_at ASC`,
      [auth.userId]
    );
    // Étape VISIBLE courante pour le badge client ; ni admin_notes ni détail des jalons ne sortent
    const visible = (await getProjectMilestones()).filter((m) => m.clientVisible ?? m.clientNotify);
    const payload = folders.map((f) => ({
      id: f.id,
      userId: f.userId,
      name: f.name,
      status: f.status,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      projectCount: f.projectCount,
      stageLabel: currentClientMilestone({ milestones: f.milestones }, visible)?.label ?? null,
    }));
    return NextResponse.json(payload);
  } catch (err) {
    console.error('Folders GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { name } = await request.json();
    const trimmed = typeof name === 'string' ? name.trim().slice(0, 120) : '';
    if (!trimmed) return NextResponse.json({ error: 'Nom du dossier requis' }, { status: 400 });

    const result = await rawQuery(
      `INSERT INTO project_folders (user_id, name) VALUES ($1, $2) RETURNING *`,
      [auth.userId, trimmed]
    );
    return NextResponse.json(toCamelCase<ProjectFolder>(result.rows[0]), { status: 201 });
  } catch (err) {
    console.error('Folders POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
