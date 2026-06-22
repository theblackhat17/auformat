import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware-auth';
import { saveUploadedFile } from '@/lib/upload';

/** Pièces jointes de la messagerie (photos, plans PDF) — réservé aux comptes connectés */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }
    const saved = await saveUploadedFile(file, { allowPdf: true, prefix: 'chat' });
    return NextResponse.json({ path: saved.path, name: saved.originalName });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur lors de l\'upload' }, { status: 400 });
  }
}
