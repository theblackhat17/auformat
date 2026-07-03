import type { DebitPanel } from '@/lib/debit';

/**
 * Calepinage 2D (optimisation de découpe) façon MaxCut.
 *
 * On imbrique les pièces du débit dans des panneaux fournisseur complets
 * (par défaut 2800 × 2070 mm — format d'achat Au Format) en minimisant le
 * nombre de panneaux. Algorithme : MaxRects (Best Short Side Fit) avec prise
 * en compte du trait de scie (kerf) et rotation optionnelle des pièces.
 *
 * Module PUR (aucun accès DB/React) : importable côté serveur comme client.
 */

// Format des panneaux achetés chez le fournisseur (mm)
export const SHEET_W = 2800;
export const SHEET_H = 2070;
// Trait de scie par défaut (mm) — espace consommé entre deux découpes
export const DEFAULT_KERF = 3;

export interface NestOptions {
  sheetW?: number;
  sheetH?: number;
  kerf?: number;
  /** Autoriser la rotation 90° des pièces (meilleur rendement, mais ignore le sens du fil) */
  allowRotation?: boolean;
}

export interface PlacedPiece {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
}

export interface NestedSheet {
  /** Numéro du panneau au sein de son matériau (1..n) */
  index: number;
  material: string;
  pieces: PlacedPiece[];
  /** Surface utile posée (mm²) */
  usedArea: number;
  /** Chute du panneau en % */
  wastePct: number;
}

export interface UnplacedPiece {
  label: string;
  w: number;
  h: number;
  material: string;
}

