import { describe, it, expect } from 'vitest';
import { extractUploadFilenames } from './upload';

describe('extractUploadFilenames', () => {
  it('extrait les noms depuis des liens /api/uploads et /img/uploads', () => {
    const text = [
      'Produit : Meuble TV',
      'Fichiers joints par le client :',
      '- plan.pdf : https://auformat.com/api/uploads/devis-1780000000000-abcdef0123456789.pdf',
      '- photo.jpg : https://auformat.com/img/uploads/devis-1780000000001-0011223344556677.jpeg',
    ].join('\n');
    expect(extractUploadFilenames(text).sort()).toEqual(
      [
        'devis-1780000000000-abcdef0123456789.pdf',
        'devis-1780000000001-0011223344556677.jpeg',
      ].sort()
    );
  });

  it('déduplique les occurrences multiples', () => {
    const text = '/api/uploads/x-1.jpg et encore /api/uploads/x-1.jpg';
    expect(extractUploadFilenames(text)).toEqual(['x-1.jpg']);
  });

  it('ignore les chemins hors uploads et les valeurs vides', () => {
    expect(extractUploadFilenames('/api/other/y.jpg /static/z.png')).toEqual([]);
    expect(extractUploadFilenames(null)).toEqual([]);
    expect(extractUploadFilenames('')).toEqual([]);
  });

  it('ne remonte jamais de segment de traversée de répertoire', () => {
    // Les slashs cassent la capture : aucun ".." ne peut être renvoyé comme nom.
    const refs = extractUploadFilenames('/api/uploads/../../etc/passwd');
    expect(refs.every((r) => !r.includes('/') && r !== '..')).toBe(true);
  });
});
