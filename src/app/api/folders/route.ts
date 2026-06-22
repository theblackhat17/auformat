import { NextRequest, NextResponse } from 'next/server';
import { query, rawQuery, toCamelCase } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import type { ProjectFolder } from '@/lib/types';

/** Dossiers de chantier du client connecté (plusieurs projets qui vont ensemble) */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const folders = await query<ProjectFolder>(
      `SELECT f.*, (SELECT COUNT(*)::int FROM projects p WHERE p.folder_id = f.id) AS project_count
       FROM project_folders f WHERE f.user_id = $1 ORDER BY f.created_at ASC`,
      [auth.userId]
    );
    return NextResponse.json(folders);
  } catch (err) {
    console.error('Folders GET error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { name } = await request.json();
    const trimmed = typeof name === 'string' ? name.trim().slice(0, 120) : '';
    if (!trimmed) return NextResponse.json({ error: 'Nom du dossier requis' }, { status: 400 });

    const result = await rawQuery(
      `INSERT INTO project_folders (user_id, name) VALUES ($1, $2) RETURNING *`,
      [auth.userId, trimmed]
    );
    return NextResponse.json(toCamelCase<ProjectFolder>(result.rows[0]), { status: 201 });
  } catch (err) {
    console.error('Folders POST error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
