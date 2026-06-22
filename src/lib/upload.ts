import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Validation et enregistrement des fichiers uploadés — partagé entre l'admin
 * (images du site) et les formulaires publics (photos/plans joints aux demandes).
 * Validation stricte : type MIME, extension, taille, magic bytes.
 */

export const UPLOAD_DIR = '/opt/auformat-next/public/img/uploads';

const MAGIC_BYTES: Record<string, number[][]> = {
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  png: [[0x89, 0x50, 0x4e, 0x47]],
  webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

const MIME_BY_EXT: Record<string, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  pdf: ['application/pdf'],
};

function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  const signatures = MAGIC_BYTES[ext];
  if (!signatures) return false;
  return signatures.some((sig) => sig.every((byte, i) => buffer.length > i && buffer[i] === byte));
}

export type SavedUpload = { path: string; filename: string; originalName: string; sizeBytes: number; mimeType: string };

/**
 * Valide et enregistre un fichier. Lève une Error avec un message utilisateur en cas de refus.
 * @param opts.allowPdf autorise les PDF (plans) en plus des images
 * @param opts.prefix préfixe du nom de fichier (ex. 'pub' pour distinguer les envois publics)
 */
export async function saveUploadedFile(
  file: File,
  opts: { allowPdf?: boolean; maxSize?: number; prefix?: string } = {}
): Promise<SavedUpload> {
  const maxSize = opts.maxSize ?? 10 * 1024 * 1024;
  const allowedExts = opts.allowPdf ? ['jpg', 'jpeg', 'png', 'webp', 'pdf'] : ['jpg', 'jpeg', 'png', 'webp'];

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!allowedExts.includes(ext)) {
    throw new Error(`Format non autorisé. Formats acceptés : ${opts.allowPdf ? 'JPEG, PNG, WebP, PDF' : 'JPEG, PNG, WebP'}`);
  }
  if (!MIME_BY_EXT[ext]?.includes(file.type)) {
    throw new Error('Le type du fichier ne correspond pas à son extension');
  }
  if (file.size > maxSize) {
    throw new Error(`Fichier trop volumineux. Maximum : ${Math.round(maxSize / 1024 / 1024)} Mo`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(buffer, ext)) {
    throw new Error('Le contenu du fichier ne correspond pas à un fichier valide');
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const uniqueName = `${opts.prefix ? `${opts.prefix}-` : ''}${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, uniqueName), buffer);

  return {
    path: `/api/uploads/${uniqueName}`,
    filename: uniqueName,
    originalName: file.name,
    sizeBytes: file.size,
    mimeType: file.type,
  };
}
