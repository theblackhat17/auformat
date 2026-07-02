import { NextRequest, NextResponse } from 'next/server';
import { rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import type { ProjectEvent } from '@/lib/types';

/** Événement d'agenda enrichi du projet et du client associés */
export type AgendaEvent = ProjectEvent & {
  projectName: string;
  projectUserId: string | null;
  clientName: string | null;
};

/**
 * Agenda global (admin) : tous les événements de tous les projets,
 * filtrables par plage de dates (`from` / `to` en ISO), avec le nom du
 * projet et du client pour l'affichage calendrier.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const from = fromParam && !isNaN(new Date(fromParam).getTime()) ? new Date(fromParam).toISOString() : null;
    const to = toParam && !isNaN(new Date(toParam).getTime()) ? new Date(toParam).toISOString() : null;

    const result = await rawQuery(
      `SELECT e.*, p.name AS project_name, p.user_id AS project_user_id, pr.full_name AS client_name
       FROM project_events e
       JOIN projects p ON e.project_id = p.id
       LEFT JOIN profiles pr ON p.user_id = pr.id
       WHERE ($1::timestamptz IS NULL OR e.start_at >= $1)
         AND ($2::timestamptz IS NULL OR e.start_at <= $2)
       ORDER BY e.start_at ASC`,
      [from, to]
    );

    return NextResponse.json({ events: result.rows.map((row) => toCamelCase<AgendaEvent>(row)) });
  } catch (err) {
    console.error('List agenda events error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
