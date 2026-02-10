import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware-auth';
import { insert } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const UPLOAD_DIR = '/opt/auformat-next/public/img/uploads';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux. Maximum : 10 MB' }, { status: 400 });
    }

    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);
    const publicPath = `/api/uploads/${uniqueName}`;

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Record in database
    const upload = await insert('uploads', {
      filename: uniqueName,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      path: publicPath,
      uploadedBy: auth.userId,
    });

    return NextResponse.json({ path: publicPath, upload });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
  }
}
