import { NextRequest, NextResponse } from 'next/server';
import { queryOne, rawQuery, toCamelCase } from '@/lib/db';
import { requireAdmin } from '@/lib/middleware-auth';
import { logAdminAction } from '@/lib/activity-logger';
import { saveUploadedFile, deleteUploadedFile } from '@/lib/upload';
import type { ProjectDocument } from '@/lib/types';

/** Documents d'un DOSSIER (visibilité client/admin). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const folder = await queryOne<{ id: string; name: string }>('SELECT id, name FROM project_folders WHERE id = $1', [id]);
    if (!folder) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    const visibility = formData.get('visibility') === 'client' ? 'client' : 'admin';
    const saved = await saveUploadedFile(file, { allowPdf: true, prefix: 'folder' });

    const inserted = await rawQuery(
      `INSERT INTO project_documents (folder_id, name, url, visibility, uploaded_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, saved.originalName, saved.path, visibility, auth.userId]
    );
    logAdminAction(request, auth, 'upload_folder_document', 'folder', id, `Document « ${saved.originalName} » ajouté (${visibility}) sur « ${folder.name} »`);
    return NextResponse.json({ document: toCamelCase<ProjectDocument>(inserted.rows[0]) }, { status: 201 });
  } catch (err) {
    console.error('Folder document POST error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const { documentId } = await request.json();
    if (!documentId) return NextResponse.json({ error: 'documentId requis' }, { status: 400 });
    const doc = await queryOne<{ url: string }>('SELECT url FROM project_documents WHERE id = $1 AND folder_id = $2', [documentId, id]);
    await rawQuery('DELETE FROM project_documents WHERE id = $1 AND folder_id = $2', [documentId, id]);
    if (doc?.url) await deleteUploadedFile(doc.url);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Folder document DELETE error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
