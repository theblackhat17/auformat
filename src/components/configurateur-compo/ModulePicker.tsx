'use client';

import type { ConfigurateurModuleType } from '@/lib/types';

const ZONE_LABELS: Record<string, string> = {
  bas: 'Posé au sol',
  haut: 'Suspendu',
  colonne: 'Toute hauteur',
};

/** Mini-aperçu schématique d'un type de module */
function ModuleThumb({ type }: { type: ConfigurateurModuleType }) {
  const ratio = Math.min(Math.max(type.dimensionsDefault.largeur / type.dimensionsDefault.hauteur, 0.25), 2);
  const h = 56;
  const w = Math.max(24, Math.min(80, h * ratio));
  const hasTiroir = type.options.some((o) => o.slug === 'tiroir' && o.defaut > 0);
  const hasTringle = type.options.some((o) => o.slug === 'tringle');
  const hasVasque = type.options.some((o) => o.slug === 'vasque');
  return (
    <svg width={w + 8} height={h + 12} viewBox={`0 0 ${w + 8} ${h + 12}`} aria-hidden="true" className="flex-shrink-0">
      <rect x={4} y={hasVasque ? 10 : 6} width={w} height={h - (hasVasque ? 4 : 0)} rx={3} fill="#E8D9C3" stroke="#8B6F47" strokeWidth={1.5} />
      {hasVasque && <ellipse cx={4 + w / 2} cy={10} rx={w * 0.32} ry={4} fill="#fff" stroke="#8B6F47" strokeWidth={1.5} />}
      {hasTiroir &&
        [0, 1, 2].map((i) => (
          <line key={i} x1={6} y1={14 + i * ((h - 12) / 3)} x2={w + 2} y2={14 + i * ((h - 12) / 3)} stroke="#8B6F47" strokeWidth={1.2} />
        ))}
      {hasTringle && <line x1={6} y1={16} x2={w + 2} y2={16} stroke="#8B6F47" strokeWidth={2} />}
      {!hasTiroir && !hasTringle && !hasVasque && (
        <line x1={4 + w / 2} y1={8} x2={4 + w / 2} y2={h + 4} stroke="#8B6F47" strokeWidth={1.2} />
      )}
    </svg>
  );
}

export function ModulePicker({
  moduleTypes,
  universSlug,
  showPrices = false,
  onAdd,
  onClose,
}: {
  moduleTypes: ConfigurateurModuleType[];
  universSlug: string;
  showPrices?: boolean;
  onAdd: (type: ConfigurateurModuleType) => void;
  onClose: () => void;
}) {
  const available = moduleTypes
    .filter((t) => t.actif && t.univers.includes(universSlug))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-noir/45 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_24px_64px_-16px_rgba(43,43,43,0.35)] w-full max-w-lg max-h-[80vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-noir/8">
          <h2 className="font-display text-xl text-noir">Ajouter un module</h2>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-full hover:bg-beige/70 text-noir/55 hover:text-noir transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="p-4 space-y-2">
          {available.map((type) => (
            <li key={type.slug}>
              <button
                type="button"
                onClick={() => { onAdd(type); onClose(); }}
                className="w-full flex items-center gap-4 text-left p-4 rounded-xl border border-noir/10 hover:border-vert-foret hover:bg-vert-foret/5 transition-colors"
              >
                <ModuleThumb type={type} />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-noir text-sm">{type.nom}</span>
                  {type.description && <span className="block text-xs text-noir/60 mt-0.5">{type.description}</span>}
                  <span className="block text-xs text-bois-fonce font-medium mt-1">
                    {ZONE_LABELS[type.zone]}{showPrices ? ` · dès ${type.prixBase} € HT` : ''}
                  </span>
                </span>
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-vert-foret text-white flex items-center justify-center" aria-hidden="true">+</span>
              </button>
            </li>
          ))}
          {available.length === 0 && (
            <li className="text-center text-sm text-noir/55 py-8">Aucun module disponible pour cet univers.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
