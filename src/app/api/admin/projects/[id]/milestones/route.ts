import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { getProjectMilestones } from '@/lib/project-config-server';
import { deriveProjectStatus, newlyNotifiedMilestone } from '@/lib/project-config';
import { sendProjectStageEmail } from '@/lib/mailer';

type Milestones = Record<string, { done: boolean; date?: string | null; by?: string | null }>;

/**
 * Si une étape « Prévenir le client » vient d'être franchie, envoie l'e-mail
 * automatique au client (le plus avancé, une seule fois). Fire-and-forget :
 * n'ajoute pas de latence et ne fait jamais échouer le changement d'étape.
 */
async function maybeNotifyClient(
  prev: Milestones,
  next: Milestones,
  catalog: Awaited<ReturnType<typeof getProjectMilestones>>,
  project: { id: string; name: string; userId: string }
): Promise<void> {
  const crossed = newlyNotifiedMilestone(prev, next, catalog);
  if (!crossed) return;
  const owner = await queryOne<{ email: string; fullName: string | null; role: string }>(
    'SELECT email, full_name, role FROM profiles WHERE id = $1', [project.userId]
  );
  if (owner && owner.role !== 'admin' && !owner.email.endsWith('@anonyme.local')) {
    void sendProjectStageEmail(owner.email, owner.fullName || owner.email.split('@')[0], project.name, crossed.key, crossed.label);
  }
}

/**
 * Jalons du cycle de vie d'un projet (admin). Source de vérité unique du suivi :
 * le badge client, le kanban et la checklist « Étapes » lisent tous ce champ.
 * Le statut interne `projects.status` (brouillon / en cours / terminé) en est
 * dérivé automatiquement pour les signaux legacy (relances, cockpit).
 */

/** Coche / décoche un jalon isolé (checklist de l'onglet Étapes). */
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
    if (!milestone) {
      return NextResponse.json({ error: 'Jalon inconnu' }, { status: 400 });
    }

    const project = await queryOne<{ id: string; name: string; userId: string; milestones: Milestones | null }>(
      'SELECT id, name, user_id, milestones FROM projects WHERE id = $1', [id]
    );
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    const prev: Milestones = { ...(project.milestones || {}) };
    const milestones: Milestones = { ...prev };
    milestones[key] = { done, date: done ? new Date().toISOString() : null, by: auth.userId };
    const status = deriveProjectStatus({ milestones }, catalog);

    const result = await rawQuery(
      'UPDATE projects SET milestones = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING milestones, status',
      [JSON.stringify(milestones), status, id]
    );

    await maybeNotifyClient(prev, milestones, catalog, project);

    logAdminAction(request, auth, 'update_milestone', 'project', id,
      `Jalon « ${milestone.label} » ${done ? 'coché' : 'décoché'} sur « ${project.name} »`);

    return NextResponse.json({ milestones: result.rows[0].milestones, status: result.rows[0].status });
  } catch (err) {
    console.error('Update project milestone error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * Définit l'étape courante du projet (drag & drop du kanban) : coche tous les
 * jalons jusqu'à `upTo` inclus, décoche les suivants. `upTo = null` remet le
 * projet à « non démarré ». Un seul aller-retour = position kanban ⇄ checklist.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const body = await request.json();
    const upTo: string | null = typeof body.upTo === 'string' ? body.upTo : null;

    const catalog = await getProjectMilestones();
    const targetIndex = upTo === null ? -1 : catalog.findIndex((m) => m.key === upTo);
    if (upTo !== null && targetIndex === -1) {
      return NextResponse.json({ error: 'Étape inconnue' }, { status: 400 });
    }

    const project = await queryOne<{ id: string; name: string; userId: string; milestones: Milestones | null }>(
      'SELECT id, name, user_id, milestones FROM projects WHERE id = $1', [id]
    );
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    const now = new Date().toISOString();
    const previous: Milestones = project.milestones || {};
    const milestones: Milestones = {};
    catalog.forEach((m, i) => {
      const done = i <= targetIndex;
      // Conserve la date d'origine d'un jalon déjà coché pour ne pas réécrire l'historique
      const prev = previous[m.key];
      milestones[m.key] = {
        done,
        date: done ? (prev?.done ? prev.date ?? now : now) : null,
        by: auth.userId,
      };
    });
    const status = deriveProjectStatus({ milestones }, catalog);

    const result = await rawQuery(
      'UPDATE projects SET milestones = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING milestones, status',
      [JSON.stringify(milestones), status, id]
    );

    await maybeNotifyClient(previous, milestones, catalog, project);

    const label = targetIndex >= 0 ? catalog[targetIndex].label : 'Non démarré';
    logAdminAction(request, auth, 'update_milestone', 'project', id,
      `Étape courante de « ${project.name} » : ${label}`);

    return NextResponse.json({ milestones: result.rows[0].milestones, status: result.rows[0].status });
  } catch (err) {
    console.error('Set project stage error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
