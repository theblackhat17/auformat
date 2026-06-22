'use client';

import type { ConfigurateurModuleType, ConfigurateurUnivers } from '@/lib/types';

const ZONE_LABELS: Record<string, string> = {
  bas: 'Posé au sol',
  haut: 'Suspendu',
  colonne: 'Toute hauteur',
  ilot: 'Îlot (centre de pièce)',
};

/* Palette des vignettes */
const FACE = '#EAD9BF';
const SIDE = '#D2BD9C';
const TOP = '#F3E8D4';
const TRAIT = '#8B6F47';
const FONCE = '#6e573a';
const INOX_F = '#d6dbde';
const INOX_S = '#b7bfc4';
const BOOKS = ['#8a3b2e', '#3e5c4b', '#31435e', '#9a7b4f', '#6e4a6e', '#b5683c'];
const CLOTHES = ['#7d8a9b', '#a86b5a', '#5a7d6b', '#8a7a9b'];

/**
 * Vignette en vue 3/4 : un volume isométrique avec le détail explicite du module
 * (portes, tiroirs, four, hublot, livres, plantes…) — lisible d'un coup d'œil.
 */
function ModuleThumb({ type }: { type: ConfigurateurModuleType }) {
  const W = 128, H = 106;
  const DX = 13, DY = 9; // profondeur de la vue 3/4
  const slug = type.slug;
  const dims = type.dimensionsDefault;
  const ratio = Math.min(Math.max(dims.largeur / dims.hauteur, 0.22), 2.4);
  let fw = Math.min(Math.max(64 * ratio, 20), 86);
  let fh = Math.min(Math.max(fw / ratio, 26), 72);
  if (slug === 'plan_de_travail') { fw = 86; fh = 10; }
  if (slug === 'fileur' || slug === 'joue_finition') { fw = 14; fh = 64; }
  const x0 = (W - fw - DX) / 2;
  const y0 = (H - fh + DY) / 2 + 4;

  const inox = slug === 'colonne_frigo' || slug === 'module_lave_vaisselle';
  const face = inox ? INOX_F : FACE;
  const side = inox ? INOX_S : SIDE;

  /* Volume 3/4 : dessus + côté + face */
  const isoBox = (frontFill = face) => (
    <g>
      <polygon points={`${x0},${y0} ${x0 + DX},${y0 - DY} ${x0 + DX + fw},${y0 - DY} ${x0 + fw},${y0}`} fill={TOP} stroke={TRAIT} strokeWidth={1.4} />
      <polygon points={`${x0 + fw},${y0} ${x0 + fw + DX},${y0 - DY} ${x0 + fw + DX},${y0 + fh - DY} ${x0 + fw},${y0 + fh}`} fill={side} stroke={TRAIT} strokeWidth={1.4} />
      <rect x={x0} y={y0} width={fw} height={fh} fill={frontFill} stroke={TRAIT} strokeWidth={1.6} rx={1.5} />
    </g>
  );
  const socle = (
    <rect x={x0 + 3} y={y0 + fh} width={fw - 6} height={5} fill={FONCE} />
  );
  /* Façade : portes (2 par défaut) */
  const doors = (n = 2, gy = y0, gh = fh) => (
    <g stroke={TRAIT} strokeWidth={1.2}>
      {Array.from({ length: n }, (_, i) => {
        const dw = (fw - 6) / n;
        const dx = x0 + 3 + i * dw;
        return (
          <g key={i}>
            <rect x={dx + 1} y={gy + 3} width={dw - 2} height={gh - 6} fill="none" rx={1} />
            <line x1={i % 2 === 0 ? dx + dw - 5 : dx + 5} y1={gy + gh / 2 - 5} x2={i % 2 === 0 ? dx + dw - 5 : dx + 5} y2={gy + gh / 2 + 5} strokeWidth={2.2} strokeLinecap="round" stroke="#3c3c3c" />
          </g>
        );
      })}
    </g>
  );
  const drawers = (n = 3, gy = y0, gh = fh) => (
    <g stroke={TRAIT} strokeWidth={1.2}>
      {Array.from({ length: n }, (_, i) => {
        const th = (gh - 6) / n;
        const ty = gy + 3 + i * th;
        return (
          <g key={i}>
            <rect x={x0 + 3} y={ty + 1} width={fw - 6} height={th - 2} fill="none" rx={1} />
            <line x1={x0 + fw / 2 - 6} y1={ty + th / 2} x2={x0 + fw / 2 + 6} y2={ty + th / 2} strokeWidth={2.2} strokeLinecap="round" stroke="#3c3c3c" />
          </g>
        );
      })}
    </g>
  );
  /* Étagères garnies de livres */
  const shelvesBooks = (n = 3) => {
    const rows = Array.from({ length: n }, (_, i) => y0 + fh - 4 - i * ((fh - 8) / n));
    return (
      <g>
        {rows.map((ry, i) => (
          <g key={i}>
            {Array.from({ length: 6 }, (_, k) => {
              const bw = 3 + ((i * 7 + k * 3) % 3);
              const bh = 9 + ((i * 5 + k * 7) % 5);
              const bx = x0 + 5 + k * ((fw - 14) / 6);
              return <rect key={k} x={bx} y={ry - bh} width={bw} height={bh} fill={BOOKS[(i * 5 + k) % BOOKS.length]} rx={0.5} />;
            })}
            <line x1={x0 + 2} y1={ry} x2={x0 + fw - 2} y2={ry} stroke={TRAIT} strokeWidth={1.6} />
          </g>
        ))}
      </g>
    );
  };
  /* Penderie : tringle + cintres habillés */
  const penderie = (
    <g>
      <line x1={x0 + 4} y1={y0 + 10} x2={x0 + fw - 4} y2={y0 + 10} stroke="#3c3c3c" strokeWidth={2.4} strokeLinecap="round" />
      {CLOTHES.slice(0, 3).map((c, i) => {
        const cx = x0 + fw * (0.25 + i * 0.25);
        return (
          <g key={i}>
            <line x1={cx} y1={y0 + 10} x2={cx} y2={y0 + 15} stroke="#3c3c3c" strokeWidth={1.4} />
            <path d={`M ${cx - 6} ${y0 + 15} h 12 l -1.5 ${fh * 0.45} h -9 Z`} fill={c} />
          </g>
        );
      })}
    </g>
  );

  let detail: React.ReactNode = doors(2);
  let custom: React.ReactNode = null; // dessins entièrement spécifiques (objets, environnement)

  switch (slug) {
    case 'caisson_bas_porte': detail = doors(2); break;
    case 'caisson_bas_tiroirs': detail = drawers(3); break;
    case 'caisson_sous_evier':
      detail = (
        <g>
          {doors(2)}
          {/* Évier + mitigeur sur le dessus */}
          <ellipse cx={x0 + fw / 2 + DX / 2} cy={y0 - DY / 2 - 1} rx={fw * 0.22} ry={3.2} fill="#eef1f2" stroke={TRAIT} strokeWidth={1.2} />
          <path d={`M ${x0 + fw / 2 + DX} ${y0 - DY - 1} v -8 h -6 v 3`} fill="none" stroke="#3c3c3c" strokeWidth={2} strokeLinecap="round" />
        </g>
      );
      break;
    case 'meuble_haut': detail = doors(2); break;
    case 'meuble_haut_vitre':
      detail = (
        <g>
          <rect x={x0 + 3} y={y0 + 3} width={fw - 6} height={fh - 6} fill="#dce9f0" opacity={0.85} stroke={TRAIT} strokeWidth={1.2} rx={1} />
          <line x1={x0 + fw / 2} y1={y0 + 3} x2={x0 + fw / 2} y2={y0 + fh - 3} stroke={TRAIT} strokeWidth={1.4} />
          <line x1={x0 + 9} y1={y0 + 7} x2={x0 + fw * 0.42} y2={y0 + fh - 8} stroke="#ffffff" strokeWidth={2.4} opacity={0.8} />
        </g>
      );
      break;
    case 'colonne_cuisine':
    case 'colonne_sdb':
      detail = doors(1);
      break;
    case 'module_penderie': detail = penderie; break;
    case 'colonne_tiroirs': detail = drawers(4); break;
    case 'module_etageres':
    case 'bibliotheque':
      detail = shelvesBooks(3);
      break;
    case 'etagere_murale':
    case 'niche_ouverte':
      detail = shelvesBooks(2);
      break;
    case 'meuble_vasque':
      detail = (
        <g>
          {drawers(2)}
          <ellipse cx={x0 + fw / 2 + DX / 2} cy={y0 - DY / 2 - 1.5} rx={fw * 0.24} ry={3.6} fill="#f6f7f7" stroke={TRAIT} strokeWidth={1.2} />
          <path d={`M ${x0 + fw / 2 + DX + 6} ${y0 - DY - 2} v -8 h -6 v 3`} fill="none" stroke="#3c3c3c" strokeWidth={2} strokeLinecap="round" />
        </g>
      );
      break;
    case 'miroir_rangement':
      detail = (
        <g>
          <rect x={x0 + 3} y={y0 + 3} width={fw - 6} height={fh - 6} fill="#dde9ee" stroke={TRAIT} strokeWidth={1.2} rx={1} />
          <line x1={x0 + 8} y1={y0 + 8} x2={x0 + fw * 0.5} y2={y0 + fh - 9} stroke="#ffffff" strokeWidth={3} opacity={0.85} />
        </g>
      );
      break;
    case 'colonne_frigo':
      detail = (
        <g stroke="#8d969b" strokeWidth={1.4}>
          <line x1={x0 + 2} y1={y0 + fh * 0.62} x2={x0 + fw - 2} y2={y0 + fh * 0.62} />
          <line x1={x0 + 7} y1={y0 + 7} x2={x0 + 7} y2={y0 + fh * 0.62 - 6} strokeWidth={2.6} strokeLinecap="round" stroke="#5e686d" />
          <line x1={x0 + 7} y1={y0 + fh * 0.62 + 5} x2={x0 + 7} y2={y0 + fh - 7} strokeWidth={2.6} strokeLinecap="round" stroke="#5e686d" />
        </g>
      );
      break;
    case 'module_lave_vaisselle':
      detail = (
        <g>
          <line x1={x0 + 4} y1={y0 + 8} x2={x0 + fw - 4} y2={y0 + 8} stroke="#8d969b" strokeWidth={1.4} />
          {[0.3, 0.45, 0.6].map((f) => <circle key={f} cx={x0 + fw * f} cy={y0 + 5} r={1.6} fill="#8d969b" />)}
          <line x1={x0 + fw / 2 - 8} y1={y0 + 14} x2={x0 + fw / 2 + 8} y2={y0 + 14} stroke="#5e686d" strokeWidth={2.6} strokeLinecap="round" />
        </g>
      );
      break;
    case 'colonne_four':
      detail = (
        <g>
          <rect x={x0 + 4} y={y0 + fh * 0.34} width={fw - 8} height={fh * 0.3} fill="#2f2f2f" rx={1.5} />
          <rect x={x0 + 7} y={y0 + fh * 0.42} width={fw - 14} height={fh * 0.17} fill="#171717" stroke="#7a7a7a" strokeWidth={1} rx={1} />
          {[0.3, 0.5, 0.7].map((f) => <circle key={f} cx={x0 + fw * f} cy={y0 + fh * 0.38} r={1.5} fill="#9b9b9b" />)}
          <rect x={x0 + 3} y={y0 + 3} width={fw - 6} height={fh * 0.26} fill="none" stroke={TRAIT} strokeWidth={1.2} rx={1} />
          <rect x={x0 + 3} y={y0 + fh * 0.7} width={fw - 6} height={fh * 0.26} fill="none" stroke={TRAIT} strokeWidth={1.2} rx={1} />
        </g>
      );
      break;
    case 'colonne_lave_linge':
      detail = (
        <g>
          <circle cx={x0 + fw / 2} cy={y0 + fh * 0.7} r={fw * 0.27} fill="#dbe6ec" stroke="#7d878d" strokeWidth={3} />
          <circle cx={x0 + fw / 2} cy={y0 + fh * 0.7} r={fw * 0.16} fill="#aebfc9" />
          <rect x={x0 + 3} y={y0 + 3} width={fw - 6} height={fh * 0.36} fill="none" stroke={TRAIT} strokeWidth={1.2} rx={1} />
        </g>
      );
      break;
    case 'meuble_hotte':
      detail = (
        <g>
          <rect x={x0 + fw * 0.32} y={y0 - 16} width={fw * 0.36} height={16} fill={FACE} stroke={TRAIT} strokeWidth={1.4} />
          {[0.35, 0.55, 0.75].map((f) => (
            <line key={f} x1={x0 + 5} y1={y0 + fh * f} x2={x0 + fw - 5} y2={y0 + fh * f} stroke={TRAIT} strokeWidth={1.2} opacity={0.6} />
          ))}
        </g>
      );
      break;
    case 'range_bouteilles':
      detail = (
        <g stroke={TRAIT} strokeWidth={1.6}>
          <line x1={x0 + 3} y1={y0 + 3} x2={x0 + fw - 3} y2={y0 + fh - 3} />
          <line x1={x0 + fw - 3} y1={y0 + 3} x2={x0 + 3} y2={y0 + fh - 3} />
          {[[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]].map(([fx, fy], i) => (
            <circle key={i} cx={x0 + fw * fx} cy={y0 + fh * fy} r={4.5} fill="#5a4632" stroke="none" opacity={0.7} />
          ))}
        </g>
      );
      break;
    case 'caisson_bas_ouvert': detail = shelvesBooks(2); break;
    case 'meuble_chaussures':
      detail = (
        <g stroke={TRAIT} strokeWidth={1.4}>
          {[0.3, 0.55, 0.8].map((f) => (
            <line key={f} x1={x0 + 4} y1={y0 + fh * f - 4} x2={x0 + fw - 4} y2={y0 + fh * f + 4} />
          ))}
        </g>
      );
      break;
    case 'banc_rangement':
      detail = (
        <g>
          {drawers(1, y0 + 6, fh - 6)}
          <rect x={x0 - 2} y={y0} width={fw + 4} height={6} rx={3} fill="#a9846a" stroke={TRAIT} strokeWidth={1} />
        </g>
      );
      break;
    case 'meuble_tv':
      detail = (
        <g>
          {drawers(2, y0 + 2, fh - 2)}
          <rect x={x0 + fw * 0.18 + DX} y={y0 - DY - 26} width={fw * 0.64} height={24} rx={1.5} fill="#20262b" stroke="#3c3c3c" strokeWidth={1.4} />
          <line x1={x0 + fw * 0.5 + DX} y1={y0 - DY - 2} x2={x0 + fw * 0.5 + DX} y2={y0 - DY} stroke="#3c3c3c" strokeWidth={3} />
        </g>
      );
      break;
    case 'bureau':
      custom = (
        <g>
          <polygon points={`${x0},${y0 + 16} ${x0 + DX},${y0 + 16 - DY} ${x0 + DX + fw},${y0 + 16 - DY} ${x0 + fw},${y0 + 16}`} fill={TOP} stroke={TRAIT} strokeWidth={1.4} />
          <rect x={x0} y={y0 + 16} width={fw} height={5} fill={FACE} stroke={TRAIT} strokeWidth={1.4} />
          <rect x={x0 + 3} y={y0 + 21} width={4} height={fh - 24} fill={SIDE} stroke={TRAIT} strokeWidth={1.2} />
          <rect x={x0 + fw - 26} y={y0 + 21} width={24} height={fh - 30} fill={FACE} stroke={TRAIT} strokeWidth={1.3} />
          {[0, 1].map((i) => (
            <g key={i}>
              <rect x={x0 + fw - 24} y={y0 + 24 + i * ((fh - 36) / 2)} width={20} height={(fh - 36) / 2 - 2} fill="none" stroke={TRAIT} strokeWidth={1} rx={1} />
              <line x1={x0 + fw - 17} y1={y0 + 24 + i * ((fh - 36) / 2) + ((fh - 36) / 4)} x2={x0 + fw - 11} y2={y0 + 24 + i * ((fh - 36) / 2) + ((fh - 36) / 4)} stroke="#3c3c3c" strokeWidth={2} strokeLinecap="round" />
            </g>
          ))}
          {/* Lampe */}
          <path d={`M ${x0 + 14} ${y0 + 14} v -8 l 8 -5`} fill="none" stroke="#3c3c3c" strokeWidth={1.8} strokeLinecap="round" />
          <circle cx={x0 + 24} cy={y0} r={3.4} fill="#c9a227" />
        </g>
      );
      break;
    case 'coiffeuse':
      detail = (
        <g>
          {drawers(2)}
          <circle cx={x0 + fw / 2 + DX} cy={y0 - DY - 14} r={12} fill="#dde9ee" stroke={TRAIT} strokeWidth={2.4} />
          <line x1={x0 + fw / 2 + DX - 5} y1={y0 - DY - 18} x2={x0 + fw / 2 + DX + 3} y2={y0 - DY - 9} stroke="#ffffff" strokeWidth={2} opacity={0.8} />
        </g>
      );
      break;
    case 'ilot_central':
    case 'ilot_dressing':
      detail = (
        <g>
          {slug === 'ilot_central' ? doors(3) : drawers(3)}
          <rect x={x0 - 3} y={y0 - 2} width={fw + DX + 6} height={4} fill="#7a5c40" stroke={TRAIT} strokeWidth={1} />
        </g>
      );
      break;
    case 'plan_de_travail':
      detail = <g />;
      break;
    case 'fileur':
    case 'joue_finition':
      detail = <g />;
      break;
    case 'caisson_bureau': detail = drawers(3); break;
    /* ── Environnement & déco : objets dessinés tels quels ── */
    case 'fenetre':
      custom = (
        <g>
          <rect x={34} y={18} width={60} height={62} fill="#dceaf4" stroke="#9aa0a6" strokeWidth={3} />
          <line x1={64} y1={18} x2={64} y2={80} stroke="#9aa0a6" strokeWidth={2.4} />
          <line x1={34} y1={49} x2={94} y2={49} stroke="#9aa0a6" strokeWidth={2.4} />
          <line x1={42} y1={24} x2={58} y2={44} stroke="#ffffff" strokeWidth={3} opacity={0.8} />
          <rect x={28} y={80} width={72} height={5} fill="#e7e2d8" stroke="#9aa0a6" strokeWidth={1.4} />
        </g>
      );
      break;
    case 'porte_piece':
      custom = (
        <g>
          <rect x={44} y={12} width={42} height={82} fill="#f6f3ee" stroke="#9aa0a6" strokeWidth={2.4} rx={1.5} />
          <rect x={51} y={20} width={28} height={30} fill="none" stroke="#c4beb2" strokeWidth={1.8} rx={1} />
          <rect x={51} y={56} width={28} height={26} fill="none" stroke="#c4beb2" strokeWidth={1.8} rx={1} />
          <circle cx={80} cy={53} r={2.6} fill="#6b7075" />
          <line x1={80} y1={53} x2={71} y2={53} stroke="#6b7075" strokeWidth={2.6} strokeLinecap="round" />
        </g>
      );
      break;
    case 'radiateur':
      custom = (
        <g>
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x={28 + i * 11} y={26} width={8} height={52} rx={3.5} fill="#f8f8f6" stroke="#a8adb2" strokeWidth={1.8} />
          ))}
          <line x1={33} y1={78} x2={33} y2={90} stroke="#a8adb2" strokeWidth={3} />
          <line x1={97} y1={78} x2={97} y2={90} stroke="#a8adb2" strokeWidth={3} />
          <circle cx={97} cy={70} r={4.5} fill="#ffffff" stroke="#a8adb2" strokeWidth={1.8} />
        </g>
      );
      break;
    case 'plante_pot':
    case 'petite_plante':
      custom = (
        <g>
          <path d="M 50 70 L 78 70 L 73 94 L 55 94 Z" fill="#b06a4a" stroke="#8a4f36" strokeWidth={1.8} />
          <line x1={64} y1={70} x2={64} y2={50} stroke="#4e6b3f" strokeWidth={2.6} />
          <ellipse cx={64} cy={32} rx={17} ry={13} fill="#48663e" />
          <ellipse cx={47} cy={45} rx={12} ry={9} fill="#5a7d4f" />
          <ellipse cx={80} cy={43} rx={12} ry={9} fill="#5a7d4f" />
          <ellipse cx={58} cy={50} rx={9} ry={7} fill="#3f5a37" />
        </g>
      );
      break;
    case 'vase_deco':
      custom = (
        <g>
          <path d="M 58 56 C 44 62 46 88 64 92 C 82 88 84 62 70 56 Z" fill="#c8a98a" stroke="#9a7b5a" strokeWidth={1.8} />
          <rect x={58} y={48} width={12} height={9} fill="#c8a98a" stroke="#9a7b5a" strokeWidth={1.8} rx={1.5} />
          <path d="M 62 48 C 56 34 58 24 50 16" fill="none" stroke="#4e6b3f" strokeWidth={2.4} strokeLinecap="round" />
          <path d="M 66 48 C 70 32 74 28 80 20" fill="none" stroke="#5a7d4f" strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
      break;
    case 'cadre_mural':
      custom = (
        <g>
          <rect x={36} y={20} width={56} height={66} fill="#f4efe6" stroke="#8a6f4f" strokeWidth={5} />
          <path d="M 44 66 L 56 48 L 64 58 L 80 36" fill="none" stroke="#7d8a6b" strokeWidth={3} strokeLinecap="round" />
          <circle cx={76} cy={66} r={5.5} fill="#c9a227" opacity={0.9} />
        </g>
      );
      break;
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="mx-auto">
      {custom ?? (
        <>
          {isoBox(slug === 'meuble_haut_vitre' || slug === 'miroir_rangement' ? '#e8eef1' : face)}
          {type.zone === 'bas' && !type.decor && socle}
          {detail}
        </>
      )}
    </svg>
  );
}

