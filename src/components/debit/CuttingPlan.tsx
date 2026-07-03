'use client';

import { useMemo } from 'react';
import type { DebitPanel } from '@/lib/debit';
import { nestDebitPanels, type NestedSheet, type PlacedPiece } from '@/lib/nesting';

/**
 * Plan de découpe 2D (calepinage) façon MaxCut : imbrique les pièces du débit
 * dans des panneaux fournisseur complets (2800 × 2070 mm par défaut) et dessine
 * chaque panneau à l'échelle avec les cotations des pièces. Imprimable.
 */

// Palette bois chaud cohérente avec le débit, lisible sur papier
const PIECE_FILL = '#E9A45C';
const PIECE_STROKE = '#B4762F';
const SHEET_FILL = '#FBF6EF';
const SHEET_STROKE = '#3F5540';

function fmt(n: number): string {
  return Math.round(n).toString();
}

/** Un panneau dessiné à l'échelle (viewBox en mm) */
function SheetSvg({ sheet, sheetW, sheetH }: { sheet: NestedSheet; sheetW: number; sheetH: number }) {
  const pad = 90; // marge autour du panneau pour les cotes de bord (en unités mm)
  const vbW = sheetW + pad * 2;
  const vbH = sheetH + pad * 2;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full h-auto"
      style={{ maxWidth: 680, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      role="img"
      aria-label={`Panneau ${sheet.index} — ${sheet.material}`}
    >
      {/* Fond panneau */}
      <rect x={pad} y={pad} width={sheetW} height={sheetH} fill={SHEET_FILL} stroke={SHEET_STROKE} strokeWidth={4} />

      {/* Cote largeur (haut) et hauteur (gauche) du panneau */}
      <text x={pad + sheetW / 2} y={pad - 28} textAnchor="middle" fontSize={54} fill={SHEET_STROKE} fontWeight={700}>
        {fmt(sheetW)} mm
      </text>
      <text
        x={pad - 30}
        y={pad + sheetH / 2}
        textAnchor="middle"
        fontSize={54}
        fill={SHEET_STROKE}
        fontWeight={700}
        transform={`rotate(-90 ${pad - 30} ${pad + sheetH / 2})`}
      >
        {fmt(sheetH)} mm
      </text>

      {/* Pièces */}
      {sheet.pieces.map((p, i) => (
        <PieceRect key={i} p={p} ox={pad} oy={pad} />
      ))}
    </svg>
  );
}

function PieceRect({ p, ox, oy }: { p: PlacedPiece; ox: number; oy: number }) {
  const x = ox + p.x;
  const y = oy + p.y;
  const cx = x + p.w / 2;
  const cy = y + p.h / 2;
  const big = p.w >= 260 && p.h >= 200;
  const medium = p.w >= 160 && p.h >= 120;
  const nameSize = Math.max(30, Math.min(46, p.w / 12));
  const dimSize = Math.max(26, Math.min(40, p.w / 14));

  return (
    <g>
      <rect x={x} y={y} width={p.w} height={p.h} fill={PIECE_FILL} stroke={PIECE_STROKE} strokeWidth={3} />
      {/* Cote largeur sur le bord haut de la pièce */}
      {medium && (
        <text x={cx} y={y + dimSize + 6} textAnchor="middle" fontSize={dimSize} fill={PIECE_STROKE} fontWeight={600}>
          {fmt(p.w)}
        </text>
      )}
      {/* Cote hauteur sur le bord gauche de la pièce */}
      {medium && (
        <text
          x={x + dimSize + 4}
          y={cy}
          textAnchor="middle"
          fontSize={dimSize}
          fill={PIECE_STROKE}
          fontWeight={600}
          transform={`rotate(-90 ${x + dimSize + 4} ${cy})`}
        >
          {fmt(p.h)}
        </text>
      )}
      {/* Nom de la pièce au centre */}
      {big && (
        <text x={cx} y={cy + nameSize / 3} textAnchor="middle" fontSize={nameSize} fill="#4A3312" fontWeight={700}>
          {p.label}
        </text>
      )}
      {/* Indicateur de rotation (sens du fil tourné 90°) */}
      {p.rotated && (
        <text x={x + p.w - 14} y={y + 44} textAnchor="end" fontSize={40} fill={PIECE_STROKE} fontWeight={700}>
          ↻
        </text>
      )}
    </g>
  );
}

export function CuttingPlan({ panels }: { panels: DebitPanel[] }) {
  const nesting = useMemo(() => nestDebitPanels(panels), [panels]);

  if (nesting.sheets.length === 0 && nesting.unplaced.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-noir/40">Plan de découpe 2D</p>
        <p className="text-xs text-noir/50">
          Panneaux {fmt(nesting.sheetW)} × {fmt(nesting.sheetH)} mm · trait de scie {nesting.kerf} mm
          {nesting.allowRotation && ' · rotation autorisée'}
        </p>
      </div>
      <p className="text-sm text-noir/70 mb-4">
        <span className="font-semibold text-noir">{nesting.totalSheets}</span> panneau{nesting.totalSheets > 1 ? 'x' : ''} complet{nesting.totalSheets > 1 ? 's' : ''} à débiter
        {' · '}chute moyenne <span className="font-medium text-noir">{nesting.globalWastePct}%</span>
        {nesting.byMaterial.length > 1 && (
          <span className="text-noir/45"> ({nesting.byMaterial.map((m) => `${m.sheets}× ${m.material}`).join(' · ')})</span>
        )}
      </p>

      {nesting.unplaced.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span className="font-semibold">Pièces hors format panneau :</span>{' '}
          {nesting.unplaced.map((u, i) => (
            <span key={i}>
              {u.label} {fmt(u.w)}×{fmt(u.h)} ({u.material}){i < nesting.unplaced.length - 1 ? ', ' : ''}
            </span>
          ))}
          {' — à débiter autrement.'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {nesting.sheets.map((sheet, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3 break-inside-avoid">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-semibold text-noir">
                Panneau {sheet.index} <span className="font-normal text-noir/50">— {sheet.material}</span>
              </p>
              <p className="text-xs text-noir/50">
                {sheet.pieces.length} pièce{sheet.pieces.length > 1 ? 's' : ''} · chute {sheet.wastePct}%
              </p>
            </div>
            <SheetSvg sheet={sheet} sheetW={nesting.sheetW} sheetH={nesting.sheetH} />
          </div>
        ))}
      </div>
    </div>
  );
}
