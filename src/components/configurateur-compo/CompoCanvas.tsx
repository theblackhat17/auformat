'use client';

import { useRef } from 'react';
import type { CompositionConfig, CompositionModule, ConfigurateurMaterial, ConfigurateurModuleType, ConfigurateurUnivers } from '@/lib/types';
import { getModuleType, moduleMaterial } from './pricingCompo';

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

type Placed = {
  module: CompositionModule;
  type: ConfigurateurModuleType;
  x: number;       // bord gauche, mm
  bottom: number;  // bas du caisson au-dessus du sol, mm
  free: boolean;   // module suspendu librement positionnable
};

export function layoutModules(config: CompositionConfig, moduleTypes: ConfigurateurModuleType[]): { placed: Placed[]; totalWidth: number; linearWidth: number; maxTop: number; ilotDepth: number } {
  const placed: Placed[] = [];
  const freeModules: { mod: CompositionModule; type: ConfigurateurModuleType }[] = [];
  let cursor = 0;
  let ilotCursor = 0;
  let lastLinearX = 0;
  let lastBasX: number | null = null;
  let maxTop = 1000;
  let ilotDepth = 0;

  for (const mod of config.modules) {
    const type = getModuleType(moduleTypes, mod.typeSlug);
    if (!type) continue;

    if (type.zone === 'haut') {
      // Suspendu : position libre, ne consomme pas de linéaire (placé après les modules posés)
      freeModules.push({ mod, type });
      continue;
    }

    if (type.zone === 'ilot') {
      // Îlot : rangée séparée sous l'élévation principale (vue de face, devant le mur)
      ilotCursor += mod.ecartGauche || 0;
      const bottom = -(ILOT_GAP + mod.hauteur);
      placed.push({ module: mod, type, x: ilotCursor, bottom, free: false });
      ilotDepth = Math.max(ilotDepth, ILOT_GAP + mod.hauteur + PLINTH);
      ilotCursor += mod.largeur + GAP;
      continue;
    }

    cursor += mod.ecartGauche || 0; // décalage libre dans la rangée
    const bottom = type.zone === 'bas' ? (mod.options['suspendu'] > 0 ? SUSPENDU_BOTTOM : PLINTH) : 0;
    placed.push({ module: mod, type, x: cursor, bottom, free: false });
    lastLinearX = cursor;
    if (type.zone === 'bas') lastBasX = cursor;
    maxTop = Math.max(maxTop, bottom + mod.hauteur);
    cursor += mod.largeur + GAP;
  }

  for (const { mod, type } of freeModules) {
    // Par défaut : au-dessus du dernier module bas (vasque, caisson…), sinon du dernier module posé
    const x = mod.posX ?? lastBasX ?? lastLinearX;
    const bottom = mod.posY ?? HAUT_BOTTOM_DEFAULT;
    placed.push({ module: mod, type, x, bottom, free: true });
    maxTop = Math.max(maxTop, bottom + mod.hauteur);
  }

  const linearWidth = Math.max(cursor - GAP, 0);
  const ilotWidth = Math.max(ilotCursor - GAP, 0);
  const freeRight = placed.filter((p) => p.free).reduce((m, p) => Math.max(m, p.x + p.module.largeur), 0);
  return { placed, totalWidth: Math.max(linearWidth, freeRight, ilotWidth), linearWidth, maxTop, ilotDepth };
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
};