export function ModulePicker({
  moduleTypes,
  universList,
  universSlug,
  showPrices = false,
  onAdd,
  onClose,
}: {
  moduleTypes: ConfigurateurModuleType[];
  /** Tous les univers (la galerie montre tout le catalogue, groupé) */
  universList: ConfigurateurUnivers[];
  /** Univers courant : sa section s'affiche en premier */
  universSlug: string;
  showPrices?: boolean;
  onAdd: (type: ConfigurateurModuleType) => void;
  onClose: () => void;
}) {
  // Sections groupées par univers, l'univers courant d'abord
  const sections = [...universList]
    .filter((u) => u.actif)
    .sort((a, b) => (a.slug === universSlug ? -1 : b.slug === universSlug ? 1 : a.sortOrder - b.sortOrder))
    .map((u) => ({
      univers: u,
      modules: moduleTypes
        .filter((t) => t.actif && t.univers.includes(u.slug))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((s) => s.modules.length > 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-noir/45 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_24px_64px_-16px_rgba(43,43,43,0.35)] w-full max-w-3xl max-h-[85vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-noir/8">
          <div>
            <h2 className="font-display text-xl text-noir">Galerie de modules</h2>
            <p className="text-xs text-noir/55 mt-0.5">Tout le catalogue, quel que soit votre univers — mélangez librement.</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-full hover:bg-beige/70 text-noir/55 hover:text-noir transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-7">
          {sections.map(({ univers, modules }) => (
            <section key={univers.slug}>
              <h3 className="font-display text-lg text-noir mb-3 flex items-center gap-2.5">
                {univers.nom}
                {univers.slug === universSlug && (
                  <span className="text-[11px] font-sans font-semibold text-vert-foret bg-vert-foret/10 px-2 py-0.5 rounded-full">Votre univers</span>
                )}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {modules.map((type) => (
                  <button
                    key={`${univers.slug}-${type.slug}`}
                    type="button"
                    onClick={() => { onAdd(type); onClose(); }}
                    className="group text-center p-3 rounded-xl border border-noir/10 hover:border-vert-foret hover:bg-vert-foret/5 transition-colors"
                  >
                    <ModuleThumb type={type} />
                    <span className="block font-semibold text-noir text-[13px] leading-snug mt-1.5">{type.nom}</span>
                    <span className="block text-[11px] text-bois-fonce mt-0.5">
                      {ZONE_LABELS[type.zone]}{showPrices ? ` · dès ${type.prixBase} €` : ''}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {sections.length === 0 && <p className="text-center text-sm text-noir/55 py-8">Aucun module disponible.</p>}
        </div>
      </div>
    </div>
  );
}
