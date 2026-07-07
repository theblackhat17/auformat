import * as fsp from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

/**
 * Validation et enregistrement des fichiers uploadés — partagé entre l'admin
 * (images du site) et les formulaires publics (photos/plans joints aux demandes).
 * Validation stricte : type MIME, extension, taille, magic bytes.
 * Les images sont redimensionnées et recompressées à l'écriture (voir resizeImage).
 */

export const UPLOAD_DIR = '/opt/auformat-next/public/img/uploads';

/** Largeur max des images stockées : au-delà, aucun gain visible sur le web. */
const MAX_IMAGE_WIDTH = 2560;

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

/**
 * Redimensionne (max 2560 px de large, sans agrandir) et recompresse une image
 * dans son format d'origine. Corrige l'orientation EXIF. En cas d'échec (image
 * exotique), retourne le buffer d'origine — déjà validé — pour ne pas perdre l'upload.
 */
async function resizeImage(buffer: Buffer, ext: string): Promise<Buffer> {
  try {
    const pipeline = sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true });
    if (ext === 'png') return await pipeline.png({ compressionLevel: 9 }).toBuffer();
    if (ext === 'webp') return await pipeline.webp({ quality: 82 }).toBuffer();
    return await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch (err) {
    console.error('[upload] redimensionnement impossible, conservation de l\'original:', err);
    return buffer;
  }
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

  // Les images sont redimensionnées/recompressées ; les PDF sont écrits tels quels.
  const outBuffer = ext === 'pdf' ? buffer : await resizeImage(buffer, ext);

  await fsp.mkdir(UPLOAD_DIR, { recursive: true });

  const uniqueName = `${opts.prefix ? `${opts.prefix}-` : ''}${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  await fsp.writeFile(path.join(UPLOAD_DIR, uniqueName), outBuffer);

  return {
    path: `/api/uploads/${uniqueName}`,
    filename: uniqueName,
    originalName: file.name,
    sizeBytes: outBuffer.length,
    mimeType: file.type,
  };
}

/**
 * Extrait les noms de fichiers d'uploads référencés dans un texte libre
 * (ex. `quotes.description`, qui contient des liens `…/api/uploads/xxx` ou
 * `…/img/uploads/xxx`). Sert au nettoyage des fichiers à la suppression.
 */
export function extractUploadFilenames(text: string | null | undefined): string[] {
  if (!text) return [];
  const out = new Set<string>();
  const re = /\/(?:api|img)\/uploads\/([A-Za-z0-9._-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    // Rejette les segments de traversée (« .. », « . ») : on ne renvoie que de vrais noms.
    if (name && name !== '.' && name !== '..') out.add(name);
  }
  return [...out];
}

/**
 * Supprime physiquement un fichier uploadé, désigné par son URL stockée
 * (`/api/uploads/xxx`, `/img/uploads/xxx`) ou son simple nom. Toujours réduit au
 * basename (pas de traversée de répertoire) et silencieux si le fichier n'existe pas.
 */
export async function deleteUploadedFile(ref: string): Promise<void> {
  if (!ref) return;
  const base = path.basename(ref.split('?')[0].split('#')[0]);
  if (!base || base === '.' || base === '..') return;
  try {
    await fsp.unlink(path.join(UPLOAD_DIR, base));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[upload] suppression de fichier impossible:', base, err);
    }
  }
}

/** Supprime une liste de fichiers uploadés (best-effort, en parallèle). */
export async function deleteUploadedFiles(refs: Array<string | null | undefined>): Promise<void> {
  await Promise.all(refs.filter((r): r is string => !!r).map((r) => deleteUploadedFile(r)));
}
