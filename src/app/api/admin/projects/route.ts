import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import type { Project } from '@/lib/types';

/** Tous les projets avec leur propriétaire — alimente le kanban /admin/projets */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const projects = await query<Project & { clientName: string | null; clientEmail: string | null; updateCount: number; unreadCount: number; folderName: string | null; folderUnread: number }>(
      `SELECT p.id, p.user_id, p.name, p.type, p.status, p.notes, p.is_template, p.folder_id, p.milestones, p.created_at, p.updated_at,
              pr.full_name AS client_name, pr.email AS client_email,
              f.name AS folder_name,
              (SELECT COUNT(*)::int FROM project_updates pu WHERE pu.project_id = p.id) AS update_count,
              (SELECT COUNT(*)::int FROM project_messages m WHERE m.project_id = p.id AND m.sender_role = 'client' AND m.read_at IS NULL) AS unread_count,
              COALESCE((SELECT COUNT(*)::int FROM project_messages m WHERE m.folder_id = p.folder_id AND m.sender_role = 'client' AND m.read_at IS NULL), 0) AS folder_unread
       FROM projects p
       LEFT JOIN profiles pr ON pr.id = p.user_id
       LEFT JOIN project_folders f ON f.id = p.folder_id
       ORDER BY p.updated_at DESC`
    );
    return NextResponse.json(projects);
  } catch (err) {
    console.error('Admin list projects error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
