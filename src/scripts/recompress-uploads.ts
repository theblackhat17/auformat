import * as fsp from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';

/**
 * Recompression one-shot des images déjà uploadées (public/img/uploads).
 *
 * Les nouveaux uploads sont redimensionnés à l'écriture (src/lib/upload.ts) ;
 * ce script traite le stock historique : redimensionne à 2560 px max de large,
 * recompresse (mozjpeg/webp/png), corrige l'orientation EXIF. Les noms de
 * fichiers sont conservés (aucune référence en base à changer). Les originaux
 * modifiés sont sauvegardés dans /var/backups/auformat-uploads-orig avant
 * remplacement. Les PDF et les fichiers déjà légers sont ignorés. Idempotent.
 */

const UPLOAD_DIR = '/opt/auformat-next/public/img/uploads';
const BACKUP_DIR = '/var/backups/auformat-uploads-orig';
const MAX_WIDTH = 2560;
/** En-dessous de ce poids, on ne touche pas (gain marginal, risque de dégrader) */
const MIN_SIZE_BYTES = 400 * 1024;

async function processFile(name: string): Promise<{ saved: number } | null> {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return null;

  const filePath = path.join(UPLOAD_DIR, name);
  const stat = await fsp.stat(filePath);
  if (stat.size < MIN_SIZE_BYTES) return null;

  const input = await fsp.readFile(filePath);
  let out: Buffer;
  try {
    const pipeline = sharp(input, { failOn: 'none' })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true });
    if (ext === 'png') out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    else if (ext === 'webp') out = await pipeline.webp({ quality: 82 }).toBuffer();
    else out = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch (err) {
    console.error(`  ✗ ${name} : ${err instanceof Error ? err.message : err}`);
    return null;
  }

  // On ne remplace que si le gain est réel (≥ 10 %)
  if (out.length >= stat.size * 0.9) return null;

  await fsp.copyFile(filePath, path.join(BACKUP_DIR, name));
  const tmp = `${filePath}.tmp-recompress`;
  await fsp.writeFile(tmp, out);
  await fsp.rename(tmp, filePath);
  return { saved: stat.size - out.length };
}

async function main() {
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  const names = (await fsp.readdir(UPLOAD_DIR)).sort();
  let done = 0;
  let totalSaved = 0;
  for (const name of names) {
    const res = await processFile(name).catch((err) => {
      console.error(`  ✗ ${name} :`, err);
      return null;
    });
    if (res) {
      done++;
      totalSaved += res.saved;
      console.log(`  ✓ ${name} (-${Math.round(res.saved / 1024)} Ko)`);
    }
  }
  console.log(`\n${done} image(s) recompressée(s) — ${Math.round(totalSaved / 1024 / 1024)} Mo économisés.`);
  console.log(`Originaux sauvegardés dans ${BACKUP_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
