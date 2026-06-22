'use client';

import { useRef } from 'react';
import type { CompositionConfig, CompositionModule, ConfigurateurMaterial, ConfigurateurModuleType, ConfigurateurUnivers } from '@/lib/types';
import { getModuleType, moduleMaterial } from './pricingCompo';
import { useUnit, fmtLen } from './units';

/* Géométrie en millimètres réels, convertie en SVG (y inversé). */
const GAP = 20;
const PLINTH = 100;
export const HAUT_BOTTOM_DEFAULT = 1400;
const SUSPENDU_BOTTOM = 250;
const PLAN_THICKNESS = 40;
const PLAN_OVERHANG = 20;
const MARGIN_X = 120;
const MARGIN_TOP = 160;
const MARGIN_BOTTOM = 160;
/** Écart entre le sol de la rangée principale et le haut de la rangée îlot */
const ILOT_GAP = 420;

function darken(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  if (n.length !== 6) return '#6b5a42';
  const f = (i: number) => Math.max(0, Math.round(parseInt(n.slice(i, i + 2), 16) * (1 - amount)));
  return `rgb(${f(0)}, ${f(2)}, ${f(4)})`;
}

export type RowKey = 'principal' | 'retour_gauche' | 'retour_droit' | 'ilot';

type Placed = {
  module: CompositionModule;
  type: ConfigurateurModuleType;
  x: number;       // bord gauche dans sa rangée, mm
  bottom: number;  // bas du caisson en coordonnées du dessin (négatif pour les rangées secondaires)
  free: boolean;   // module suspendu librement positionnable
  row: RowKey;
  /** Bas réel du caisson au-dessus du sol (mm) — utilisé par la 3D quelle que soit la rangée */
  floorBottom: number;
};

export type LayoutRow = { key: RowKey; label: string; top: number; width: number };

const ROW_LABELS: Record<string, string> = {
  retour_gauche: 'Retour gauche du L (vu de face)',
  retour_droit: 'Retour droit du L (vu de face)',
  ilot: 'Îlot central (vu de face, au centre de la pièce)',
};

export function layoutModules(config: CompositionConfig, moduleTypes: ConfigurateurModuleType[]): { placed: Placed[]; totalWidth: number; linearWidth: number; maxTop: number; ilotDepth: number; rows: LayoutRow[] } {
  const placed: Placed[] = [];
  const freeModules: { mod: CompositionModule; type: ConfigurateurModuleType }[] = [];
  const rowMods: Record<RowKey, { mod: CompositionModule; type: ConfigurateurModuleType }[]> = {
    principal: [], retour_gauche: [], retour_droit: [], ilot: [],
  };

  for (const mod of config.modules) {
    const type = getModuleType(moduleTypes, mod.typeSlug);
    if (!type) continue;
    if (type.zone === 'haut') {
      // Suspendu : position libre, ne consomme pas de linéaire (placé après les modules posés)
      freeModules.push({ mod, type });
      continue;
    }
    const row: RowKey = type.zone === 'ilot'
      ? 'ilot'
      : mod.mur === 'retour_gauche' || mod.mur === 'retour_droit' ? mod.mur : 'principal';
    rowMods[row].push({ mod, type });
  }

  // Les éléments d'environnement posés (porte de pièce…) partent du sol ; l'îlot repose sur sa plinthe
  const realBottom = (mod: CompositionModule, type: ConfigurateurModuleType) =>
    type.zone === 'ilot' ? PLINTH
      : type.zone === 'bas' ? (type.decor ? 0 : mod.options['suspendu'] > 0 ? SUSPENDU_BOTTOM : PLINTH) : 0;

  // Rangée principale : l'élévation du mur
  let cursor = 0;
  let lastLinearX = 0;
  let lastBasX: number | null = null;
  let maxTop = 1000;
  for (const { mod, type } of rowMods.principal) {
    cursor += mod.ecartGauche || 0; // décalage libre dans la rangée
    const bottom = realBottom(mod, type);
    placed.push({ module: mod, type, x: cursor, bottom, free: false, row: 'principal', floorBottom: bottom });
    lastLinearX = cursor;
    if (type.zone === 'bas') lastBasX = cursor;
    maxTop = Math.max(maxTop, bottom + mod.hauteur);
    cursor += mod.largeur + GAP;
  }
  const linearWidth = Math.max(cursor - GAP, 0);

  // Rangées secondaires sous l'élévation : retours du L puis îlot — de vraies élévations alignées au sol,
  // qui accueillent aussi les modules libres (plan de travail, meubles hauts) posés sur ces murs.
  const rows: LayoutRow[] = [];
  let below = 0;
  let rowsWidth = 0;
  for (const key of ['retour_gauche', 'retour_droit', 'ilot'] as RowKey[]) {
    const mods = rowMods[key];
    const freeInRow = key === 'ilot' ? [] : freeModules.filter((f) => f.mod.mur === key);
    if (mods.length === 0 && freeInRow.length === 0) continue;
    below += ILOT_GAP;
    const bandTop = -below;
    // Hauteur de la bande : le plus haut des modules posés et libres de cette rangée
    let bandH = 1000;
    for (const { mod, type } of mods) bandH = Math.max(bandH, realBottom(mod, type) + mod.hauteur);
    for (const { mod, type } of freeInRow) bandH = Math.max(bandH, (mod.posY ?? type.posYDefaut ?? HAUT_BOTTOM_DEFAULT) + mod.hauteur);
    const rowFloor = bandTop - bandH; // « sol » de cette élévation, en coordonnées du dessin
    let rcursor = 0;
    for (const { mod, type } of mods) {
      rcursor += mod.ecartGauche || 0;
      const fb = realBottom(mod, type);
      placed.push({ module: mod, type, x: rcursor, bottom: rowFloor + fb, free: false, row: key, floorBottom: fb });
      rcursor += mod.largeur + GAP;
    }
    let width = Math.max(rcursor - GAP, 0);
    for (const { mod, type } of freeInRow) {
      const x = mod.posX ?? 0;
      const py = mod.posY ?? type.posYDefaut ?? HAUT_BOTTOM_DEFAULT;
      placed.push({ module: mod, type, x, bottom: rowFloor + py, free: true, row: key, floorBottom: py });
      width = Math.max(width, x + mod.largeur);
    }
    rows.push({ key, label: ROW_LABELS[key], top: bandTop, width });
    rowsWidth = Math.max(rowsWidth, width);
    below += bandH + 40;
  }

  for (const { mod, type } of freeModules) {
    if (mod.mur === 'retour_gauche' || mod.mur === 'retour_droit') continue; // déjà placés dans leur rangée
    // Par défaut : au-dessus du dernier module bas (vasque, caisson…), sinon du dernier module posé
    const x = mod.posX ?? lastBasX ?? lastLinearX;
    const bottom = mod.posY ?? type.posYDefaut ?? HAUT_BOTTOM_DEFAULT;
    placed.push({ module: mod, type, x, bottom, free: true, row: 'principal', floorBottom: bottom });
    maxTop = Math.max(maxTop, bottom + mod.hauteur);
  }

  const freeRight = placed.filter((p) => p.free).reduce((m, p) => Math.max(m, p.x + p.module.largeur), 0);
  return { placed, totalWidth: Math.max(linearWidth, freeRight, rowsWidth), linearWidth, maxTop, ilotDepth: below, rows };
}

