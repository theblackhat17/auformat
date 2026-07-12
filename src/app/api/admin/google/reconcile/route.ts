import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { query, rawQuery } from '@/lib/db';
import { findCancelledGoogleEvents } from '@/lib/google-calendar';

/**
 * Réconciliation Google → site (sens retour) : les RDV supprimés depuis
 * l'app Google Agenda sont retirés du site. Appelé par l'agenda admin à chaque
 * rafraîchissement ; le vrai travail est limité à une fois par minute.
 *
 * Périmètre : uniquement les événements d'hier et à venir — l'historique du
 * site est préservé même si l'agenda Google est purgé de ses vieux événements.
 */
let lastRunAt = 0;
const COOLDOWN_MS = 60_000;

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  if (Date.now() - lastRunAt < COOLDOWN_MS) {
    return NextResponse.json({ skipped: true });
  }
  lastRunAt = Date.now();

  try {
    const rows = await query<{ id: string; googleEventId: string }>(
      `SELECT id, google_event_id FROM project_events
       WHERE google_event_id IS NOT NULL
         AND start_at >= NOW() - INTERVAL '1 day'`
    );
    if (rows.length === 0) return NextResponse.json({ checked: 0, removed: 0 });

    const cancelled = await findCancelledGoogleEvents(rows.map((r) => r.googleEventId));
    const toDelete = rows.filter((r) => cancelled.has(r.googleEventId)).map((r) => r.id);
    if (toDelete.length > 0) {
      await rawQuery('DELETE FROM project_events WHERE id = ANY($1)', [toDelete]);
      console.log(`[google-reconcile] ${toDelete.length} événement(s) supprimé(s) côté Google retirés du site`);
    }
    return NextResponse.json({ checked: rows.length, removed: toDelete.length });
  } catch (err) {
    console.error('Google reconcile error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
