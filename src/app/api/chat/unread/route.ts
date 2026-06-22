import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';

/** Compteurs de messages non lus, par projet et par dossier, pour la partie qui demande */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const isAdmin = auth.role === 'admin';
    // L'admin compte les messages clients non lus ; le client, les messages de l'atelier
    const fromRole = isAdmin ? 'client' : 'admin';

    const projectRows = await query<{ projectId: string; n: number }>(
      isAdmin
        ? `SELECT m.project_id, COUNT(*)::int AS n FROM project_messages m
           WHERE m.project_id IS NOT NULL AND m.sender_role = $1 AND m.read_at IS NULL
           GROUP BY m.project_id`
        : `SELECT m.project_id, COUNT(*)::int AS n FROM project_messages m
           JOIN projects p ON p.id = m.project_id
           WHERE p.user_id = $2 AND m.sender_role = $1 AND m.read_at IS NULL
           GROUP BY m.project_id`,
      isAdmin ? [fromRole] : [fromRole, auth.userId]
    );
    const folderRows = await query<{ folderId: string; n: number }>(
      isAdmin
        ? `SELECT m.folder_id, COUNT(*)::int AS n FROM project_messages m
           WHERE m.folder_id IS NOT NULL AND m.sender_role = $1 AND m.read_at IS NULL
           GROUP BY m.folder_id`
        : `SELECT m.folder_id, COUNT(*)::int AS n FROM project_messages m
           JOIN project_folders f ON f.id = m.folder_id
           WHERE f.user_id = $2 AND m.sender_role = $1 AND m.read_at IS NULL
           GROUP BY m.folder_id`,
      isAdmin ? [fromRole] : [fromRole, auth.userId]
    );

    const projects: Record<string, number> = {};
    for (const r of projectRows) projects[r.projectId] = r.n;
    const folders: Record<string, number> = {};
    for (const r of folderRows) folders[r.folderId] = r.n;
    return NextResponse.json({ projects, folders });
  } catch (err) {
    console.error('Chat unread error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
