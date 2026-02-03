import { NextRequest, NextResponse } from 'next/server';
import { query, rawQuery } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { toCamelCase } from '@/lib/db';
import type { Project } from '@/lib/types';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const projects = await query<Project>(
      `SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC`,
      [auth.userId]
    );
    return NextResponse.json(projects);
  } catch (err) {
    console.error('List projects error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();

    const result = await rawQuery(
      `INSERT INTO projects (user_id, name, type, config, status, thumbnail_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        auth.userId,
        body.name,
        body.type || 'custom',
        JSON.stringify(body.config),
        body.status || 'draft',
        body.thumbnailUrl || null,
        body.notes || null,
      ]
    );

    const project = toCamelCase<Project>(result.rows[0]);

    const ip = getClientIp(request);
    const ua = getUserAgent(request);
    await logActivity(auth.userId, 'create_project', 'project', project.id, { description: `Projet "${body.name}" cree` }, ip, ua);

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error('Create project error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