export function CompoCanvas({ config, moduleTypes, materials, univers, selectedId, onSelect, onMoveFree, onEcart }: CompoCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; kind: 'free' | 'linear'; startX: number; startY: number; origX: number; origY: number; origEcart: number; moved: boolean } | null>(null);

  const { placed, totalWidth, linearWidth, maxTop, ilotDepth } = layoutModules(config, moduleTypes);

  // L'îlot ne consomme pas le linéaire du mur
  const wallWidth = Math.max(linearWidth, placed.filter((p) => p.free).reduce((m, p) => Math.max(m, p.x + p.module.largeur), 0));
  const overMax = config.lineaireMax ? wallWidth > config.lineaireMax : false;
  const sceneRight = Math.max(totalWidth, config.lineaireMax || 0);
  const sceneW = sceneRight + MARGIN_X * 2;
  const bottomMargin = MARGIN_BOTTOM + ilotDepth;
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
      origX: p.x, origY: p.bottom,
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
      return;
    }
    const newX = Math.round(Math.max(-PLAN_OVERHANG, Math.min(sceneRight - mod.largeur + PLAN_OVERHANG, drag.origX + dx)) / 10) * 10;
    const newY = Math.round(Math.max(100, Math.min(maxTop + 200 - mod.hauteur, drag.origY - dy)) / 10) * 10;
    onMoveFree?.(drag.id, newX, newY);
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  // Plans de travail : une bande par suite contiguë de modules « bas » posés, et une sur l'îlot
  const planRuns: { x: number; width: number; top: number }[] = [];
  if (config.planTravail && univers?.planTravail?.disponible) {
    let run: Placed[] = [];
    const flush = () => {
      if (run.length === 0) return;
      const x0 = run[0].x;
      const x1 = run[run.length - 1].x + run[run.length - 1].module.largeur;
      planRuns.push({ x: x0, width: x1 - x0, top: Math.max(...run.map((p) => p.bottom + p.module.hauteur)) });
      run = [];
    };
    for (const p of placed) {
      if (p.free || p.type.zone === 'ilot') continue;
      if (p.type.zone === 'bas' && !(p.module.options['suspendu'] > 0)) run.push(p);
      else flush();
    }
    flush();
    // Bande de plan sur chaque module îlot
    for (const p of placed.filter((pl) => pl.type.zone === 'ilot')) {
      planRuns.push({ x: p.x, width: p.module.largeur, top: p.bottom + p.module.hauteur });
    }
  }

  const hasIlot = placed.some((p) => p.type.zone === 'ilot');

  if (placed.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 text-noir/55 text-sm">
        Ajoutez un premier module pour commencer votre composition.
      </div>
    );
  }

  const coulissante = config.facadeCoulissante && univers?.facadeCoulissante?.disponible && linearWidth > 0;
  const maxLinearTop = Math.max(...placed.filter((p) => !p.free).map((p) => p.bottom + p.module.hauteur), 1000);
  const mainMaterial = materials[config.materialIndex];

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
      {/* Sol */}
      <line x1={0} y1={Y(0)} x2={sceneW} y2={Y(0)} stroke="#2B2B2B" strokeOpacity={0.18} strokeWidth={4} />

      {/* Rangée îlot central */}
      {hasIlot && (
        <text x={MARGIN_X} y={Y(-ILOT_GAP + 60)} fontSize={32} fill="#2B2B2B" fillOpacity={0.55} fontStyle="italic">
          Îlot central (vu de face, au centre de la pièce)
        </text>
      )}

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
            Mur : {config.lineaireMax} mm{overMax ? ' — dépassé !' : ''}
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
          fill={config.planMaterialIndex != null && materials[config.planMaterialIndex]
            ? materials[config.planMaterialIndex].colorHex
            : darken(mainMaterial?.colorHex || '#D4A574', 0.3)}
          stroke={darken(materials[config.planMaterialIndex ?? config.materialIndex]?.colorHex || '#D4A574', 0.35)}
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
        {totalWidth} mm
      </text>
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
  const habillage = (mod.options['facade_habillage'] ?? 0) > 0;
  // Style de poignées (groupe choix) : barre par défaut
  const handleStyle: 'barre' | 'bouton' | 'invisible' =
    (mod.options['poignee_invisible'] ?? 0) > 0 ? 'invisible' : (mod.options['poignee_bouton'] ?? 0) > 0 ? 'bouton' : 'barre';

  const FRAME = 18;
  const innerX = X + FRAME;
  const innerW = w - FRAME * 2;
  const innerTop = top - FRAME;
  const innerBottom = bottom + FRAME;
  const innerH = innerTop - innerBottom;

  const elements: React.ReactNode[] = [];

  /** Dessine `n` vantaux couvrant [zoneBottom, zoneTop], avec le style de poignée du module */
  const drawDoors = (n: number, zoneBottom: number, zoneTop: number, key: string, mirror = false) => {
    const zoneH = zoneTop - zoneBottom;
    const dw = innerW / n;
    for (let i = 0; i < n; i++) {
      const dx = innerX + i * dw;
      const hx = i % 2 === 0 ? dx + dw - 22 : dx + 22;
      elements.push(
        <g key={`${key}${i}`}>
          <rect x={dx + 3} y={Y(zoneTop)} width={dw - 6} height={zoneH} fill={mirror ? '#dde8ec' : inner} stroke={stroke} strokeWidth={2} rx={3} />
          {!mirror && handleStyle === 'bouton' && <circle cx={hx} cy={Y(zoneTop - zoneH / 2)} r={7} fill={stroke} />}
          {!mirror && handleStyle === 'barre' && (
            <line x1={hx} y1={Y(zoneTop - zoneH / 2 + 70)} x2={hx} y2={Y(zoneTop - zoneH / 2 - 70)} stroke={stroke} strokeWidth={7} strokeLinecap="round" />
          )}
        </g>
      );
    }
  };

  if (isFrigo) {
    // Réfrigérateur intégré : congélateur en bas, grandes portes, poignées barre
    const applianceFill = portes > 0 ? inner : '#cfd4d6';
    const applianceStroke = portes > 0 ? stroke : '#8d969b';
    const splitY = innerBottom + innerH * 0.33;
    elements.push(
      <g key="frigo">
        <rect x={innerX} y={Y(innerTop)} width={innerW} height={innerTop - splitY - 4} fill={applianceFill} stroke={applianceStroke} strokeWidth={2} rx={4} />
        <rect x={innerX} y={Y(splitY - 4)} width={innerW} height={splitY - innerBottom - 4} fill={applianceFill} stroke={applianceStroke} strokeWidth={2} rx={4} />
        <line x1={innerX + 34} y1={Y(innerTop - 60)} x2={innerX + 34} y2={Y(splitY + 60)} stroke={applianceStroke} strokeWidth={9} strokeLinecap="round" />
        <line x1={innerX + 34} y1={Y(splitY - 60)} x2={innerX + 34} y2={Y(innerBottom + 60)} stroke={applianceStroke} strokeWidth={9} strokeLinecap="round" />
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
          <rect x={innerX} y={Y(ty)} width={innerW} height={th - 6} fill={inner} stroke={stroke} strokeWidth={2} rx={3} />
          {handleStyle === 'bouton' ? (
            <circle cx={innerX + innerW / 2} cy={Y(ty - th / 2)} r={6} fill={stroke} />
          ) : handleStyle === 'barre' ? (
            <line x1={innerX + innerW / 2 - 50} y1={Y(ty - th / 2)} x2={innerX + innerW / 2 + 50} y2={Y(ty - th / 2)} stroke={stroke} strokeWidth={5} strokeLinecap="round" />
          ) : null}
        </g>
      );
    }
    if (portes > 0) drawDoors(portes, innerBottom, innerTop - drawerZoneH, 'p', isMiroir);

    // Assise du banc de rangement
    if (isBanc) {
      elements.push(
        <rect key="assise" x={X - 10} y={Y(top + 30)} width={w + 20} height={34} rx={8} fill={darken(fill, 0.25)} />
      );
    }

    // Intérieur visible : étagères, tringles (masqués par les portes pleines/positionnelles ensuite)
    const interiorHidden = portes > 0;
    if (!interiorHidden) {
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

    // Portes par position (dressing) — dessinées par-dessus l'intérieur
    if (portesPleines > 0) drawDoors(portesPleines, innerBottom, innerTop, 'pp');
    else {
      const midY = innerBottom + innerH / 2;
      if (portesBasses > 0) drawDoors(portesBasses, innerBottom, midY - 8, 'pb');
      if (portesHautes > 0) drawDoors(portesHautes, midY + 8, innerTop, 'ph');
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
      {/* Plinthe (modules posés et îlot, à leur propre niveau — matériau dédié si choisi) */}
      {((type.zone === 'bas' && !(mod.options['suspendu'] > 0)) || type.zone === 'ilot') && (
        <rect
          x={X + 20}
          y={Y(bottom)}
          width={w - 40}
          height={PLINTH - 4}
          fill={config.plintheMaterialIndex != null && materials[config.plintheMaterialIndex]
            ? materials[config.plintheMaterialIndex].colorHex
            : darken(fill, 0.45)}
        />
      )}
      {/* Halo lumineux LED (sous le module) */}
      {(led || sousMeubleLed) && (
        <path
          d={`M ${X + 10} ${Y(bottom)} L ${X - 60} ${Y(bottom - 320)} L ${X + w + 60} ${Y(bottom - 320)} L ${X + w - 10} ${Y(bottom)} Z`}
          fill="#FFE9A8"
          opacity={0.35}
          pointerEvents="none"
        />
      )}
      {/* Caisson */}
      <rect x={X} y={Y(top)} width={w} height={h} fill={fill} stroke={selected ? '#2C5F2D' : stroke} strokeWidth={selected ? 8 : 3} rx={4} />
      {elements}
      {vasqueEls}
      {/* Bandeau LED */}
      {(led || sousMeubleLed) && (
        <line x1={X + 14} y1={Y(bottom) + 4} x2={X + w - 14} y2={Y(bottom) + 4} stroke="#F5C84C" strokeWidth={7} strokeLinecap="round" />
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
            {w} mm
          </text>
          <line x1={X - 50} y1={Y(bottom)} x2={X - 50} y2={Y(top)} />
          <line x1={X - 35} y1={Y(bottom)} x2={X - 65} y2={Y(bottom)} />
          <line x1={X - 35} y1={Y(top)} x2={X - 65} y2={Y(top)} />
          <text x={X - 70} y={Y(bottom + h / 2)} textAnchor="middle" fontSize={34} fill="#2C5F2D" stroke="none" transform={`rotate(-90 ${X - 70} ${Y(bottom + h / 2)})`}>
            {h} mm
          </text>
        </g>
      )}
    </g>
  );
}
