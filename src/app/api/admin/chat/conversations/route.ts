import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';

/**
 * Boîte de réception de l'atelier : toutes les conversations (projets + dossiers) qui ont
 * au moins un message, avec dernier message, date et nombre de messages clients non lus.
 * Groupées par client côté UI.
 */
type Conversation = {
  kind: 'project' | 'folder';
  threadId: string;
  label: string;
  projectStatus: string | null;
  clientId: string;
  clientName: string | null;
  clientEmail: string | null;
  lastAt: string;
  lastBody: string | null;
  lastRole: 'client' | 'admin';
  lastAtt: number;
  unread: number;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const projectThreads = await query<Conversation>(
      `SELECT 'project' AS kind, p.id AS thread_id, p.name AS label, p.status AS project_status,
              p.user_id AS client_id, pr.full_name AS client_name, pr.email AS client_email,
              lm.created_at AS last_at, lm.body AS last_body, lm.sender_role AS last_role,
              jsonb_array_length(lm.attachments) AS last_att,
              (SELECT COUNT(*)::int FROM project_messages m
                 WHERE m.project_id = p.id AND m.sender_role = 'client' AND m.read_at IS NULL) AS unread
       FROM projects p
       JOIN profiles pr ON pr.id = p.user_id
       JOIN LATERAL (
         SELECT created_at, body, sender_role, attachments
         FROM project_messages m WHERE m.project_id = p.id
         ORDER BY created_at DESC LIMIT 1
       ) lm ON TRUE`
    );

    const folderThreads = await query<Conversation>(
      `SELECT 'folder' AS kind, f.id AS thread_id, f.name AS label, NULL::text AS project_status,
              f.user_id AS client_id, pr.full_name AS client_name, pr.email AS client_email,
              lm.created_at AS last_at, lm.body AS last_body, lm.sender_role AS last_role,
              jsonb_array_length(lm.attachments) AS last_att,
              (SELECT COUNT(*)::int FROM project_messages m
                 WHERE m.folder_id = f.id AND m.sender_role = 'client' AND m.read_at IS NULL) AS unread
       FROM project_folders f
       JOIN profiles pr ON pr.id = f.user_id
       JOIN LATERAL (
         SELECT created_at, body, sender_role, attachments
         FROM project_messages m WHERE m.folder_id = f.id
         ORDER BY created_at DESC LIMIT 1
       ) lm ON TRUE`
    );

    const all = [...projectThreads, ...folderThreads].sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
    return NextResponse.json(all);
  } catch (err) {
    console.error('Admin chat conversations error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
