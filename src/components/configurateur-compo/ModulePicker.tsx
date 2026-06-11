'use client';

import type { ConfigurateurModuleType, ConfigurateurUnivers } from '@/lib/types';

const ZONE_LABELS: Record<string, string> = {
  bas: 'Posé au sol',
  haut: 'Suspendu',
  colonne: 'Toute hauteur',
  ilot: 'Îlot (centre de pièce)',
};

/** Mini-aperçu schématique d'un type de module */
function ModuleThumb({ type }: { type: ConfigurateurModuleType }) {
  const ratio = Math.min(Math.max(type.dimensionsDefault.largeur / type.dimensionsDefault.hauteur, 0.25), 2.2);
  const h = 64;
  const w = Math.max(26, Math.min(96, h * ratio));
  const hasTiroir = type.options.some((o) => o.slug === 'tiroir' && o.defaut > 0);
  const hasTringle = type.options.some((o) => o.slug === 'tringle');
  const hasVasque = type.options.some((o) => o.slug === 'vasque');
  return (
    <svg width={w + 8} height={h + 12} viewBox={`0 0 ${w + 8} ${h + 12}`} aria-hidden="true" className="mx-auto">
      <rect x={4} y={hasVasque ? 10 : 6} width={w} height={h - (hasVasque ? 4 : 0)} rx={3} fill="#E8D9C3" stroke="#8B6F47" strokeWidth={1.5} />
      {hasVasque && <ellipse cx={4 + w / 2} cy={10} rx={w * 0.32} ry={4} fill="#fff" stroke="#8B6F47" strokeWidth={1.5} />}
      {hasTiroir &&
        [0, 1, 2].map((i) => (
          <line key={i} x1={6} y1={16 + i * ((h - 14) / 3)} x2={w + 2} y2={16 + i * ((h - 14) / 3)} stroke="#8B6F47" strokeWidth={1.2} />
        ))}
      {hasTringle && <line x1={6} y1={18} x2={w + 2} y2={18} stroke="#8B6F47" strokeWidth={2} />}
      {!hasTiroir && !hasTringle && !hasVasque && (
        <line x1={4 + w / 2} y1={8} x2={4 + w / 2} y2={h + 4} stroke="#8B6F47" strokeWidth={1.2} />
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
