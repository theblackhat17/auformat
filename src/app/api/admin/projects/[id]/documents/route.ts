import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { saveUploadedFile } from '@/lib/upload';
import type { ProjectDocument } from '@/lib/types';

/**
 * Documents d'un projet (admin) : upload d'un fichier (plan, devis signé, PDF…)
 * avec visibilité 'client' (visible par le propriétaire) ou 'admin' (interne).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const project = await queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM projects WHERE id = $1', [id]
    );
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }
    const visibility = formData.get('visibility') === 'client' ? 'client' : 'admin';

    const saved = await saveUploadedFile(file, { allowPdf: true, prefix: 'project' });

    const inserted = await rawQuery(
      `INSERT INTO project_documents (project_id, name, url, visibility, uploaded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, saved.originalName, saved.path, visibility, auth.userId]
    );

    logAdminAction(request, auth, 'upload_project_document', 'project', id,
      `Document « ${saved.originalName} » ajouté (${visibility}) sur « ${project.name} »`);

    return NextResponse.json({ document: toCamelCase<ProjectDocument>(inserted.rows[0]) }, { status: 201 });
  } catch (err) {
    console.error('Upload project document error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 });
  }
}

/** Supprime un document du projet */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const { documentId } = await request.json();
    if (!documentId) return NextResponse.json({ error: 'documentId requis' }, { status: 400 });
    await rawQuery(`DELETE FROM project_documents WHERE id = $1 AND project_id = $2`, [documentId, id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete project document error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
