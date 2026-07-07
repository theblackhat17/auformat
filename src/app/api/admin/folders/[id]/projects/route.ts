import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import type { Project } from '@/lib/types';

/**
 * Projets d'un dossier : rattacher un projet existant, créer un projet libre
 * dans le dossier (POST), ou détacher un projet (DELETE). Le projet hérite du
 * client du dossier.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const folder = await queryOne<{ id: string; userId: string | null }>('SELECT id, user_id FROM project_folders WHERE id = $1', [id]);
    if (!folder) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

    const body = await request.json();

    // Rattacher un projet existant
    if (body.projectId) {
      await rawQuery('UPDATE projects SET folder_id = $1, user_id = COALESCE($2, user_id), updated_at = NOW() WHERE id = $3', [id, folder.userId, body.projectId]);
      logAdminAction(request, auth, 'assign_project_folder', 'folder', id, `Projet rattaché au dossier`);
      return NextResponse.json({ success: true });
    }

    // Créer un projet (libre par défaut) dans le dossier
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'Nom du projet requis' }, { status: 400 });
    const result = await rawQuery(
      `INSERT INTO projects (user_id, folder_id, name, type, config, status) VALUES ($1, $2, $3, $4, $5::jsonb, 'draft') RETURNING *`,
      [folder.userId, id, name, body.type || 'libre', JSON.stringify(body.config ?? {})]
    );
    const project = toCamelCase<Project>(result.rows[0]);
    logAdminAction(request, auth, 'create_project', 'project', project.id, `Projet « ${name} » créé dans le dossier`);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error('Folder projects POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const { projectId } = await request.json();
    if (!projectId) return NextResponse.json({ error: 'projectId requis' }, { status: 400 });
    await rawQuery('UPDATE projects SET folder_id = NULL, updated_at = NOW() WHERE id = $1 AND folder_id = $2', [projectId, id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Folder projects DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
