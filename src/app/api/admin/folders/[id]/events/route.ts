import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { PROJECT_EVENT_TYPES } from '@/lib/constants';
import type { ProjectEvent } from '@/lib/types';

/** Agenda d'un DOSSIER (admin) : événements typés (RDV client, jours d'atelier). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const result = await rawQuery('SELECT * FROM project_events WHERE folder_id = $1 ORDER BY start_at ASC', [id]);
    return NextResponse.json({ events: result.rows.map((row) => toCamelCase<ProjectEvent>(row)) });
  } catch (err) {
    console.error('Folder events GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const folder = await queryOne<{ id: string; name: string }>('SELECT id, name FROM project_folders WHERE id = $1', [id]);
    if (!folder) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

    const body = await request.json();
    const eventType = PROJECT_EVENT_TYPES.find((t) => t.key === body.type);
    if (!eventType) return NextResponse.json({ error: "Type d'événement inconnu" }, { status: 400 });
    const startAt = typeof body.startAt === 'string' ? new Date(body.startAt) : null;
    if (!startAt || isNaN(startAt.getTime())) return NextResponse.json({ error: 'Date de début invalide' }, { status: 400 });
    const endAt = typeof body.endAt === 'string' && !isNaN(new Date(body.endAt).getTime()) ? new Date(body.endAt) : null;

    const inserted = await rawQuery(
      `INSERT INTO project_events (folder_id, type, title, start_at, end_at, all_day, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, eventType.key, typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null,
       startAt.toISOString(), endAt ? endAt.toISOString() : null, body.allDay === true,
       typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null, auth.userId]
    );
    logAdminAction(request, auth, 'create_event', 'folder', id, `Événement « ${eventType.label} » ajouté sur « ${folder.name} »`);
    return NextResponse.json({ event: toCamelCase<ProjectEvent>(inserted.rows[0]) }, { status: 201 });
  } catch (err) {
    console.error('Folder events POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const { eventId } = await request.json();
    if (!eventId) return NextResponse.json({ error: 'eventId requis' }, { status: 400 });
    await rawQuery('DELETE FROM project_events WHERE id = $1 AND folder_id = $2', [eventId, id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Folder events DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
