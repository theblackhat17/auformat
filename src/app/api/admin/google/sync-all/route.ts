import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, rawQuery } from '@/lib/db';
import { pushEventToGoogle } from '@/lib/google-calendar';
import type { ProjectEvent } from '@/lib/types';

/** Pousse vers Google TOUS les événements déjà enregistrés (rattrapage des dates existantes) */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const rows = await query<ProjectEvent & { projectName: string }>(
      `SELECT e.*, COALESCE(p.name, f.name) AS project_name
       FROM project_events e
       LEFT JOIN projects p ON e.project_id = p.id
       LEFT JOIN project_folders f ON e.folder_id = f.id
       ORDER BY e.start_at ASC`
    );
    let synced = 0;
    for (const ev of rows) {
      const gid = await pushEventToGoogle(ev, ev.projectName || 'Projet');
      if (gid && gid !== ev.googleEventId) {
        await rawQuery('UPDATE project_events SET google_event_id = $1 WHERE id = $2', [gid, ev.id]);
      }
      if (gid) synced++;
    }
    return NextResponse.json({ total: rows.length, synced });
  } catch (err) {
    console.error('Google sync-all error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
