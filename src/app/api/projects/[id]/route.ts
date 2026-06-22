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

    // Transfert de propriété (admin) : attribuer le projet au compte d'un client,
    // existant (clientUserId) ou créé à la volée par email (profil léger, comme les devis)
    if (auth.role === 'admin' && (body.clientUserId || body.clientEmail)) {
      let newOwnerId: string | null = null;
      if (body.clientUserId) {
        const client = await queryOne<{ id: string }>('SELECT id FROM profiles WHERE id = $1', [body.clientUserId]);
        if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 400 });
        newOwnerId = client.id;
      } else {
        const email = String(body.clientEmail).toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return NextResponse.json({ error: 'Email client invalide' }, { status: 400 });
        }
        const found = await queryOne<{ id: string }>('SELECT id FROM profiles WHERE email = $1', [email]);
        if (found) {
          newOwnerId = found.id;
        } else {
          const created = await rawQuery(
            `INSERT INTO profiles (email, full_name, role, discount_rate) VALUES ($1, $2, 'client', 0) RETURNING id`,
            [email, body.clientName || email.split('@')[0]]
          );
          newOwnerId = created.rows[0].id;
        }
      }
      updates.userId = newOwnerId;
    }

    // Rangement dans un dossier de chantier (le dossier doit appartenir au propriétaire du projet)
    if (body.folderId !== undefined) {
      if (body.folderId === null) {
        updates.folderId = null;
      } else {
        const folder = await queryOne<{ userId: string }>('SELECT user_id FROM project_folders WHERE id = $1', [body.folderId]);
        if (!folder || folder.userId !== existing.userId) {
          return NextResponse.json({ error: 'Dossier invalide' }, { status: 400 });
        }
        updates.folderId = body.folderId;
      }
    }

    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.config !== undefined) updates.config = JSON.stringify(body.config);
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.thumbnailUrl !== undefined) updates.thumbnailUrl = body.thumbnailUrl;
    // Modèle de composition proposé au démarrage du configurateur (admin uniquement)
    if (body.isTemplate !== undefined && auth.role === 'admin') updates.isTemplate = !!body.isTemplate;

    // For config, we need to handle JSON specially in the update
    if (body.config !== undefined) {
      const result = await rawQuery(
        `UPDATE projects SET name = COALESCE($1, name), type = COALESCE($2, type),
         config = COALESCE($3::jsonb, config), status = COALESCE($4, status),
         notes = COALESCE($5, notes), thumbnail_url = COALESCE($6, thumbnail_url),
         is_template = COALESCE($7, is_template),
         updated_at = NOW() WHERE id = $8 RETURNING *`,
        [
          body.name || null,
          body.type || null,
          body.config ? JSON.stringify(body.config) : null,
          body.status || null,
          body.notes ?? null,
          body.thumbnailUrl ?? null,
          body.isTemplate !== undefined && auth.role === 'admin' ? !!body.isTemplate : null,
          id,
        ]
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
