import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, rawQuery, withTransaction } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { extractUploadFilenames, deleteUploadedFiles } from '@/lib/upload';
import type { ProjectFolder, Project } from '@/lib/types';

/** Détail d'un dossier : le dossier, son client, et les projets qu'il contient. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const folder = await queryOne<ProjectFolder & { clientName: string | null; clientEmail: string | null; clientPhone: string | null }>(
      `SELECT f.id, f.user_id, f.name, f.status, f.milestones, f.admin_notes, f.created_at, f.updated_at,
              pr.full_name AS client_name, pr.email AS client_email, pr.phone AS client_phone
         FROM project_folders f LEFT JOIN profiles pr ON pr.id = f.user_id
        WHERE f.id = $1`,
      [id]
    );
    if (!folder) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    const projects = await query<Project>('SELECT * FROM projects WHERE folder_id = $1 ORDER BY created_at DESC', [id]);
    return NextResponse.json({ folder, projects });
  } catch (err) {
    console.error('Admin folder GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Met à jour le dossier : nom, notes admin, et attribution d'un client. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const body = await request.json();
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (typeof body.name === 'string' && body.name.trim()) { sets.push(`name = $${i++}`); vals.push(body.name.trim().slice(0, 120)); }
    if (body.adminNotes !== undefined) { sets.push(`admin_notes = $${i++}`); vals.push(body.adminNotes); }

    // Attribution d'un client : e-mail (profil léger si absent) ou id ; les projets du dossier suivent.
    let newUserId: string | undefined;
    if (body.clientUserId) {
      const c = await queryOne<{ id: string }>('SELECT id FROM profiles WHERE id = $1', [body.clientUserId]);
      if (!c) return NextResponse.json({ error: 'Client introuvable' }, { status: 400 });
      newUserId = c.id;
    } else if (body.clientEmail) {
      const email = String(body.clientEmail).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Email client invalide' }, { status: 400 });
      const existing = await queryOne<{ id: string }>('SELECT id FROM profiles WHERE lower(email) = $1', [email]);
      newUserId = existing?.id ?? (await rawQuery(`INSERT INTO profiles (email, full_name, role, discount_rate) VALUES ($1, $2, 'client', 0) RETURNING id`, [email, body.clientName || email.split('@')[0]])).rows[0].id;
    }
    if (newUserId) { sets.push(`user_id = $${i++}`); vals.push(newUserId); }

    if (sets.length === 0) return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 });
    vals.push(id);
    await rawQuery(`UPDATE project_folders SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i}`, vals);
    // Les projets du dossier appartiennent au même client
    if (newUserId) await rawQuery('UPDATE projects SET user_id = $1 WHERE folder_id = $2', [newUserId, id]);

    logAdminAction(request, auth, 'update_folder', 'folder', id, `Dossier mis à jour`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin folder PUT error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Supprime le dossier (les projets sont détachés, pas supprimés). Efface ses fichiers. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const [docs, updates] = await Promise.all([
      query<{ url: string }>('SELECT url FROM project_documents WHERE folder_id = $1', [id]),
      query<{ note: string | null }>('SELECT note FROM project_updates WHERE folder_id = $1', [id]),
    ]);
    const fileRefs = [
      ...docs.map((d) => d.url),
      ...updates.flatMap((u) => extractUploadFilenames(u.note)),
    ];
    // photos des updates
    const photoRows = await query<{ photos: string[] | null }>('SELECT photos FROM project_updates WHERE folder_id = $1', [id]);
    for (const r of photoRows) if (Array.isArray(r.photos)) fileRefs.push(...r.photos);

    await withTransaction(async (client) => {
      // projets détachés (folder_id → NULL via ON DELETE SET NULL, mais on le fait explicitement avant)
      await client.query('UPDATE projects SET folder_id = NULL WHERE folder_id = $1', [id]);
      await client.query('DELETE FROM project_folders WHERE id = $1', [id]); // cascade docs/updates/messages
    });
    await deleteUploadedFiles(fileRefs);

    logAdminAction(request, auth, 'delete_folder', 'folder', id, `Dossier supprimé`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin folder DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
