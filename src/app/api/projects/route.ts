import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, rawQuery } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import { logActivity } from '@/lib/activity-logger';
import { getClientIp, getUserAgent } from '@/lib/middleware-auth';
import { toCamelCase } from '@/lib/db';
import { PROJECT_MILESTONES } from '@/lib/constants';
import type { Project } from '@/lib/types';

/** Retire les données internes (notes admin, production, jalons financiers) avant l'envoi à un client */
function sanitizeForClient(project: Project): Project {
  const clean: Project = { ...project };
  delete clean.adminNotes;
  delete clean.production;
  if (clean.milestones) {
    const visible: NonNullable<Project['milestones']> = {};
    for (const m of PROJECT_MILESTONES) {
      if (!m.financial && clean.milestones[m.key]) visible[m.key] = clean.milestones[m.key];
    }
    clean.milestones = visible;
  }
  return clean;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const projects = await query<Project>(
      `SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC`,
      [auth.userId]
    );
    return NextResponse.json(auth.role === 'admin' ? projects : projects.map(sanitizeForClient));
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

    // Un admin (commercial) peut créer un projet directement sur le compte d'un client
    let ownerId = auth.userId;
    if (body.clientUserId && auth.role === 'admin') {
      const client = await queryOne<{ id: string }>('SELECT id FROM profiles WHERE id = $1', [body.clientUserId]);
      if (!client) {
        return NextResponse.json({ error: 'Client introuvable' }, { status: 400 });
      }
      ownerId = client.id;
    } else if (body.clientEmail && auth.role === 'admin') {
      // Client sans compte : profil léger créé (même mécanique que les demandes de devis).
      // Le client l'activera via « Mot de passe oublié » avec cet email.
      const email = String(body.clientEmail).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Email client invalide' }, { status: 400 });
      }
      const existing = await queryOne<{ id: string }>('SELECT id FROM profiles WHERE email = $1', [email]);
      if (existing) {
        ownerId = existing.id;
      } else {
        const created = await rawQuery(
          `INSERT INTO profiles (email, full_name, role, discount_rate) VALUES ($1, $2, 'client', 0) RETURNING id`,
          [email, body.clientName || email.split('@')[0]]
        );
        ownerId = created.rows[0].id;
      }
    }

    const result = await rawQuery(
      `INSERT INTO projects (user_id, name, type, config, status, thumbnail_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        ownerId,
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
