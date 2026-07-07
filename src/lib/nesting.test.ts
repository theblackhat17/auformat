import { describe, it, expect } from 'vitest';
import { nestPieces, SHEET_W, SHEET_H } from './nesting';

describe('nestPieces', () => {
  it('place une pièce qui tient dans un panneau', () => {
    const res = nestPieces([{ label: 'A', w: 800, h: 600, material: 'Chêne' }]);
    expect(res.unplaced).toHaveLength(0);
    expect(res.totalSheets).toBe(1);
    expect(res.sheets[0].pieces).toHaveLength(1);
  });

  it('place toutes les pièces qui tiennent (aucune perdue, conservation du compte)', () => {
    const piece = { w: SHEET_W / 2 - 20, h: SHEET_H / 2 - 20, material: 'Chêne' };
    const pieces = ['A', 'B', 'C', 'D'].map((label) => ({ label, ...piece }));
    const res = nestPieces(pieces);
    expect(res.unplaced).toHaveLength(0);
    const placed = res.sheets.reduce((n, s) => n + s.pieces.length, 0);
    // Invariant : chaque pièce est soit placée, soit signalée — jamais oubliée.
    expect(placed + res.unplaced.length).toBe(pieces.length);
    expect(placed).toBe(pieces.length);
  });

  it('signale une pièce trop grande pour un panneau au lieu de la placer', () => {
    const res = nestPieces([{ label: 'Trop grand', w: SHEET_W + 100, h: 500, material: 'MDF' }]);
    expect(res.unplaced).toHaveLength(1);
    expect(res.totalSheets).toBe(0);
  });

  it('sépare les panneaux par matériau', () => {
    const res = nestPieces([
      { label: 'A', w: 600, h: 400, material: 'Chêne' },
      { label: 'B', w: 600, h: 400, material: 'Noyer' },
    ]);
    const materials = res.byMaterial.map((m) => m.material).sort();
    expect(materials).toEqual(['Chêne', 'Noyer']);
    expect(res.totalSheets).toBe(2);
  });

  it('reste dans les bornes 0–100 % pour la chute globale', () => {
    const res = nestPieces([{ label: 'A', w: 1000, h: 800, material: 'MDF' }]);
    expect(res.globalWastePct).toBeGreaterThanOrEqual(0);
    expect(res.globalWastePct).toBeLessThanOrEqual(100);
  });
});
