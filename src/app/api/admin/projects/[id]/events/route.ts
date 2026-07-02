import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { PROJECT_EVENT_TYPES } from '@/lib/constants';
import { pushEventToGoogle, deleteEventFromGoogle } from '@/lib/google-calendar';
import type { ProjectEvent } from '@/lib/types';

/**
 * Synchronisation Google Agenda (best effort) : pousse l'événement et persiste
 * l'id Google si nouveau. Ne lève jamais — un échec Google ne casse pas la requête.
 */
async function syncEventToGoogle(event: ProjectEvent, projectName: string): Promise<ProjectEvent> {
  try {
    const gid = await pushEventToGoogle(event, projectName);
    if (gid && gid !== event.googleEventId) {
      await rawQuery('UPDATE project_events SET google_event_id = $1 WHERE id = $2', [gid, event.id]);
      return { ...event, googleEventId: gid };
    }
  } catch (err) {
    console.error('Google Calendar sync error:', err instanceof Error ? err.message : err);
  }
  return event;
}

/**
 * Agenda d'un projet (admin) : événements typés (RDV client, jours d'atelier)
 * rattachés au projet. CRUD complet réservé aux admins.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const result = await rawQuery(
      'SELECT * FROM project_events WHERE project_id = $1 ORDER BY start_at ASC', [id]
    );
    return NextResponse.json({ events: result.rows.map((row) => toCamelCase<ProjectEvent>(row)) });
  } catch (err) {
    console.error('List project events error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Crée un événement sur le projet */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const project = await queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM projects WHERE id = $1', [id]
    );
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    const body = await request.json();
    const eventType = PROJECT_EVENT_TYPES.find((t) => t.key === body.type);
    if (!eventType) {
      return NextResponse.json({ error: "Type d'événement inconnu" }, { status: 400 });
    }
    const startAt = typeof body.startAt === 'string' ? new Date(body.startAt) : null;
    if (!startAt || isNaN(startAt.getTime())) {
      return NextResponse.json({ error: 'Date de début invalide' }, { status: 400 });
    }
    const endAt = typeof body.endAt === 'string' && !isNaN(new Date(body.endAt).getTime())
      ? new Date(body.endAt) : null;

    const inserted = await rawQuery(
      `INSERT INTO project_events (project_id, type, title, start_at, end_at, all_day, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        id,
        eventType.key,
        typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null,
        startAt.toISOString(),
        endAt ? endAt.toISOString() : null,
        body.allDay === true,
        typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        auth.userId,
      ]
    );

    logAdminAction(request, auth, 'create_event', 'project', id,
      `Événement « ${eventType.label} » ajouté sur « ${project.name} »`);

    const event = await syncEventToGoogle(toCamelCase<ProjectEvent>(inserted.rows[0]), project.name);
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error('Create project event error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Met à jour un événement du projet */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const body = await request.json();
    const { eventId } = body;
    if (!eventId) return NextResponse.json({ error: 'eventId requis' }, { status: 400 });

    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];

    if (body.type !== undefined) {
      const eventType = PROJECT_EVENT_TYPES.find((t) => t.key === body.type);
      if (!eventType) return NextResponse.json({ error: "Type d'événement inconnu" }, { status: 400 });
      values.push(eventType.key);
      sets.push(`type = $${values.length}`);
    }
    if (body.startAt !== undefined) {
      const startAt = typeof body.startAt === 'string' ? new Date(body.startAt) : null;
      if (!startAt || isNaN(startAt.getTime())) {
        return NextResponse.json({ error: 'Date de début invalide' }, { status: 400 });
      }
      values.push(startAt.toISOString());
      sets.push(`start_at = $${values.length}`);
    }
    if (body.endAt !== undefined) {
      const endAt = typeof body.endAt === 'string' && !isNaN(new Date(body.endAt).getTime())
        ? new Date(body.endAt).toISOString() : null;
      values.push(endAt);
      sets.push(`end_at = $${values.length}`);
    }
    if (body.allDay !== undefined) {
      values.push(body.allDay === true);
      sets.push(`all_day = $${values.length}`);
    }
    if (body.title !== undefined) {
      values.push(typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null);
      sets.push(`title = $${values.length}`);
    }
    if (body.notes !== undefined) {
      values.push(typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null);
      sets.push(`notes = $${values.length}`);
    }

    values.push(eventId, id);
    const result = await rawQuery(
      `UPDATE project_events SET ${sets.join(', ')}
       WHERE id = $${values.length - 1} AND project_id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    }

    let event = toCamelCase<ProjectEvent>(result.rows[0]);
    const project = await queryOne<{ name: string }>('SELECT name FROM projects WHERE id = $1', [id]);
    if (project) event = await syncEventToGoogle(event, project.name);
    return NextResponse.json({ event });
  } catch (err) {
    console.error('Update project event error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Supprime un événement du projet */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const { eventId } = await request.json();
    if (!eventId) return NextResponse.json({ error: 'eventId requis' }, { status: 400 });
    const deleted = await rawQuery(
      `DELETE FROM project_events WHERE id = $1 AND project_id = $2 RETURNING google_event_id`,
      [eventId, id]
    );
    const googleEventId = deleted.rows[0]?.google_event_id as string | null | undefined;
    if (googleEventId) await deleteEventFromGoogle(googleEventId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete project event error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
