import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { queryOne, rawQuery } from '@/lib/db';
import { requireAuth } from '@/lib/middleware-auth';
import type { Project } from '@/lib/types';

/** Génère (ou renvoie) le lien de partage public d'un projet. Propriétaire uniquement. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const project = await queryOne<Project & { shareToken: string | null }>('SELECT * FROM projects WHERE id = $1', [id]);
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    if (auth.role !== 'admin' && project.userId !== auth.userId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    let token = project.shareToken;
    if (!token) {
      token = randomBytes(16).toString('hex');
      await rawQuery('UPDATE projects SET share_token = $1, updated_at = NOW() WHERE id = $2', [token, id]);
    }

    return NextResponse.json({ token, path: `/configurateur/partage/${token}` });
  } catch (err) {
    console.error('Share project error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** Révoque le lien de partage. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const project = await queryOne<Project>('SELECT * FROM projects WHERE id = $1', [id]);
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    if (auth.role !== 'admin' && project.userId !== auth.userId) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    await rawQuery('UPDATE projects SET share_token = NULL, updated_at = NOW() WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unshare project error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
