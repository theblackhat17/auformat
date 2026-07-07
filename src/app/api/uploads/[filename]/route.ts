import { NextRequest, NextResponse } from 'next/server';
import * as fsp from 'fs/promises';
import * as path from 'path';

const UPLOAD_DIR = '/opt/auformat-next/public/img/uploads';

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Empêche la traversée de répertoire
  const safeName = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safeName);

  const ext = safeName.split('.').pop()?.toLowerCase() || '';
  const contentType = MIME_TYPES[ext];

  // On ne sert que les types connus (images + PDF)
  if (!contentType) {
    return new NextResponse(null, { status: 403 });
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fsp.readFile(filePath);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${safeName}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
