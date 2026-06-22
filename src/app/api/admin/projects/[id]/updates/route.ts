import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { sendProjectUpdateEmail } from '@/lib/mailer';
import { PROJECT_STATUS_LABELS } from '@/lib/constants';
import type { ProjectUpdate } from '@/lib/types';

/**
 * Étapes de fabrication d'un projet : l'admin publie une mise à jour
 * (changement de statut, note, photos d'atelier) → la timeline client
 * s'enrichit et le client est prévenu par email.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const project = await queryOne<{ id: string; name: string; status: string; userId: string }>(
      'SELECT id, name, status, user_id FROM projects WHERE id = $1', [id]
    );
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    const body = await request.json();
    const status: string | null = body.status && PROJECT_STATUS_LABELS[body.status] ? body.status : null;
    const note: string | null = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 2000) : null;
    const photos: string[] = Array.isArray(body.photos)
      ? body.photos.filter((p: unknown) => typeof p === 'string' && (p as string).startsWith('/api/uploads/')).slice(0, 10)
      : [];

    if (!status && !note && photos.length === 0) {
      return NextResponse.json({ error: 'Rien à publier : indiquez une étape, une note ou des photos' }, { status: 400 });
    }

    const inserted = await rawQuery(
      `INSERT INTO project_updates (project_id, status, note, photos, created_by)
       VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING *`,
      [id, status, note, JSON.stringify(photos), auth.userId]
    );

    if (status && status !== project.status) {
      await rawQuery(`UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);
    }

    // Préviens le client (propriétaire du projet, hors admin lui-même)
    const owner = await queryOne<{ email: string; fullName: string | null; role: string }>(
      'SELECT email, full_name, role FROM profiles WHERE id = $1', [project.userId]
    );
    let emailed = false;
    if (owner && owner.role !== 'admin' && !owner.email.endsWith('@anonyme.local') && (status || note)) {
      emailed = await sendProjectUpdateEmail(
        owner.email,
        owner.fullName || owner.email.split('@')[0],
        project.name,
        PROJECT_STATUS_LABELS[status || project.status] || 'Mise à jour',
        note,
        photos.length
      );
    }

    await logActivity(auth.userId, 'update_project', 'project', id, {
      description: `Étape publiée sur « ${project.name} »${status ? ` : ${PROJECT_STATUS_LABELS[status]}` : ''}`,
    }, getClientIp(request), getUserAgent(request));

    return NextResponse.json({ update: toCamelCase<ProjectUpdate>(inserted.rows[0]), emailed }, { status: 201 });
  } catch (err) {
    console.error('Create project update error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Supprime une étape publiée par erreur */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const { updateId } = await request.json();
    if (!updateId) return NextResponse.json({ error: 'updateId requis' }, { status: 400 });
    await rawQuery(`DELETE FROM project_updates WHERE id = $1 AND project_id = $2`, [updateId, id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete project update error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