export interface NestingResult {
  sheetW: number;
  sheetH: number;
  kerf: number;
  allowRotation: boolean;
  sheets: NestedSheet[];
  byMaterial: { material: string; sheets: number }[];
  totalSheets: number;
  /** Chute moyenne pondérée sur l'ensemble des panneaux (%) */
  globalWastePct: number;
  /** Pièces trop grandes pour un panneau (à débiter autrement) */
  unplaced: UnplacedPiece[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PieceInput {
  label: string;
  w: number;
  h: number;
  material: string;
}

interface WorkingSheet {
  free: Rect[];
  placed: PlacedPiece[];
}

interface Placement {
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  score1: number;
  score2: number;
}

const INF = Number.POSITIVE_INFINITY;

/** Cherche la meilleure position (Best Short Side Fit) d'une pièce w×h dans une liste de rectangles libres. */
function findPosition(free: Rect[], w: number, h: number, allowRotation: boolean): Placement | null {
  let best: Placement | null = null;
  const consider = (rw: number, rh: number, rotated: boolean) => {
    for (const fr of free) {
      if (rw <= fr.w && rh <= fr.h) {
        const leftoverH = fr.w - rw;
        const leftoverV = fr.h - rh;
        const s1 = Math.min(leftoverH, leftoverV);
        const s2 = Math.max(leftoverH, leftoverV);
        if (!best || s1 < best.score1 || (s1 === best.score1 && s2 < best.score2)) {
          best = { x: fr.x, y: fr.y, w: rw, h: rh, rotated, score1: s1, score2: s2 };
        }
      }
    }
  };
  consider(w, h, false);
  if (allowRotation && w !== h) consider(h, w, true);
  return best;
}

/** Découpe les rectangles libres qui recouvrent la zone consommée `used` (MaxRects). */
function splitFree(free: Rect[], used: Rect): Rect[] {
  const result: Rect[] = [];
  for (const fr of free) {
    const noOverlap =
      used.x >= fr.x + fr.w ||
      used.x + used.w <= fr.x ||
      used.y >= fr.y + fr.h ||
      used.y + used.h <= fr.y;
    if (noOverlap) {
      result.push(fr);
      continue;
    }
    // Bandes horizontales (haut / bas)
    if (used.x < fr.x + fr.w && used.x + used.w > fr.x) {
      if (used.y > fr.y && used.y < fr.y + fr.h) {
        result.push({ x: fr.x, y: fr.y, w: fr.w, h: used.y - fr.y });
      }
      if (used.y + used.h < fr.y + fr.h) {
        result.push({ x: fr.x, y: used.y + used.h, w: fr.w, h: fr.y + fr.h - (used.y + used.h) });
      }
    }
    // Bandes verticales (gauche / droite)
    if (used.y < fr.y + fr.h && used.y + used.h > fr.y) {
      if (used.x > fr.x && used.x < fr.x + fr.w) {
        result.push({ x: fr.x, y: fr.y, w: used.x - fr.x, h: fr.h });
      }
      if (used.x + used.w < fr.x + fr.w) {
        result.push({ x: used.x + used.w, y: fr.y, w: fr.x + fr.w - (used.x + used.w), h: fr.h });
      }
    }
  }
  return prune(result);
}

/** Supprime les rectangles libres contenus dans un autre (dégénérescences MaxRects). */
function prune(rects: Rect[]): Rect[] {
  const kept = rects.filter((r) => r.w > 0 && r.h > 0);
  const out: Rect[] = [];
  for (let i = 0; i < kept.length; i++) {
    let contained = false;
    for (let j = 0; j < kept.length; j++) {
      if (i === j) continue;
      if (isContained(kept[i], kept[j])) {
        // en cas d'égalité parfaite, ne garder qu'une seule occurrence
        if (!(sameRect(kept[i], kept[j]) && i > j)) {
          contained = true;
          break;
        }
      }
    }
    if (!contained) out.push(kept[i]);
  }
  return out;
}

function isContained(a: Rect, b: Rect): boolean {
  return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
}
function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/**
 * Calepine une liste de pièces (déjà éclatées par quantité) dans des panneaux.
 * Retourne les panneaux remplis + les pièces impossibles à poser.
 */
export function nestPieces(pieces: PieceInput[], opts: NestOptions = {}): NestingResult {
  const sheetW = opts.sheetW ?? SHEET_W;
  const sheetH = opts.sheetH ?? SHEET_H;
  const kerf = opts.kerf ?? DEFAULT_KERF;
  const allowRotation = opts.allowRotation ?? true;
  const sheetArea = sheetW * sheetH;

  // Groupement par matériau : un panneau ne mélange jamais deux matériaux.
  const byMat = new Map<string, PieceInput[]>();
  for (const p of pieces) {
    const list = byMat.get(p.material) || [];
    list.push(p);
    byMat.set(p.material, list);
  }

  const sheets: NestedSheet[] = [];
  const byMaterial: { material: string; sheets: number }[] = [];
  const unplaced: UnplacedPiece[] = [];

  for (const [material, matPieces] of byMat) {
    // Tri décroissant par plus grand côté puis par surface : meilleures poses d'abord.
    const sorted = [...matPieces].sort((a, b) => {
      const ma = Math.max(a.w, a.h);
      const mb = Math.max(b.w, b.h);
      if (mb !== ma) return mb - ma;
      return b.w * b.h - a.w * a.h;
    });

    const working: WorkingSheet[] = [];

    for (const piece of sorted) {
      // La pièce doit tenir dans un panneau vide (dans un sens ou l'autre)
      const fitsRaw = piece.w <= sheetW && piece.h <= sheetH;
      const fitsRot = allowRotation && piece.h <= sheetW && piece.w <= sheetH;
      if (!fitsRaw && !fitsRot) {
        unplaced.push({ label: piece.label, w: piece.w, h: piece.h, material });
        continue;
      }

      // Meilleure pose parmi tous les panneaux ouverts (score global BSSF)
      let bestSheet = -1;
      let bestPos: Placement | null = null;
      for (let si = 0; si < working.length; si++) {
        const pos = findPosition(working[si].free, piece.w, piece.h, allowRotation);
        if (pos && (!bestPos || pos.score1 < bestPos.score1 || (pos.score1 === bestPos.score1 && pos.score2 < bestPos.score2))) {
          bestPos = pos;
          bestSheet = si;
        }
      }

      // Sinon, ouvrir un nouveau panneau
      if (!bestPos) {
        const fresh: WorkingSheet = { free: [{ x: 0, y: 0, w: sheetW, h: sheetH }], placed: [] };
        working.push(fresh);
        bestSheet = working.length - 1;
        bestPos = findPosition(fresh.free, piece.w, piece.h, allowRotation);
        if (!bestPos) {
          // ne devrait pas arriver (déjà vérifié fits), sécurité
          unplaced.push({ label: piece.label, w: piece.w, h: piece.h, material });
          working.pop();
          continue;
        }
      }

      const sheet = working[bestSheet];
      sheet.placed.push({ label: piece.label, x: bestPos.x, y: bestPos.y, w: bestPos.w, h: bestPos.h, rotated: bestPos.rotated });
      // Zone consommée = pièce + trait de scie à droite et en bas (clampée au panneau)
      const usedW = Math.min(bestPos.w + kerf, sheetW - bestPos.x);
      const usedH = Math.min(bestPos.h + kerf, sheetH - bestPos.y);
      sheet.free = splitFree(sheet.free, { x: bestPos.x, y: bestPos.y, w: usedW, h: usedH });
    }

    working.forEach((ws, i) => {
      const usedArea = ws.placed.reduce((s, p) => s + p.w * p.h, 0);
      sheets.push({
        index: i + 1,
        material,
        pieces: ws.placed,
        usedArea,
        wastePct: Math.round((1 - usedArea / sheetArea) * 1000) / 10,
      });
    });
    byMaterial.push({ material, sheets: working.length });
  }

  const totalUsed = sheets.reduce((s, sh) => s + sh.usedArea, 0);
  const totalSheetArea = sheets.length * sheetArea;
  const globalWastePct = totalSheetArea > 0 ? Math.round((1 - totalUsed / totalSheetArea) * 1000) / 10 : 0;

  return {
    sheetW,
    sheetH,
    kerf,
    allowRotation,
    sheets,
    byMaterial,
    totalSheets: sheets.length,
    globalWastePct,
    unplaced,
  };
}

/** Éclate un débit (DebitPanel[] avec quantités) en pièces unitaires puis calepine. */
export function nestDebitPanels(panels: DebitPanel[], opts: NestOptions = {}): NestingResult {
  const pieces: PieceInput[] = [];
  for (const panel of panels) {
    for (let i = 0; i < panel.quantite; i++) {
      pieces.push({
        label: panel.piece,
        w: panel.largeur,
        h: panel.hauteur,
        material: panel.materiau,
      });
    }
  }
  return nestPieces(pieces, opts);
}
