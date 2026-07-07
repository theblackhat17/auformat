import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query, rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin, getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { sendProjectUpdateEmail } from '@/lib/mailer';
import { saveUploadedFile, deleteUploadedFiles } from '@/lib/upload';
import { getProjectMilestones } from '@/lib/project-config-server';
import { deriveProjectStatus } from '@/lib/project-config';
import type { ProjectUpdate } from '@/lib/types';

type Milestones = Record<string, { done: boolean; date?: string | null; by?: string | null }>;

/**
 * Suivi client d'un projet : l'admin publie une note + des photos d'atelier, et
 * peut au passage marquer une ÉTAPE franchie (optionnel). L'étape écrit le même
 * `projects.milestones` que le kanban et la checklist → tout reste synchro. Le
 * client voit la publication dans sa timeline et reçoit un e-mail.
 */

/** Liste des publications, les plus récentes d'abord (fiche projet admin). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const updates = await query<ProjectUpdate>(
      `SELECT id, project_id, status, note, photos, created_at
         FROM project_updates WHERE project_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    return NextResponse.json({ updates });
  } catch (err) {
    console.error('List project updates error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const project = await queryOne<{ id: string; name: string; userId: string; milestones: Milestones | null }>(
      'SELECT id, name, user_id, milestones FROM projects WHERE id = $1', [id]
    );
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    // Multipart (photos jointes) ou JSON. Champs : note, photos, stageKey (étape à marquer).
    const contentType = request.headers.get('content-type') || '';
    let note: string | null = null;
    let stageKey = '';
    let photos: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      stageKey = String(fd.get('stageKey') || '');
      const rawNote = String(fd.get('note') || '').trim();
      note = rawNote ? rawNote.slice(0, 2000) : null;
      const files = fd.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
      for (const file of files) {
        try {
          const saved = await saveUploadedFile(file, { prefix: 'suivi' });
          photos.push(saved.path);
        } catch (err) {
          await deleteUploadedFiles(photos);
          return NextResponse.json({ error: `« ${file.name} » : ${err instanceof Error ? err.message : 'fichier refusé'}` }, { status: 400 });
        }
      }
    } else {
      const body = await request.json();
      stageKey = typeof body.stageKey === 'string' ? body.stageKey : '';
      note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 2000) : null;
      photos = Array.isArray(body.photos)
        ? body.photos.filter((p: unknown) => typeof p === 'string' && (p as string).startsWith('/api/uploads/')).slice(0, 10)
        : [];
    }

    if (!stageKey && !note && photos.length === 0) {
      return NextResponse.json({ error: 'Rien à publier : indiquez une étape, une note ou des photos' }, { status: 400 });
    }

    // Étape franchie (optionnel) : coche jusqu'à stageKey inclus + dérive le statut interne
    let stageLabel: string | null = null;
    let newMilestones: Milestones | null = null;
    let newStatus: string | null = null;
    if (stageKey) {
      const catalog = await getProjectMilestones();
      const targetIndex = catalog.findIndex((m) => m.key === stageKey);
      if (targetIndex === -1) {
        return NextResponse.json({ error: 'Étape inconnue' }, { status: 400 });
      }
      stageLabel = catalog[targetIndex].label;
      const now = new Date().toISOString();
      const previous: Milestones = project.milestones || {};
      const milestones: Milestones = {};
      catalog.forEach((m, i) => {
        const done = i <= targetIndex;
        const prev = previous[m.key];
        milestones[m.key] = { done, date: done ? (prev?.done ? prev.date ?? now : now) : null, by: auth.userId };
      });
      newStatus = deriveProjectStatus({ milestones }, catalog);
      await rawQuery('UPDATE projects SET milestones = $1, status = $2, updated_at = NOW() WHERE id = $3', [JSON.stringify(milestones), newStatus, id]);
      newMilestones = milestones;
    }

    // On ne crée une entrée de timeline que s'il y a un contenu à montrer (note ou
    // photos). Avancer seulement une étape ne laisse pas d'entrée vide au client.
    let update: ProjectUpdate | null = null;
    if (note || photos.length > 0) {
      const inserted = await rawQuery(
        `INSERT INTO project_updates (project_id, status, note, photos, created_by)
         VALUES ($1, NULL, $2, $3::jsonb, $4) RETURNING *`,
        [id, note, JSON.stringify(photos), auth.userId]
      );
      update = toCamelCase<ProjectUpdate>(inserted.rows[0]);
    }

    // Préviens le client (propriétaire, hors admin/compte anonymisé)
    const owner = await queryOne<{ email: string; fullName: string | null; role: string }>(
      'SELECT email, full_name, role FROM profiles WHERE id = $1', [project.userId]
    );
    let emailed = false;
    if (owner && owner.role !== 'admin' && !owner.email.endsWith('@anonyme.local') && (stageLabel || note)) {
      emailed = await sendProjectUpdateEmail(
        owner.email,
        owner.fullName || owner.email.split('@')[0],
        project.name,
        stageLabel || 'Avancement du projet',
        note,
        photos.length
      );
    }

    await logActivity(auth.userId, 'update_project', 'project', id, {
      description: `Suivi publié sur « ${project.name} »${stageLabel ? ` : ${stageLabel}` : ''}`,
    }, getClientIp(request), getUserAgent(request));

    return NextResponse.json(
      { update, emailed, milestones: newMilestones, status: newStatus },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create project update error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Supprime une publication (et ses photos sur disque) */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const { updateId } = await request.json();
    if (!updateId) return NextResponse.json({ error: 'updateId requis' }, { status: 400 });
    const row = await queryOne<{ photos: string[] | null }>(
      `SELECT photos FROM project_updates WHERE id = $1 AND project_id = $2`,
      [updateId, id]
    );
    await rawQuery(`DELETE FROM project_updates WHERE id = $1 AND project_id = $2`, [updateId, id]);
    if (row?.photos && Array.isArray(row.photos)) await deleteUploadedFiles(row.photos);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete project update error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