/** Positions des étagères (mm depuis le bas du module) : personnalisées ou réparties automatiquement */
export function shelfPositions(mod: CompositionModule, hauteur: number): number[] {
  const n = mod.options['etagere'] ?? 0;
  const ys: number[] = [];
  for (let i = 1; i <= n; i++) {
    const auto = (hauteur / (n + 1)) * i;
    const custom = mod.etageresPos?.[i - 1];
    ys.push(custom != null ? Math.min(hauteur - 80, Math.max(80, custom)) : auto);
  }
  return ys;
}

type CompoCanvasProps = {
  config: CompositionConfig;
  moduleTypes: ConfigurateurModuleType[];
  materials: ConfigurateurMaterial[];
  univers?: ConfigurateurUnivers;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveFree?: (id: string, posX: number, posY: number) => void;
  /** Décalage horizontal des modules posés (drag) */
  onEcart?: (id: string, value: number) => void;
  /** Interversion de deux modules de la même rangée (drag au-delà du voisin) */
  onSwap?: (idA: string, idB: string) => void;
  /** Affiche la chaîne de cotes (largeur de chaque module + hauteur totale) */
  showDims?: boolean;
};

export function CompoCanvas({ config, moduleTypes, materials, univers, selectedId, onSelect, onMoveFree, onEcart, onSwap, showDims }: CompoCanvasProps) {
  const { unit } = useUnit();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; kind: 'free' | 'linear'; startX: number; startY: number; origX: number; origY: number; origEcart: number; moved: boolean } | null>(null);

  const { placed, totalWidth, linearWidth, maxTop, ilotDepth, rows } = layoutModules(config, moduleTypes);

  // L'îlot ne consomme pas le linéaire du mur
  const wallWidth = Math.max(linearWidth, placed.filter((p) => p.free).reduce((m, p) => Math.max(m, p.x + p.module.largeur), 0));
  const overMax = config.lineaireMax ? wallWidth > config.lineaireMax : false;
  const sceneRight = Math.max(totalWidth, config.lineaireMax || 0);
  const sceneW = sceneRight + MARGIN_X * 2;
  const bottomMargin = MARGIN_BOTTOM + ilotDepth + (showDims ? 130 : 0);
  const sceneH = maxTop + MARGIN_TOP + bottomMargin;
  const Y = (realY: number) => sceneH - bottomMargin - realY;

  /* Conversion pixels écran → mm de la scène (pour le drag) */
  const pxToMm = () => {
    const el = svgRef.current;
    if (!el) return 1;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 ? sceneW / rect.width : 1;
  };

  const handlePointerDown = (p: Placed) => (e: React.PointerEvent) => {
    const kind: 'free' | 'linear' = p.free ? 'free' : 'linear';
    if (kind === 'free' && !onMoveFree) return;
    if (kind === 'linear' && !onEcart) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      id: p.module.id, kind,
      startX: e.clientX, startY: e.clientY,
      // Pour les modules libres : hauteur réelle de pose (posY), pas la coordonnée du dessin
      origX: p.x, origY: kind === 'free' ? p.floorBottom : p.bottom,
      origEcart: p.module.ecartGauche || 0,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const scale = pxToMm();
    const dx = (e.clientX - drag.startX) * scale;
    const dy = (e.clientY - drag.startY) * scale;
    if (Math.abs(dx) + Math.abs(dy) > 8) drag.moved = true;
    const mod = config.modules.find((m) => m.id === drag.id);
    if (!mod) return;
    if (drag.kind === 'linear') {
      // Décalage horizontal dans la rangée (jamais négatif : les modules ne se chevauchent pas)
      onEcart?.(drag.id, Math.round((drag.origEcart + dx) / 10) * 10);
      // Interversion : quand le centre du module dépasse le centre d'un voisin de sa rangée
      if (onSwap) {
        const me = placed.find((q) => q.module.id === drag.id);
        if (me) {
          const myCenter = me.x + me.module.largeur / 2;
          const sameRow = placed.filter((q) => !q.free && q.row === me.row && q.module.id !== drag.id);
          const right = sameRow.filter((q) => q.x > me.x).sort((a, b) => a.x - b.x)[0];
          const left = sameRow.filter((q) => q.x < me.x).sort((a, b) => b.x - a.x)[0];
          const target =
            right && myCenter > right.x + right.module.largeur / 2 ? right :
            left && myCenter < left.x + left.module.largeur / 2 ? left : null;
          if (target) {
            onSwap(drag.id, target.module.id);
            onEcart?.(drag.id, 0);
            drag.startX = e.clientX;
            drag.startY = e.clientY;
            drag.origEcart = 0;
          }
        }
      }
      return;
    }
    const newX = Math.round(Math.max(-PLAN_OVERHANG, Math.min(sceneRight - mod.largeur + PLAN_OVERHANG, drag.origX + dx)) / 10) * 10;
    const newY = Math.round(Math.max(100, Math.min(maxTop + 200 - mod.hauteur, drag.origY - dy)) / 10) * 10;
    onMoveFree?.(drag.id, newX, newY);
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  // Plans de travail : une bande par suite contiguë de modules « bas » posés, rangée par rangée
  const planEligible = (p: Placed) =>
    p.type.zone === 'bas' && !p.type.decor && !(p.module.options['suspendu'] > 0) && !((p.module.options['sans_plan'] ?? 0) > 0);
  const planRuns: { x: number; width: number; top: number }[] = [];
  if (config.planTravail && univers?.planTravail?.disponible) {
    for (const rowKey of ['principal', 'retour_gauche', 'retour_droit'] as RowKey[]) {
      let run: Placed[] = [];
      const flush = () => {
        if (run.length === 0) return;
        const x0 = run[0].x;
        const x1 = run[run.length - 1].x + run[run.length - 1].module.largeur;
        planRuns.push({ x: x0, width: x1 - x0, top: Math.max(...run.map((p) => p.bottom + p.module.hauteur)) });
        run = [];
      };
      for (const p of placed) {
        if (p.free || p.row !== rowKey || p.type.zone === 'ilot') continue;
        if (planEligible(p)) run.push(p);
        else flush();
      }
      flush();
    }
    // Bande de plan sur chaque module îlot (sauf « sans plan »)
    for (const p of placed.filter((pl) => pl.type.zone === 'ilot' && !((pl.module.options['sans_plan'] ?? 0) > 0))) {
      planRuns.push({ x: p.x, width: p.module.largeur, top: p.bottom + p.module.hauteur });
    }
  }

  if (placed.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 text-noir/55 text-sm">
        Ajoutez un premier module pour commencer votre composition.
      </div>
    );
  }

  const coulissante = config.facadeCoulissante && univers?.facadeCoulissante?.disponible && linearWidth > 0;
  const maxLinearTop = Math.max(...placed.filter((p) => !p.free && p.row === 'principal').map((p) => p.bottom + p.module.hauteur), 1000);
  const mainMaterial = materials[config.materialIndex];
  /** En élévation, on voit la tranche du plan : le chant prime s'il a son propre matériau */
  const planChant = config.planChantMaterialIndex != null ? materials[config.planChantMaterialIndex] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${sceneW} ${sceneH}`}
      className="w-full h-auto max-h-[62vh] touch-none"
      role="img"
      aria-label={`Composition ${univers?.nom || ''} : ${placed.length} modules, ${totalWidth} mm de large`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <defs>
        {/* Styles de façade : motifs schématiques superposés à la teinte du matériau */}
        <pattern id="pat-rainure" width={60} height={60} patternUnits="userSpaceOnUse">
          <line x1={30} y1={0} x2={30} y2={60} stroke="rgba(0,0,0,0.28)" strokeWidth={4} />
          <line x1={36} y1={0} x2={36} y2={60} stroke="rgba(255,255,255,0.22)" strokeWidth={2.5} />
        </pattern>
        <pattern id="pat-cannage" width={44} height={44} patternUnits="userSpaceOnUse">
          <line x1={0} y1={0} x2={44} y2={44} stroke="rgba(62,44,22,0.5)" strokeWidth={5} />
          <line x1={44} y1={0} x2={0} y2={44} stroke="rgba(62,44,22,0.35)" strokeWidth={5} />
        </pattern>
      </defs>
      {/* Sol */}
      <line x1={0} y1={Y(0)} x2={sceneW} y2={Y(0)} stroke="#2B2B2B" strokeOpacity={0.18} strokeWidth={4} />

      {/* Rangées secondaires : retours du L et îlot central */}
      {rows.map((row) => (
        <text key={row.key} x={MARGIN_X} y={Y(row.top + 60)} fontSize={32} fill="#2B2B2B" fillOpacity={0.55} fontStyle="italic">
          {row.label}
        </text>
      ))}

      {/* Mur disponible (linéaire max) */}
      {config.lineaireMax ? (
        <g>
          <line
            x1={MARGIN_X + config.lineaireMax}
            y1={Y(maxTop + 120)}
            x2={MARGIN_X + config.lineaireMax}
            y2={Y(-30)}
            stroke={overMax ? '#B3261E' : '#2B2B2B'}
            strokeOpacity={overMax ? 0.9 : 0.35}
            strokeWidth={4}
            strokeDasharray="18 14"
          />
          <text x={MARGIN_X + config.lineaireMax + 14} y={Y(maxTop + 80)} fontSize={32} fill={overMax ? '#B3261E' : '#2B2B2B'} fillOpacity={overMax ? 1 : 0.55}>
            Mur : {fmtLen(config.lineaireMax, unit)}{overMax ? ' — dépassé !' : ''}
          </text>
        </g>
      ) : null}

      {/* Plans de travail (matériau dédié si choisi) */}
      {planRuns.map((run, i) => (
        <rect
          key={i}
          x={MARGIN_X + run.x - (config.planDebord ?? PLAN_OVERHANG)}
          y={Y(run.top + (config.planEpaisseur ?? PLAN_THICKNESS))}
          width={run.width + (config.planDebord ?? PLAN_OVERHANG) * 2}
          height={config.planEpaisseur ?? PLAN_THICKNESS}
          rx={6}
          fill={planChant
            ? planChant.colorHex
            : config.planMaterialIndex != null && materials[config.planMaterialIndex]
              ? materials[config.planMaterialIndex].colorHex
              : darken(mainMaterial?.colorHex || '#D4A574', 0.3)}
          stroke={darken((planChant ?? materials[config.planMaterialIndex ?? config.materialIndex])?.colorHex || '#D4A574', 0.35)}
          strokeWidth={2}
        />
      ))}

      {placed.map((p) => (
        <ModuleShape
          key={p.module.id}
          placed={p}
          config={config}
          materials={materials}
          selected={p.module.id === selectedId}
          onSelect={() => {
            if (dragRef.current?.moved) return;
            onSelect(p.module.id);
          }}
          onPointerDown={handlePointerDown(p)}
          Y={Y}
          offsetX={MARGIN_X}
        />
      ))}

      {/* Façade coulissante d'ensemble (par-dessus les modules) */}
      {coulissante && (() => {
        const vantaux = Math.min(4, Math.max(2, config.facadeVantaux ?? 2));
        const panelW = linearWidth / vantaux;
        const fill = mainMaterial?.colorHex || '#D4A574';
        return (
          <g pointerEvents="none">
            {/* Rail */}
            <rect x={MARGIN_X - 30} y={Y(maxLinearTop + 70)} width={linearWidth + 60} height={34} rx={6} fill={darken(fill, 0.5)} />
            {/* Vantaux — chevauchement alterné comme sur de vraies coulissantes */}
            {Array.from({ length: vantaux }, (_, i) => (
              <rect
                key={i}
                x={MARGIN_X + panelW * i - (i === 0 ? 14 : 28)}
                y={Y(maxLinearTop + 40 - (i % 2 === 1 ? 14 : 0))}
                width={panelW + 42}
                height={maxLinearTop + 40 - (i % 2 === 1 ? 14 : 0)}
                rx={6}
                fill={fill}
                fillOpacity={0.4}
                stroke={darken(fill, 0.4)}
                strokeWidth={4}
              />
            ))}
            {/* Poignées */}
            {Array.from({ length: vantaux }, (_, i) => (
              <line
                key={`h${i}`}
                x1={MARGIN_X + panelW * (i + 1) - 50}
                y1={Y(maxLinearTop * 0.62)}
                x2={MARGIN_X + panelW * (i + 1) - 50}
                y2={Y(maxLinearTop * 0.38)}
                stroke={darken(fill, 0.55)}
                strokeWidth={9}
                strokeLinecap="round"
              />
            ))}
          </g>
        );
      })()}

      {/* Cote du linéaire total */}
      <g stroke={overMax ? '#B3261E' : '#2B2B2B'} strokeOpacity={overMax ? 0.9 : 0.5} strokeWidth={2} fill="none">
        <line x1={MARGIN_X} y1={Y(-70)} x2={MARGIN_X + totalWidth} y2={Y(-70)} />
        <line x1={MARGIN_X} y1={Y(-50)} x2={MARGIN_X} y2={Y(-90)} />
        <line x1={MARGIN_X + totalWidth} y1={Y(-50)} x2={MARGIN_X + totalWidth} y2={Y(-90)} />
      </g>
      <text x={MARGIN_X + totalWidth / 2} y={Y(-105)} textAnchor="middle" fontSize={36} fill={overMax ? '#B3261E' : '#2B2B2B'} fillOpacity={overMax ? 1 : 0.7}>
        {fmtLen(totalWidth, unit)}
      </text>

      {/* Chaîne de cotes : largeur de chaque module posé + hauteur hors tout */}
      {showDims && (
        <g pointerEvents="none">
          {placed.filter((p) => !p.free && p.row === 'principal' && p.type.zone !== 'ilot').map((p) => {
            const x0 = MARGIN_X + p.x;
            const x1 = x0 + p.module.largeur;
            return (
              <g key={`dim-${p.module.id}`} stroke="#2B2B2B" strokeOpacity={0.55} strokeWidth={2} fill="none">
                <line x1={x0} y1={Y(-190)} x2={x1} y2={Y(-190)} />
                <line x1={x0} y1={Y(-172)} x2={x0} y2={Y(-208)} />
                <line x1={x1} y1={Y(-172)} x2={x1} y2={Y(-208)} />
                <text x={(x0 + x1) / 2} y={Y(-228)} textAnchor="middle" fontSize={30} fill="#2B2B2B" fillOpacity={0.75} stroke="none">
                  {fmtLen(p.module.largeur, unit)}
                </text>
              </g>
            );
          })}
          {/* Hauteur hors tout, à droite de la scène */}
          <g stroke="#2B2B2B" strokeOpacity={0.55} strokeWidth={2} fill="none">
            <line x1={MARGIN_X + sceneRight + 55} y1={Y(0)} x2={MARGIN_X + sceneRight + 55} y2={Y(maxTop)} />
            <line x1={MARGIN_X + sceneRight + 37} y1={Y(0)} x2={MARGIN_X + sceneRight + 73} y2={Y(0)} />
            <line x1={MARGIN_X + sceneRight + 37} y1={Y(maxTop)} x2={MARGIN_X + sceneRight + 73} y2={Y(maxTop)} />
            <text
              x={MARGIN_X + sceneRight + 95}
              y={Y(maxTop / 2)}
              textAnchor="middle"
              fontSize={30}
              fill="#2B2B2B"
              fillOpacity={0.75}
              stroke="none"
              transform={`rotate(-90 ${MARGIN_X + sceneRight + 95} ${Y(maxTop / 2)})`}
            >
              {fmtLen(maxTop, unit)}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

function ModuleShape({
  placed,
  config,
  materials,
  selected,
  onSelect,
  onPointerDown,
  Y,
  offsetX,
}: {
  placed: Placed;
  config: CompositionConfig;
  materials: ConfigurateurMaterial[];
  selected: boolean;
  onSelect: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  Y: (y: number) => number;
  offsetX: number;
}) {
  const { unit } = useUnit();
  const { module: mod, type, x, bottom, free } = placed;
  const material = moduleMaterial(materials, config, mod.materialIndex);
  const fill = material?.colorHex || '#D4A574';
  const stroke = darken(fill, 0.35);
  const inner = darken(fill, 0.12);

  const X = offsetX + x;
  const top = bottom + mod.hauteur;
  const w = mod.largeur;
  const h = mod.hauteur;

  const portes = mod.options['porte'] ?? 0;
  const portesBasses = mod.options['porte_basse'] ?? 0;
  const portesHautes = mod.options['porte_haute'] ?? 0;
  const portesPleines = mod.options['porte_pleine'] ?? 0;
  const tiroirs = mod.options['tiroir'] ?? 0;
  const etageres = mod.options['etagere'] ?? 0;
  const tringles = mod.options['tringle'] ?? 0;
  const vasques = mod.options['vasque'] ?? 0;
  const niche = (mod.options['niche_electromenager'] ?? 0) > 0;
  const led = (mod.options['led'] ?? 0) > 0 || (mod.options['led_interieur'] ?? 0) > 0;
  const sousMeubleLed = (mod.options['eclairage_sous_meuble'] ?? 0) > 0;
  const isMiroir = type.slug.includes('miroir');
  const isFrigo = type.slug === 'colonne_frigo';
  const isLaveVaisselle = type.slug === 'module_lave_vaisselle';
  const isHotte = type.slug === 'meuble_hotte';
  const isChaussures = type.slug === 'meuble_chaussures';
  const isBanc = type.slug === 'banc_rangement';
  const isPlanLibre = type.slug === 'plan_de_travail';
  const isFour = type.slug === 'colonne_four';
  const isLaveLinge = type.slug === 'colonne_lave_linge';
  const isVitre = type.slug === 'meuble_haut_vitre';
  const isBouteilles = type.slug === 'range_bouteilles';
  const isCoiffeuse = type.slug === 'coiffeuse';
  /** Panneaux pleins sans caisson ni façade : dalle, fileur, joue de finition */
  const isPanneauPlein = isPlanLibre || type.slug === 'fileur' || type.slug === 'joue_finition';
  const isDecor = !!type.decor;
  /** Objets décoratifs : on ne dessine que l'objet, pas de fond de caisson */
  const decorObjet = ['plante_pot', 'petite_plante', 'vase_deco', 'cadre_mural'].includes(type.slug);
  const habillage = (mod.options['facade_habillage'] ?? 0) > 0;
  const separateurs = mod.options['separateur_vertical'] ?? 0;
  // Style de poignées (groupe choix) : barre par défaut
  const handleStyle: 'barre' | 'bouton' | 'invisible' =
    (mod.options['poignee_invisible'] ?? 0) > 0 ? 'invisible' : (mod.options['poignee_bouton'] ?? 0) > 0 ? 'bouton' : 'barre';
  // Finition de la quincaillerie (réglage d'ensemble)
  const handleColor = { noir: '#3c3c3c', inox: '#9aa3a8', laiton: '#b08d57' }[config.poigneeFinition || 'noir'];
  // Matériau de façade distinct du caisson
  const facadeMatl = mod.facadeMaterialIndex != null ? materials[mod.facadeMaterialIndex] : null;
  const facadeFill = facadeMatl ? facadeMatl.colorHex : inner;
  const facadeStroke = facadeMatl ? darken(facadeMatl.colorHex, 0.35) : stroke;
  const styleFacade = mod.styleFacade || 'lisse';
  // Température des LED
  const ledWarm = (config.ledTemp || 'chaud') === 'chaud';
  const ledHalo = ledWarm ? '#FFE9A8' : '#E8F2FB';
  const ledStrip = ledWarm ? '#F5C84C' : '#BFDCF2';
  // Socle : plinthe (défaut) ou pieds apparents
  const socle: 'plinthe' | 'pieds_metal' | 'pieds_bois' =
    (mod.options['socle_pieds_metal'] ?? 0) > 0 ? 'pieds_metal' : (mod.options['socle_pieds_bois'] ?? 0) > 0 ? 'pieds_bois' : 'plinthe';

  const FRAME = 18;
  const innerX = X + FRAME;
  const innerW = w - FRAME * 2;
  const innerTop = top - FRAME;
  const innerBottom = bottom + FRAME;
  const innerH = innerTop - innerBottom;

  const elements: React.ReactNode[] = [];

  /** Décoration du style de façade (cadre, rainures, cannage) sur un rectangle de porte/tiroir */
  const facadeStyleEls = (x: number, yTopMm: number, wRect: number, hRect: number, key: string): React.ReactNode => {
    if (styleFacade === 'cadre') {
      const inset = Math.min(34, wRect * 0.16, hRect * 0.16);
      return <rect key={key} x={x + inset} y={Y(yTopMm - inset)} width={wRect - inset * 2} height={hRect - inset * 2} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={3} rx={2} />;
    }
    if (styleFacade === 'rainuree') {
      return <rect key={key} x={x} y={Y(yTopMm)} width={wRect} height={hRect} fill="url(#pat-rainure)" rx={3} />;
    }
    if (styleFacade === 'cannage') {
      const inset = Math.min(30, wRect * 0.14, hRect * 0.14);
      return (
        <g key={key}>
          <rect x={x + inset} y={Y(yTopMm - inset)} width={wRect - inset * 2} height={hRect - inset * 2} fill="#caa66f" rx={2} />
          <rect x={x + inset} y={Y(yTopMm - inset)} width={wRect - inset * 2} height={hRect - inset * 2} fill="url(#pat-cannage)" stroke="rgba(0,0,0,0.3)" strokeWidth={3} rx={2} />
        </g>
      );
    }
    return null;
  };

  /** Dessine `n` vantaux couvrant [zoneBottom, zoneTop], avec le style de poignée du module */
  const drawDoors = (n: number, zoneBottom: number, zoneTop: number, key: string, mirror = false, glass = false) => {
    const zoneH = zoneTop - zoneBottom;
    const dw = innerW / n;
    for (let i = 0; i < n; i++) {
      const dx = innerX + i * dw;
      const hx = i % 2 === 0 ? dx + dw - 22 : dx + 22;
      elements.push(
        <g key={`${key}${i}`}>
          <rect
            x={dx + 3}
            y={Y(zoneTop)}
            width={dw - 6}
            height={zoneH}
            fill={mirror || glass ? '#dde8ec' : facadeFill}
            fillOpacity={glass ? 0.5 : 1}
            stroke={glass ? facadeStroke : facadeStroke}
            strokeWidth={glass ? 4 : 2}
            rx={3}
          />
          {/* Reflet du vitrage */}
          {glass && (
            <line x1={dx + dw * 0.25} y1={Y(zoneTop - zoneH * 0.15)} x2={dx + dw * 0.65} y2={Y(zoneBottom + zoneH * 0.15)} stroke="#ffffff" strokeWidth={5} opacity={0.55} />
          )}
          {!mirror && !glass && facadeStyleEls(dx + 3, zoneTop, dw - 6, zoneH, `fs-${key}${i}`)}
          {!mirror && handleStyle === 'bouton' && <circle cx={hx} cy={Y(zoneTop - zoneH / 2)} r={7} fill={handleColor} />}
          {!mirror && handleStyle === 'barre' && (
            <line x1={hx} y1={Y(zoneTop - zoneH / 2 + 70)} x2={hx} y2={Y(zoneTop - zoneH / 2 - 70)} stroke={handleColor} strokeWidth={7} strokeLinecap="round" />
          )}
        </g>
      );
    }
  };

  if (isDecor) {
    // Éléments d'environnement : situent la pièce (jamais chiffrés)
    if (type.slug === 'fenetre') {
      const gx = X + 50, gw = w - 100;
      const gTop = top - 50, gBottom = bottom + 50;
      elements.push(
        <g key="fen">
          <rect x={gx} y={Y(gTop)} width={gw} height={gTop - gBottom} fill="#dceaf4" stroke="#9aa0a6" strokeWidth={3} />
          <line x1={gx + gw / 2} y1={Y(gTop)} x2={gx + gw / 2} y2={Y(gBottom)} stroke="#9aa0a6" strokeWidth={5} />
          <line x1={gx} y1={Y(gTop - (gTop - gBottom) / 2)} x2={gx + gw} y2={Y(gTop - (gTop - gBottom) / 2)} stroke="#9aa0a6" strokeWidth={5} />
          <line x1={gx + gw * 0.12} y1={Y(gTop - 60)} x2={gx + gw * 0.38} y2={Y(gBottom + 60)} stroke="#ffffff" strokeWidth={6} opacity={0.7} />
          {/* Appui de fenêtre */}
          <rect x={X - 30} y={Y(bottom)} width={w + 60} height={26} fill="#e7e2d8" stroke="#9aa0a6" strokeWidth={2} />
        </g>
      );
    } else if (type.slug === 'porte_piece') {
      elements.push(
        <g key="porte-piece">
          {/* Chambranle */}
          <rect x={X + 26} y={Y(top - 26)} width={w - 52} height={h - 52} fill="#f3efe8" stroke="#9aa0a6" strokeWidth={2.5} rx={2} />
          {/* Panneaux moulurés */}
          <rect x={X + 90} y={Y(top - 110)} width={w - 180} height={(h - 220) * 0.55} fill="none" stroke="#b9b3a7" strokeWidth={3} rx={2} />
          <rect x={X + 90} y={Y(bottom + 110 + (h - 220) * 0.36)} width={w - 180} height={(h - 220) * 0.36} fill="none" stroke="#b9b3a7" strokeWidth={3} rx={2} />
          {/* Béquille */}
          <circle cx={X + w - 72} cy={Y(bottom + 1050)} r={9} fill="#6b7075" />
          <line x1={X + w - 72} y1={Y(bottom + 1050)} x2={X + w - 130} y2={Y(bottom + 1050)} stroke="#6b7075" strokeWidth={8} strokeLinecap="round" />
        </g>
      );
    } else if (type.slug === 'radiateur') {
      const fins = Math.max(4, Math.round(w / 90));
      elements.push(
        <g key="rad">
          {Array.from({ length: fins }, (_, i) => {
            const fx = X + 26 + ((w - 52) / fins) * i;
            return <rect key={i} x={fx + 5} y={Y(top - 24)} width={(w - 52) / fins - 10} height={h - 48} rx={8} fill="#f8f8f6" stroke="#a8adb2" strokeWidth={2.5} />;
          })}
          {/* Tuyaux et thermostat */}
          <line x1={X + 40} y1={Y(bottom)} x2={X + 40} y2={Y(bottom - 110)} stroke="#a8adb2" strokeWidth={8} />
          <line x1={X + w - 40} y1={Y(bottom)} x2={X + w - 40} y2={Y(bottom - 110)} stroke="#a8adb2" strokeWidth={8} />
          <circle cx={X + w - 40} cy={Y(bottom + 60)} r={16} fill="#ffffff" stroke="#a8adb2" strokeWidth={3} />
        </g>
      );
    } else if (type.slug === 'plante_pot' || type.slug === 'petite_plante') {
      // Plante : pot + feuillage
      const potH = h * 0.32;
      const cx = X + w / 2;
      elements.push(
        <g key="plante">
          <path d={`M ${X + w * 0.2} ${Y(bottom + potH)} L ${X + w * 0.8} ${Y(bottom + potH)} L ${X + w * 0.7} ${Y(bottom)} L ${X + w * 0.3} ${Y(bottom)} Z`} fill="#b06a4a" stroke="#8a4f36" strokeWidth={2.5} />
          <line x1={cx} y1={Y(bottom + potH)} x2={cx} y2={Y(bottom + h * 0.55)} stroke="#4e6b3f" strokeWidth={5} />
          {[
            [0.5, 0.86, 0.2], [0.28, 0.66, 0.16], [0.72, 0.7, 0.16], [0.38, 0.78, 0.13], [0.64, 0.84, 0.13],
          ].map(([fx, fy, r], i) => (
            <ellipse key={i} cx={X + w * fx} cy={Y(bottom + h * fy)} rx={w * r} ry={h * r * 0.65} fill={i % 2 ? '#5a7d4f' : '#48663e'} opacity={0.92} />
          ))}
        </g>
      );
    } else if (type.slug === 'vase_deco') {
      // Vase décoratif + tiges
      const cx = X + w / 2;
      elements.push(
        <g key="vase">
          <path
            d={`M ${cx - w * 0.16} ${Y(bottom + h * 0.55)} C ${cx - w * 0.38} ${Y(bottom + h * 0.4)}, ${cx - w * 0.3} ${Y(bottom + 18)}, ${cx} ${Y(bottom)} C ${cx + w * 0.3} ${Y(bottom + 18)}, ${cx + w * 0.38} ${Y(bottom + h * 0.4)}, ${cx + w * 0.16} ${Y(bottom + h * 0.55)} Z`}
            fill="#c8a98a" stroke="#9a7b5a" strokeWidth={2.5}
          />
          <path d={`M ${cx} ${Y(bottom + h * 0.5)} C ${cx - w * 0.2} ${Y(bottom + h * 0.75)}, ${cx - w * 0.1} ${Y(bottom + h * 0.9)}, ${cx - w * 0.18} ${Y(top)}`} fill="none" stroke="#4e6b3f" strokeWidth={4} />
          <path d={`M ${cx} ${Y(bottom + h * 0.5)} C ${cx + w * 0.15} ${Y(bottom + h * 0.8)}, ${cx + w * 0.25} ${Y(bottom + h * 0.85)}, ${cx + w * 0.2} ${Y(top + h * 0.06)}`} fill="none" stroke="#5a7d4f" strokeWidth={4} />
        </g>
      );
    } else if (type.slug === 'cadre_mural') {
      // Cadre / tableau
      elements.push(
        <g key="cadre">
          <rect x={X + 14} y={Y(top - 14)} width={w - 28} height={h - 28} fill="#f4efe6" stroke="#8a6f4f" strokeWidth={8} />
          <path d={`M ${X + w * 0.18} ${Y(bottom + h * 0.3)} L ${X + w * 0.42} ${Y(bottom + h * 0.62)} L ${X + w * 0.58} ${Y(bottom + h * 0.42)} L ${X + w * 0.84} ${Y(bottom + h * 0.74)}`} fill="none" stroke="#7d8a6b" strokeWidth={5} strokeLinecap="round" />
          <circle cx={X + w * 0.72} cy={Y(bottom + h * 0.78)} r={Math.min(w, h) * 0.08} fill="#c9a227" opacity={0.85} />
        </g>
      );
    }
  } else if (isPanneauPlein) {
    // Dalle / fileur / joue : panneau plein, la teinte du matériau suffit
  } else if (isFour) {
    // Colonne four : façade basse, four encastré à hauteur d'usage, micro-ondes optionnel, façade haute
    const fourBottom = bottom + Math.min(h * 0.42, 900);
    const fourH = Math.min(620, h * 0.34);
    const micro = (mod.options['niche_micro_ondes'] ?? 0) > 0;
    const microH = micro ? 400 : 0;
    const fourTop = fourBottom + fourH;
    // Façade sous le four (grand tiroir)
    elements.push(
      <g key="four-bas">
        <rect x={innerX} y={Y(fourBottom - 8)} width={innerW} height={fourBottom - 8 - innerBottom} fill={facadeFill} stroke={facadeStroke} strokeWidth={2} rx={3} />
        {facadeStyleEls(innerX, fourBottom - 8, innerW, fourBottom - 8 - innerBottom, 'fs-four-bas')}
        {handleStyle !== 'invisible' && (
          <line x1={innerX + innerW / 2 - 60} y1={Y((fourBottom + innerBottom) / 2)} x2={innerX + innerW / 2 + 60} y2={Y((fourBottom + innerBottom) / 2)} stroke={handleColor} strokeWidth={6} strokeLinecap="round" />
        )}
      </g>
    );
    // Four : bandeau de commandes + vitre + poignée
    elements.push(
      <g key="four">
        <rect x={innerX + 4} y={Y(fourTop)} width={innerW - 8} height={fourH} fill="#2f2f2f" rx={4} />
        {[0.2, 0.32, 0.44].map((f) => (
          <circle key={f} cx={innerX + 4 + (innerW - 8) * f} cy={Y(fourTop - 60)} r={11} fill="none" stroke="#9b9b9b" strokeWidth={3} />
        ))}
        <line x1={innerX + 30} y1={Y(fourTop - 150)} x2={innerX + innerW - 30} y2={Y(fourTop - 150)} stroke="#9b9b9b" strokeWidth={7} strokeLinecap="round" />
        <rect x={innerX + 34} y={Y(fourTop - 190)} width={innerW - 68} height={fourH - 240} fill="#191919" stroke="#6f6f6f" strokeWidth={3} rx={4} />
      </g>
    );
    // Micro-ondes au-dessus du four
    if (micro) {
      elements.push(
        <g key="micro">
          <rect x={innerX + 4} y={Y(fourTop + microH)} width={innerW - 8} height={microH - 14} fill="#2f2f2f" rx={4} />
          <rect x={innerX + 30} y={Y(fourTop + microH - 50)} width={(innerW - 60) * 0.66} height={microH - 120} fill="#191919" stroke="#6f6f6f" strokeWidth={3} rx={4} />
          {[0, 1].map((i) => (
            <circle key={i} cx={innerX + innerW - 60} cy={Y(fourTop + microH - 110 - i * 90)} r={10} fill="none" stroke="#9b9b9b" strokeWidth={3} />
          ))}
        </g>
      );
    }
    // Façade au-dessus
    if (innerTop - (fourTop + microH) > 120) {
      elements.push(
        <g key="four-haut">
          <rect x={innerX} y={Y(innerTop)} width={innerW} height={innerTop - fourTop - microH - 8} fill={facadeFill} stroke={facadeStroke} strokeWidth={2} rx={3} />
          {facadeStyleEls(innerX, innerTop, innerW, innerTop - fourTop - microH - 8, 'fs-four-haut')}
          {handleStyle !== 'invisible' && (
            <line x1={innerX + innerW / 2 - 60} y1={Y(fourTop + microH + 60)} x2={innerX + innerW / 2 + 60} y2={Y(fourTop + microH + 60)} stroke={handleColor} strokeWidth={6} strokeLinecap="round" />
          )}
        </g>
      );
    }
  } else if (isLaveLinge) {
    // Colonne lave-linge : machine à hublot en bas, rangement fermé au-dessus
    const llTop = innerBottom + Math.min(880, h * 0.45);
    const cx = innerX + innerW / 2;
    const cy = (innerBottom + llTop) / 2 - 40;
    if (habillage) {
      elements.push(
        <g key="ll">
          <rect x={innerX} y={Y(llTop)} width={innerW} height={llTop - innerBottom} fill={facadeFill} stroke={facadeStroke} strokeWidth={2} rx={3} />
          {/* Grille d'aération de l'habillage */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={innerX + 30} y1={Y(innerBottom + (llTop - innerBottom) * f)} x2={innerX + innerW - 30} y2={Y(innerBottom + (llTop - innerBottom) * f)} stroke={facadeStroke} strokeWidth={3} opacity={0.5} />
          ))}
        </g>
      );
    } else {
      elements.push(
        <g key="ll">
          <rect x={innerX} y={Y(llTop)} width={innerW} height={llTop - innerBottom} fill="#f4f5f6" stroke="#9aa3a8" strokeWidth={2.5} rx={4} />
          <line x1={innerX + 16} y1={Y(llTop - 90)} x2={innerX + innerW - 16} y2={Y(llTop - 90)} stroke="#9aa3a8" strokeWidth={3} />
          <circle cx={innerX + innerW * 0.8} cy={Y(llTop - 48)} r={12} fill="none" stroke="#9aa3a8" strokeWidth={3} />
          {/* Hublot */}
          <circle cx={cx} cy={Y(cy)} r={Math.min(innerW * 0.3, 220)} fill="#dbe6ec" stroke="#7d878d" strokeWidth={9} />
          <circle cx={cx} cy={Y(cy)} r={Math.min(innerW * 0.3, 220) * 0.62} fill="#aebfc9" stroke="#7d878d" strokeWidth={4} />
        </g>
      );
    }
    drawDoors(1, llTop + 10, innerTop, 'll-haut');
  } else if (isBouteilles) {
    // Range-bouteilles : croisillons en X
    elements.push(
      <g key="bout" stroke={stroke} strokeWidth={5} strokeLinecap="round">
        <line x1={innerX} y1={Y(innerTop)} x2={innerX + innerW} y2={Y(innerBottom)} />
        <line x1={innerX + innerW} y1={Y(innerTop)} x2={innerX} y2={Y(innerBottom)} />
        <line x1={innerX} y1={Y(innerBottom + innerH / 2)} x2={innerX + innerW} y2={Y(innerBottom + innerH / 2)} strokeWidth={4} opacity={0.6} />
        <line x1={innerX + innerW / 2} y1={Y(innerTop)} x2={innerX + innerW / 2} y2={Y(innerBottom)} strokeWidth={4} opacity={0.6} />
        {[[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].map(([fx, fy], i) => (
          <circle key={i} cx={innerX + innerW * fx} cy={Y(innerBottom + innerH * fy)} r={Math.min(innerW, innerH) * 0.09} fill="#5a4632" stroke="none" opacity={0.55} />
        ))}
      </g>
    );
  } else if (isFrigo) {
    // Réfrigérateur intégré : congélateur en bas, grandes portes, poignées du côté opposé aux charnières
    const applianceFill = portes > 0 ? inner : '#cfd4d6';
    const applianceStroke = portes > 0 ? stroke : '#8d969b';
    const splitY = innerBottom + innerH * 0.33;
    const hingeLeft = (mod.options['ouverture_gauche'] ?? 0) > 0;
    const hx = hingeLeft ? innerX + innerW - 34 : innerX + 34;
    elements.push(
      <g key="frigo">
        <rect x={innerX} y={Y(innerTop)} width={innerW} height={innerTop - splitY - 4} fill={applianceFill} stroke={applianceStroke} strokeWidth={2} rx={4} />
        <rect x={innerX} y={Y(splitY - 4)} width={innerW} height={splitY - innerBottom - 4} fill={applianceFill} stroke={applianceStroke} strokeWidth={2} rx={4} />
        <line x1={hx} y1={Y(innerTop - 60)} x2={hx} y2={Y(splitY + 60)} stroke={applianceStroke} strokeWidth={9} strokeLinecap="round" />
        <line x1={hx} y1={Y(splitY - 60)} x2={hx} y2={Y(innerBottom + 60)} stroke={applianceStroke} strokeWidth={9} strokeLinecap="round" />
      </g>
    );
  } else if (isLaveVaisselle) {
    // Lave-vaisselle : bandeau de commandes + façade
    const applianceFill = habillage ? inner : '#cfd4d6';
    const applianceStroke = habillage ? stroke : '#8d969b';
    elements.push(
      <g key="lv">
        <rect x={innerX} y={Y(innerTop)} width={innerW} height={innerH} fill={applianceFill} stroke={applianceStroke} strokeWidth={2} rx={4} />
        <line x1={innerX + 16} y1={Y(innerTop - 55)} x2={innerX + innerW - 16} y2={Y(innerTop - 55)} stroke={applianceStroke} strokeWidth={3} />
        {[0.22, 0.34, 0.46].map((f) => (
          <circle key={f} cx={innerX + innerW * f} cy={Y(innerTop - 28)} r={6} fill={applianceStroke} />
        ))}
        <line x1={innerX + innerW / 2 - 55} y1={Y(innerTop - 90)} x2={innerX + innerW / 2 + 55} y2={Y(innerTop - 90)} stroke={applianceStroke} strokeWidth={6} strokeLinecap="round" />
      </g>
    );
  } else if (isHotte) {
    // Habillage de hotte : corps + cheminée + grille d'extraction
    elements.push(
      <g key="hotte">
        <rect x={innerX + innerW * 0.3} y={Y(top + 180)} width={innerW * 0.4} height={180} fill={inner} stroke={stroke} strokeWidth={2} />
        <rect x={innerX} y={Y(innerTop)} width={innerW} height={innerH} fill={inner} stroke={stroke} strokeWidth={2} rx={3} />
        {[0.3, 0.5, 0.7].map((f) => (
          <line key={f} x1={innerX + 14} y1={Y(innerBottom + innerH * f)} x2={innerX + innerW - 14} y2={Y(innerBottom + innerH * f)} stroke={stroke} strokeWidth={3} opacity={0.6} />
        ))}
      </g>
    );
  } else {
    // Répartition façade : zone de tiroirs réglable (sinon automatique, en partie haute)
    const autoZone = portes > 0 ? innerH * 0.4 : isBanc ? innerH * 0.75 : innerH;
    const drawerZoneH = tiroirs > 0 ? Math.min(innerH, Math.max(120, mod.tiroirsHauteur ?? autoZone)) : 0;
    for (let i = 0; i < tiroirs; i++) {
      const th = drawerZoneH / tiroirs;
      const ty = innerTop - i * th;
      elements.push(
        <g key={`t${i}`}>
          <rect x={innerX} y={Y(ty)} width={innerW} height={th - 6} fill={facadeFill} stroke={facadeStroke} strokeWidth={2} rx={3} />
          {facadeStyleEls(innerX, ty, innerW, th - 6, `fs-t${i}`)}
          {handleStyle === 'bouton' ? (
            <circle cx={innerX + innerW / 2} cy={Y(ty - th / 2)} r={6} fill={handleColor} />
          ) : handleStyle === 'barre' ? (
            <line x1={innerX + innerW / 2 - 50} y1={Y(ty - th / 2)} x2={innerX + innerW / 2 + 50} y2={Y(ty - th / 2)} stroke={handleColor} strokeWidth={5} strokeLinecap="round" />
          ) : null}
        </g>
      );
    }
    // Les portes vitrées laissent voir l'intérieur : elles sont dessinées après les étagères
    if (portes > 0 && !isVitre) drawDoors(portes, innerBottom, innerTop - drawerZoneH, 'p', isMiroir);

    // Assise du banc de rangement
    if (isBanc) {
      elements.push(
        <rect key="assise" x={X - 10} y={Y(top + 30)} width={w + 20} height={34} rx={8} fill={darken(fill, 0.25)} />
      );
    }

    // Intérieur visible : étagères, tringles (masqués par les portes pleines/positionnelles ensuite)
    const interiorHidden = portes > 0 && !isVitre;
    if (!interiorHidden) {
      // Séparateurs verticaux : compartiments répartis sur la largeur
      for (let i = 1; i <= separateurs; i++) {
        const sx = innerX + (innerW / (separateurs + 1)) * i;
        elements.push(<line key={`sep${i}`} x1={sx} y1={Y(innerTop)} x2={sx} y2={Y(innerBottom)} stroke={stroke} strokeWidth={4} />);
      }
      // Positions personnalisées ou réparties (mm depuis le bas du module)
      const shelfYs = shelfPositions(mod, h).map((pos) => bottom + pos);
      shelfYs.forEach((ey, idx) => {
        // Étagères inclinées pour le meuble à chaussures
        const tilt = isChaussures ? 35 : 0;
        elements.push(<line key={`e${idx}`} x1={innerX} y1={Y(ey + tilt)} x2={innerX + innerW} y2={Y(ey - tilt)} stroke={stroke} strokeWidth={4} />);
      });
      {
        // Tringles : une par compartiment, sous le dessus puis sous chaque étagère
        const shelfBounds = [innerTop, ...shelfYs.slice().sort((a, b) => b - a)];
        for (let i = 0; i < tringles; i++) {
          const under = shelfBounds[i] ?? (shelfBounds[shelfBounds.length - 1] - 400 * (i - shelfBounds.length + 1));
          const ry = Math.max(under - 120, innerBottom + 150);
          elements.push(
            <g key={`r${i}`} stroke={stroke}>
              <line x1={innerX} y1={Y(ry)} x2={innerX + innerW} y2={Y(ry)} strokeWidth={6} strokeLinecap="round" />
              {[0.3, 0.5, 0.7].map((f) => (
                <path key={f} d={`M ${innerX + innerW * f} ${Y(ry)} v 30 m -28 110 l 28 -110 l 28 110 z`} fill="none" strokeWidth={3} opacity={0.55} />
              ))}
            </g>
          );
        }
      }
    }

    // Portes vitrées par-dessus l'intérieur (l'intérieur reste visible à travers)
    if (portes > 0 && isVitre) drawDoors(portes, innerBottom, innerTop - drawerZoneH, 'p', false, true);

    // Portes par position (dressing) — dessinées par-dessus l'intérieur
    if (portesPleines > 0) drawDoors(portesPleines, innerBottom, innerTop, 'pp');
    else {
      const midY = innerBottom + innerH / 2;
      if (portesBasses > 0) drawDoors(portesBasses, innerBottom, midY - 8, 'pb');
      if (portesHautes > 0) drawDoors(portesHautes, midY + 8, innerTop, 'ph');
    }

    // Coiffeuse : miroir rond posé au-dessus du meuble
    if (isCoiffeuse) {
      const mr = Math.min(w * 0.32, 360);
      elements.push(
        <g key="coiffeuse-miroir">
          <circle cx={X + w / 2} cy={Y(top + 60 + mr)} r={mr} fill="#dde8ec" stroke={darken(fill, 0.4)} strokeWidth={8} />
          <line x1={X + w / 2 - mr * 0.4} y1={Y(top + 60 + mr * 1.35)} x2={X + w / 2 + mr * 0.2} y2={Y(top + 60 + mr * 0.6)} stroke="#ffffff" strokeWidth={6} opacity={0.6} />
        </g>
      );
    }
  }

  // Niche électroménager (colonne cuisine)
  if (niche) {
    const nh = 600;
    const ny = bottom + h * 0.45;
    elements.push(
      <g key="niche">
        <rect x={innerX + 8} y={Y(ny + nh)} width={innerW - 16} height={nh} fill="#3a3a3a" rx={4} />
        <rect x={innerX + 30} y={Y(ny + nh - 90)} width={innerW - 60} height={50} fill="none" stroke="#8a8a8a" strokeWidth={3} rx={3} />
        <circle cx={innerX + innerW / 2} cy={Y(ny + nh / 2 - 60)} r={innerW * 0.18} fill="none" stroke="#8a8a8a" strokeWidth={3} />
      </g>
    );
  }

  // Vasque(s)
  const vasqueEls: React.ReactNode[] = [];
  for (let i = 0; i < vasques; i++) {
    const cx = X + (w / (vasques + 1)) * (i + 1);
    vasqueEls.push(
      <g key={`v${i}`} stroke={darken(fill, 0.45)} fill="#f3f4f4">
        <ellipse cx={cx} cy={Y(top + 25)} rx={Math.min(w * 0.22, 220)} ry={25} strokeWidth={3} />
        <path d={`M ${cx + 60} ${Y(top + 45)} v -85 h -55 v 22`} fill="none" strokeWidth={7} strokeLinecap="round" />
      </g>
    );
  }

  return (
    <g
      onClick={onSelect}
      onPointerDown={onPointerDown}
      className={free ? 'cursor-move' : 'cursor-pointer'}
      role="button"
      aria-label={`${type.nom}, ${mod.largeur} par ${mod.hauteur} mm${free ? ' (déplaçable)' : ''}${selected ? ' (sélectionné)' : ''}`}
    >
      {/* Socle : plinthe (défaut) ou pieds apparents (modules posés et îlot, matériau dédié si choisi) */}
      {!isDecor && ((type.zone === 'bas' && !(mod.options['suspendu'] > 0)) || type.zone === 'ilot') && (
        socle === 'plinthe' ? (
          <rect
            x={X + 20}
            y={Y(bottom)}
            width={w - 40}
            height={PLINTH - 4}
            fill={config.plintheMaterialIndex != null && materials[config.plintheMaterialIndex]
              ? materials[config.plintheMaterialIndex].colorHex
              : darken(fill, 0.45)}
          />
        ) : (
          <g fill={socle === 'pieds_metal' ? handleColor : darken(fill, 0.3)}>
            {socle === 'pieds_metal' ? (
              <>
                <rect x={X + 45} y={Y(bottom)} width={26} height={PLINTH - 6} rx={4} />
                <rect x={X + w - 71} y={Y(bottom)} width={26} height={PLINTH - 6} rx={4} />
              </>
            ) : (
              <>
                {/* Pieds bois légèrement fuselés */}
                <path d={`M ${X + 40} ${Y(bottom)} h 44 l -8 ${PLINTH - 6} h -28 Z`} />
                <path d={`M ${X + w - 84} ${Y(bottom)} h 44 l -8 ${PLINTH - 6} h -28 Z`} />
              </>
            )}
          </g>
        )
      )}
      {/* Halo lumineux LED (sous le module) */}
      {(led || sousMeubleLed) && (
        <path
          d={`M ${X + 10} ${Y(bottom)} L ${X - 60} ${Y(bottom - 320)} L ${X + w + 60} ${Y(bottom - 320)} L ${X + w - 10} ${Y(bottom)} Z`}
          fill={ledHalo}
          opacity={0.38}
          pointerEvents="none"
        />
      )}
      {/* Caisson (les éléments d'environnement ont leur propre habillage clair) */}
      <rect
        x={X}
        y={Y(top)}
        width={w}
        height={h}
        fill={isDecor ? (decorObjet ? 'transparent' : '#fbfaf7') : fill}
        stroke={selected ? '#2C5F2D' : isDecor ? '#9aa0a6' : stroke}
        strokeWidth={selected ? 8 : 3}
        strokeOpacity={decorObjet && !selected ? 0.35 : 1}
        strokeDasharray={isDecor && !selected ? '14 10' : undefined}
        rx={4}
      />
      {elements}
      {vasqueEls}
      {/* Bandeau LED */}
      {(led || sousMeubleLed) && (
        <line x1={X + 14} y1={Y(bottom) + 4} x2={X + w - 14} y2={Y(bottom) + 4} stroke={ledStrip} strokeWidth={7} strokeLinecap="round" />
      )}
      {/* Poignée de déplacement des modules libres */}
      {free && selected && (
        <g pointerEvents="none" stroke="#2C5F2D" strokeWidth={3} fill="#2C5F2D">
          <circle cx={X + w / 2} cy={Y(top) - 26} r={17} fill="white" />
          <path d={`M ${X + w / 2} ${Y(top) - 36} v 20 M ${X + w / 2 - 10} ${Y(top) - 26} h 20`} fill="none" strokeLinecap="round" />
        </g>
      )}
      {/* Cotes du module sélectionné */}
      {selected && (
        <g stroke="#2C5F2D" strokeWidth={2.5} fill="none" pointerEvents="none">
          <line x1={X} y1={Y(top + 60)} x2={X + w} y2={Y(top + 60)} />
          <line x1={X} y1={Y(top + 45)} x2={X} y2={Y(top + 75)} />
          <line x1={X + w} y1={Y(top + 45)} x2={X + w} y2={Y(top + 75)} />
          <text x={X + w / 2} y={Y(top + 80)} textAnchor="middle" fontSize={34} fill="#2C5F2D" stroke="none">
            {fmtLen(w, unit)}
          </text>
          <line x1={X - 50} y1={Y(bottom)} x2={X - 50} y2={Y(top)} />
          <line x1={X - 35} y1={Y(bottom)} x2={X - 65} y2={Y(bottom)} />
          <line x1={X - 35} y1={Y(top)} x2={X - 65} y2={Y(top)} />
          <text x={X - 70} y={Y(bottom + h / 2)} textAnchor="middle" fontSize={34} fill="#2C5F2D" stroke="none" transform={`rotate(-90 ${X - 70} ${Y(bottom + h / 2)})`}>
            {fmtLen(h, unit)}
          </text>
        </g>
      )}
    </g>
  );
}
