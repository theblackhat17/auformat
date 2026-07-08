import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { getProjectMilestones } from '@/lib/project-config-server';
import { deriveProjectStatus, newlyNotifiedMilestone } from '@/lib/project-config';
import { sendProjectStageEmail } from '@/lib/mailer';
import { clientRecipients } from '@/lib/client-contacts';

type Milestones = Record<string, { done: boolean; date?: string | null; by?: string | null }>;

/**
 * Étapes d'un DOSSIER (admin). Mêmes règles que les projets : le dossier avance
 * (kanban ⇄ checklist), le statut interne est dérivé, et une étape « Prévenir le
 * client » nouvellement franchie envoie l'e-mail automatique.
 */
async function maybeNotifyClient(
  prev: Milestones,
  next: Milestones,
  catalog: Awaited<ReturnType<typeof getProjectMilestones>>,
  folder: { id: string; name: string; userId: string | null }
): Promise<void> {
  const crossed = newlyNotifiedMilestone(prev, next, catalog);
  if (!crossed || !folder.userId) return;
  const owner = await queryOne<{ email: string; fullName: string | null; role: string }>(
    'SELECT email, full_name, role FROM profiles WHERE id = $1', [folder.userId]
  );
  if (owner && owner.role !== 'admin' && !owner.email.endsWith('@anonyme.local')) {
    const to = await clientRecipients(folder.userId, owner.email);
    void sendProjectStageEmail(to, owner.fullName || owner.email.split('@')[0], folder.name, crossed.key, crossed.label);
  }
}

/** Coche / décoche une étape isolée (checklist de la fiche dossier). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const body = await request.json();
    const key: string = typeof body.key === 'string' ? body.key : '';
    const done: boolean = body.done === true;

    const catalog = await getProjectMilestones();
    const milestone = catalog.find((m) => m.key === key);
    if (!milestone) return NextResponse.json({ error: 'Étape inconnue' }, { status: 400 });

    const folder = await queryOne<{ id: string; name: string; userId: string | null; milestones: Milestones | null }>(
      'SELECT id, name, user_id, milestones FROM project_folders WHERE id = $1', [id]
    );
    if (!folder) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

    const prev: Milestones = { ...(folder.milestones || {}) };
    const milestones: Milestones = { ...prev };
    milestones[key] = { done, date: done ? new Date().toISOString() : null, by: auth.userId };
    const status = deriveProjectStatus({ milestones }, catalog);

    const result = await rawQuery(
      'UPDATE project_folders SET milestones = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING milestones, status',
      [JSON.stringify(milestones), status, id]
    );
    await maybeNotifyClient(prev, milestones, catalog, folder);

    logAdminAction(request, auth, 'update_folder_milestone', 'folder', id, `Étape « ${milestone.label} » ${done ? 'cochée' : 'décochée'} sur « ${folder.name} »`);
    return NextResponse.json({ milestones: result.rows[0].milestones, status: result.rows[0].status });
  } catch (err) {
    console.error('Folder milestone PATCH error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Définit l'étape courante du dossier (drag & drop du kanban). */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const body = await request.json();
    const upTo: string | null = typeof body.upTo === 'string' ? body.upTo : null;

    const catalog = await getProjectMilestones();
    const targetIndex = upTo === null ? -1 : catalog.findIndex((m) => m.key === upTo);
    if (upTo !== null && targetIndex === -1) return NextResponse.json({ error: 'Étape inconnue' }, { status: 400 });

    const folder = await queryOne<{ id: string; name: string; userId: string | null; milestones: Milestones | null }>(
      'SELECT id, name, user_id, milestones FROM project_folders WHERE id = $1', [id]
    );
    if (!folder) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

    const now = new Date().toISOString();
    const previous: Milestones = folder.milestones || {};
    const milestones: Milestones = {};
    catalog.forEach((m, idx) => {
      const done = idx <= targetIndex;
      const p = previous[m.key];
      milestones[m.key] = { done, date: done ? (p?.done ? p.date ?? now : now) : null, by: auth.userId };
    });
    const status = deriveProjectStatus({ milestones }, catalog);

    const result = await rawQuery(
      'UPDATE project_folders SET milestones = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING milestones, status',
      [JSON.stringify(milestones), status, id]
    );
    await maybeNotifyClient(previous, milestones, catalog, folder);

    const label = targetIndex >= 0 ? catalog[targetIndex].label : 'Non démarré';
    logAdminAction(request, auth, 'update_folder_milestone', 'folder', id, `Étape courante de « ${folder.name} » : ${label}`);
    return NextResponse.json({ milestones: result.rows[0].milestones, status: result.rows[0].status });
  } catch (err) {
    console.error('Folder milestone PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
