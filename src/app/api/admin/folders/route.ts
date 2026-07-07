import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { getProjectMilestones } from '@/lib/project-config-server';
import { currentMilestone } from '@/lib/project-config';
import type { ProjectFolder } from '@/lib/types';

type FolderRow = ProjectFolder & { clientName: string | null; clientEmail: string | null; unreadCount: number };

/**
 * Dossiers (admin) = unités de gestion qui avancent dans le kanban et regroupent
 * des projets pour un même client.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const folders = await query<FolderRow>(
      `SELECT f.id, f.user_id, f.name, f.status, f.milestones, f.admin_notes, f.created_at, f.updated_at,
              pr.full_name AS client_name, pr.email AS client_email,
              (SELECT COUNT(*)::int FROM projects p WHERE p.folder_id = f.id) AS project_count,
              (SELECT COUNT(*)::int FROM project_messages m
                 WHERE m.folder_id = f.id AND m.sender_role = 'client' AND m.read_at IS NULL) AS unread_count
         FROM project_folders f
         LEFT JOIN profiles pr ON pr.id = f.user_id
        ORDER BY f.updated_at DESC`
    );
    // Libellé d'étape courante (pour le badge kanban), calculé avec le catalogue admin
    const catalog = await getProjectMilestones();
    const withStage = folders.map((f) => ({
      ...f,
      stageLabel: currentMilestone({ milestones: f.milestones }, catalog)?.label ?? null,
    }));
    return NextResponse.json(withStage);
  } catch (err) {
    console.error('Admin folders GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Crée un dossier (nom + client optionnel : id existant ou e-mail). */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    if (!name) return NextResponse.json({ error: 'Nom du dossier requis' }, { status: 400 });

    // Client : id explicite, ou e-mail (profil léger créé si absent), ou aucun (attribué plus tard)
    let userId: string | null = null;
    if (body.clientUserId) {
      const c = await queryOne<{ id: string }>('SELECT id FROM profiles WHERE id = $1', [body.clientUserId]);
      if (!c) return NextResponse.json({ error: 'Client introuvable' }, { status: 400 });
      userId = c.id;
    } else if (body.clientEmail) {
      const email = String(body.clientEmail).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Email client invalide' }, { status: 400 });
      }
      const existing = await queryOne<{ id: string }>('SELECT id FROM profiles WHERE lower(email) = $1', [email]);
      if (existing) userId = existing.id;
      else {
        const created = await rawQuery(
          `INSERT INTO profiles (email, full_name, role, discount_rate) VALUES ($1, $2, 'client', 0) RETURNING id`,
          [email, body.clientName || email.split('@')[0]]
        );
        userId = created.rows[0].id;
      }
    }

    const result = await rawQuery(
      `INSERT INTO project_folders (user_id, name, status, milestones) VALUES ($1, $2, 'draft', '{}'::jsonb) RETURNING *`,
      [userId, name]
    );
    const folder = toCamelCase<ProjectFolder>(result.rows[0]);
    logAdminAction(request, auth, 'create_folder', 'folder', folder.id, `Dossier « ${name} » créé`);
    return NextResponse.json(folder, { status: 201 });
  } catch (err) {
    console.error('Admin folders POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
