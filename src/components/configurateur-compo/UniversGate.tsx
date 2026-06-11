'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { CompositionConfig, ConfigurateurSettings, ConfigurateurUnivers } from '@/lib/types';
import { createStarterConfig } from './useComposition';
import { AssistantModal } from './AssistantModal';

/* Pictogrammes d'univers — trait 1.5, jamais d'emoji */
function UniversIcon({ slug }: { slug: string }) {
  const common = { className: 'w-10 h-10', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (slug === 'cuisine') {
    return (
      <svg viewBox="0 0 48 48" {...common}>
        <rect x="6" y="22" width="36" height="18" rx="1.5" />
        <path d="M6 28h36M18 22v18M30 22v18M10 33h4M22 33h4M34 33h4" />
        <path d="M14 22v-8h8l-2 8M30 14a4 4 0 0 1 8 0v8" />
      </svg>
    );
  }
  if (slug === 'dressing') {
    return (
      <svg viewBox="0 0 48 48" {...common}>
        <rect x="8" y="6" width="32" height="36" rx="1.5" />
        <path d="M24 6v36M8 16h16M12 11v2M30 24c0-2 1.5-3 3-3s3 1 3 3-3 2-3 5M33 33v.5" />
        <path d="M11 22c2 2 8 2 10 0M11 30c2 2 8 2 10 0" />
      </svg>
    );
  }
  if (slug === 'salle_de_bain') {
    return (
      <svg viewBox="0 0 48 48" {...common}>
        <rect x="8" y="24" width="32" height="14" rx="1.5" />
        <path d="M8 30h32M16 34h4M28 34h4" />
        <ellipse cx="24" cy="24" rx="8" ry="3" />
        <path d="M28 21v-7h-6v2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" {...common}>
      <rect x="10" y="8" width="28" height="32" rx="1.5" />
      <path d="M10 20h28M10 30h28M24 20v20" />
    </svg>
  );
}

export function UniversGate({
  settings,
  hasDraft,
  onResumeDraft,
  onStart,
}: {
  settings: ConfigurateurSettings;
  hasDraft: boolean;
  onResumeDraft: () => void;
  onStart: (config: CompositionConfig) => void;
}) {
  const universList = (settings.univers || []).filter((u) => u.actif).sort((a, b) => a.sortOrder - b.sortOrder);
  const materials = settings.materials || [];
  const showPrices = settings.pricing_mode === 'estimation';
  const [chosen, setChosen] = useState<ConfigurateurUnivers | null>(null);
  const [materialIndex, setMaterialIndex] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="min-h-screen bg-beige/40">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="text-center mb-10">
          <h1 className="font-display text-[clamp(1.75rem,2.5vw+0.75rem,2.75rem)] leading-[1.12] text-noir mb-3">
            {settings.labels?.titre || 'Configurateur sur mesure'}
          </h1>
          <p className="text-noir/70 max-w-xl mx-auto">
            {showPrices
              ? 'Composez votre agencement complet, enregistrez-le dans votre espace et recevez une estimation immédiate.'
              : 'Composez votre agencement complet, enregistrez-le dans votre espace et recevez votre devis gratuit sous 48h.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {settings.ai_enabled && !chosen && (
              <button onClick={() => setAssistantOpen(true)} className="btn-primary !py-2.5 text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                </svg>
                Décrire mon projet à l&apos;assistant
              </button>
            )}
            {hasDraft && !chosen && (
              <button onClick={onResumeDraft} className="btn-secondary !py-2.5 text-sm">
                Reprendre ma composition en cours
              </button>
            )}
          </div>
        </div>

        {!chosen ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {universList.map((u, i) => (
              <button
                key={u.slug}
                onClick={() => setChosen(u)}
                style={{ ['--rise-delay' as string]: `${i * 70}ms` }}
                className="animate-hero-rise group text-left bg-white rounded-2xl ring-1 ring-noir/8 p-6 hover:ring-vert-foret hover:ring-2 transition-all card-lift"
              >
                <span className="inline-flex w-16 h-16 rounded-full bg-beige text-bois-fonce items-center justify-center mb-4 group-hover:bg-vert-foret group-hover:text-white transition-colors">
                  <UniversIcon slug={u.slug} />
                </span>
                <h2 className="font-display text-xl text-noir mb-1.5">{u.nom}</h2>
                <p className="text-sm text-noir/65 leading-relaxed">{u.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="max-w-xl mx-auto bg-white rounded-2xl ring-1 ring-noir/8 p-7 animate-scale-in">
            <button onClick={() => setChosen(null)} className="text-sm text-noir/60 hover:text-noir transition-colors mb-4 inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
              Changer d&apos;univers
            </button>
            <h2 className="font-display text-2xl text-noir mb-1">{chosen.nom} sur mesure</h2>
            <p className="text-sm text-noir/65 mb-6">
              Choisissez votre matériau principal — chaque module pourra ensuite avoir le sien.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-2">
              {materials.map((m, i) => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => setMaterialIndex(i)}
                  aria-pressed={materialIndex === i}
                  className={`relative rounded-xl border-2 overflow-hidden text-left transition-all ${materialIndex === i ? 'border-vert-foret shadow-md' : 'border-noir/10 hover:border-noir/30'}`}
                >
                  <span className="block relative aspect-[4/3]" style={{ backgroundColor: m.colorHex }}>
                    {m.image && <Image src={m.image} alt="" fill sizes="120px" className="object-cover" />}
                    {materialIndex === i && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-vert-foret text-white flex items-center justify-center">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
                      </span>
                    )}
                  </span>
                  <span className="block px-2 py-1.5 text-[11px] leading-tight font-semibold text-noir truncate">{m.name}</span>
                </button>
              ))}
            </div>
            <p className="text-sm text-noir/70 mb-7">
              {materials[materialIndex]?.name}{showPrices ? ` — ${materials[materialIndex]?.prixM2} €/m²` : ''}
            </p>
            <button
              onClick={() => onStart(createStarterConfig(chosen, settings.module_types || [], materialIndex))}
              className="btn-primary w-full"
            >
              Commencer ma composition
            </button>
            <p className="text-xs text-noir/55 text-center mt-3">
              Une composition type vous est proposée pour démarrer : tout est modifiable.
            </p>
          </div>
        )}
      </div>

      {assistantOpen && (
        <AssistantModal
          onResult={(config) => onStart(config)}
          onClose={() => setAssistantOpen(false)}
        />
      )}
    </div>
  );
}
