import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import { notifyAdminsChatMessage, sendChatNotificationToClient } from '@/lib/mailer';
import type { ChatMessage } from '@/lib/types';

/**
 * Messagerie client ↔ atelier, rattachée à un projet OU à un dossier de chantier.
 * - GET  ?projectId= | ?folderId= : messages du fil (et marque comme lus ceux de l'autre partie)
 * - POST { projectId|folderId, body, attachments } : nouveau message ; l'autre partie est
 *   prévenue par email seulement si elle n'a pas déjà un message non lu (anti-spam).
 */

type ThreadInfo = {
  key: 'project_id' | 'folder_id';
  id: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  contextLabel: string;
};

async function resolveThread(
  auth: { userId: string; role: string },
  projectId: string | null,
  folderId: string | null
): Promise<ThreadInfo | NextResponse> {
  if (projectId) {
    const p = await queryOne<{ userId: string; name: string; email: string; fullName: string | null }>(
      `SELECT p.user_id, p.name, pr.email, pr.full_name
       FROM projects p JOIN profiles pr ON pr.id = p.user_id WHERE p.id = $1`,
      [projectId]
    );
    if (!p) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    if (auth.role !== 'admin' && p.userId !== auth.userId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }
    return { key: 'project_id', id: projectId, ownerId: p.userId, ownerEmail: p.email, ownerName: p.fullName || p.email.split('@')[0], contextLabel: `votre projet « ${p.name} »` };
  }
  if (folderId) {
    const f = await queryOne<{ userId: string; name: string; email: string; fullName: string | null }>(
      `SELECT f.user_id, f.name, pr.email, pr.full_name
       FROM project_folders f JOIN profiles pr ON pr.id = f.user_id WHERE f.id = $1`,
      [folderId]
    );
    if (!f) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    if (auth.role !== 'admin' && f.userId !== auth.userId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }
    return { key: 'folder_id', id: folderId, ownerId: f.userId, ownerEmail: f.email, ownerName: f.fullName || f.email.split('@')[0], contextLabel: `votre dossier « ${f.name} »` };
  }
  return NextResponse.json({ error: 'projectId ou folderId requis' }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const thread = await resolveThread(auth, url.searchParams.get('projectId'), url.searchParams.get('folderId'));
  if (thread instanceof NextResponse) return thread;

  try {
    const myRole = auth.role === 'admin' ? 'admin' : 'client';
    const messages = await query<ChatMessage>(
      `SELECT id, project_id, folder_id, sender_id, sender_role, body, attachments, read_at, created_at
       FROM project_messages WHERE ${thread.key} = $1 ORDER BY created_at ASC LIMIT 300`,
      [thread.id]
    );
    // Les messages de l'autre partie sont maintenant lus
    await rawQuery(
      `UPDATE project_messages SET read_at = NOW()
       WHERE ${thread.key} = $1 AND sender_role != $2 AND read_at IS NULL`,
      [thread.id, myRole]
    );
    return NextResponse.json(messages);
  } catch (err) {
    console.error('Chat GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const payload = await request.json();
    const thread = await resolveThread(auth, payload.projectId || null, payload.folderId || null);
    if (thread instanceof NextResponse) return thread;

    const body: string | null = typeof payload.body === 'string' && payload.body.trim() ? payload.body.trim().slice(0, 4000) : null;
    const attachments: { name: string; url: string }[] = Array.isArray(payload.attachments)
      ? payload.attachments
          .filter((a: unknown): a is { name: string; url: string } =>
            !!a && typeof (a as { url?: unknown }).url === 'string' && ((a as { url: string }).url).startsWith('/api/uploads/'))
          .slice(0, 5)
          .map((a: { name?: string; url: string }) => ({ name: String(a.name || 'document').slice(0, 120), url: a.url }))
      : [];

    if (!body && attachments.length === 0) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 });
    }

    const myRole = auth.role === 'admin' ? 'admin' : 'client';

    // L'autre partie a-t-elle déjà un message non lu de notre part ? Si oui, pas de nouvel email.
    const pending = await queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM project_messages
       WHERE ${thread.key} = $1 AND sender_role = $2 AND read_at IS NULL`,
      [thread.id, myRole]
    );

    const inserted = await rawQuery(
      `INSERT INTO project_messages (project_id, folder_id, sender_id, sender_role, body, attachments)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *`,
      [
        thread.key === 'project_id' ? thread.id : null,
        thread.key === 'folder_id' ? thread.id : null,
        auth.userId,
        myRole,
        body,
        JSON.stringify(attachments),
      ]
    );

    const preview = body || `📎 ${attachments.length} document${attachments.length > 1 ? 's' : ''} joint${attachments.length > 1 ? 's' : ''}`;
    if ((pending?.n ?? 0) === 0) {
      if (myRole === 'client') {
        void notifyAdminsChatMessage(thread.ownerName, thread.contextLabel.replace(/^votre /, ''), preview.slice(0, 300));
      } else if (!thread.ownerEmail.endsWith('@anonyme.local')) {
        void sendChatNotificationToClient(thread.ownerEmail, thread.ownerName, thread.contextLabel.replace(/^votre /, ''), preview.slice(0, 300));
      }
    }

    return NextResponse.json(toCamelCase<ChatMessage>(inserted.rows[0]), { status: 201 });
  } catch (err) {
    console.error('Chat POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
