import { NextRequest, NextResponse } from 'next/server';
import { queryOne, update, deleteById, rawQuery } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { toCamelCase } from '@/lib/db';
import type { Project } from '@/lib/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const project = await queryOne<Project>('SELECT * FROM projects WHERE id = $1', [id]);

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    if (auth.role !== 'admin' && project.userId !== auth.userId) {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    return NextResponse.json(project);
  } catch (err) {
    console.error('Get project error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const existing = await queryOne<Project>('SELECT * FROM projects WHERE id = $1', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }
    if (auth.role !== 'admin' && existing.userId !== auth.userId) {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.config !== undefined) updates.config = JSON.stringify(body.config);
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.thumbnailUrl !== undefined) updates.thumbnailUrl = body.thumbnailUrl;

    // For config, we need to handle JSON specially in the update
    if (body.config !== undefined) {
      const result = await rawQuery(
        `UPDATE projects SET name = COALESCE($1, name), type = COALESCE($2, type),
         config = COALESCE($3::jsonb, config), status = COALESCE($4, status),
         notes = COALESCE($5, notes), thumbnail_url = COALESCE($6, thumbnail_url),
         updated_at = NOW() WHERE id = $7 RETURNING *`,
        [body.name || null, body.type || null, body.config ? JSON.stringify(body.config) : null, body.status || null, body.notes ?? null, body.thumbnailUrl ?? null, id]
      );
      const project = toCamelCase<Project>(result.rows[0]);
      return NextResponse.json(project);
    }

    const project = await update<Project>('projects', id, updates);
    const ip = getClientIp(request);
    const ua = getUserAgent(request);
    await logActivity(auth.userId, 'update_project', 'project', id, { description: 'Projet mis a jour' }, ip, ua);
    return NextResponse.json(project);
  } catch (err) {
    console.error('Update project error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const existing = await queryOne<Project>('SELECT * FROM projects WHERE id = $1', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }
    if (auth.role !== 'admin' && existing.userId !== auth.userId) {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    await deleteById('projects', id);

    const ip = getClientIp(request);
    const ua = getUserAgent(request);
    await logActivity(auth.userId, 'delete_project', 'project', id, { description: `Projet "${existing.name}" supprime` }, ip, ua);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete project error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
