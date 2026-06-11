'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { CompositionConfig, ConfigurateurSettings } from '@/lib/types';
import { CompoCanvas, layoutModules } from '@/components/configurateur-compo/CompoCanvas';
import { computeCompositionPrice, formatEur } from '@/components/configurateur-compo/pricingCompo';
import { PrintRecap } from '@/components/configurateur-compo/PrintRecap';
import { COMPO_DRAFT_KEY } from '@/components/configurateur-compo/ConfigurateurCompo';

export function ShareClient({ name, config, settings }: { name: string; config: CompositionConfig; settings: ConfigurateurSettings }) {
  const router = useRouter();
  const moduleTypes = settings.module_types || [];
  const materials = settings.materials || [];
  const univers = (settings.univers || []).find((u) => u.slug === config.univers);

  const breakdown = useMemo(
    () => computeCompositionPrice(config, moduleTypes, materials, univers),
    [config, moduleTypes, materials, univers]
  );
  const { totalWidth } = useMemo(() => layoutModules(config, moduleTypes), [config, moduleTypes]);

  function handleCustomize() {
    try {
      localStorage.setItem(
        COMPO_DRAFT_KEY,
        JSON.stringify({ config, projectId: null, projectName: `${name} (copie)`, savedAt: new Date().toISOString() })
      );
    } catch { /* stockage indisponible : on ouvre quand même le configurateur */ }
    router.push('/configurateur?reprendre=1');
  }

  return (
    <div className="min-h-screen bg-beige/40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-bois-fonce mb-2">Projet partagé · Configurateur Au Format</p>
          <h1 className="font-display text-3xl text-noir">{name}</h1>
          <p className="text-sm text-noir/60 mt-2">
            {config.modules.length} module{config.modules.length > 1 ? 's' : ''} · {(totalWidth / 1000).toFixed(2).replace('.', ',')} m linéaire · {univers?.nom}
          </p>
        </div>

        <div className="bg-white rounded-2xl ring-1 ring-noir/8 p-4 sm:p-6 mb-6">
          <CompoCanvas
            config={config}
            moduleTypes={moduleTypes}
            materials={materials}
            univers={univers}
            selectedId={null}
            onSelect={() => {}}
          />
        </div>

        <div className="bg-noir text-white rounded-2xl p-6 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            {settings.pricing_mode === 'estimation' ? (
              <>
                <p className="text-sm text-white/75">Estimation TTC</p>
                <p className="font-display text-3xl" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEur(breakdown.totalTtc)}</p>
                <p className="text-xs text-white/55 mt-1">Indicative — devis définitif après étude par l&apos;atelier.</p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl">Prix sur devis</p>
                <p className="text-xs text-white/55 mt-1">Chiffrage gratuit par l&apos;atelier sous 48h.</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => window.print()} className="btn-on-dark !py-2.5 text-sm">
              Télécharger en PDF
            </button>
            <button onClick={handleCustomize} className="btn-ghost-dark !py-2.5 text-sm">
              Personnaliser ce projet
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-noir/60">
          Envie du vôtre&nbsp;? <a href="/configurateur" className="text-vert-foret font-semibold hover:underline">Composez votre agencement sur mesure</a> — estimation immédiate, devis gratuit.
        </p>
      </div>

      <PrintRecap
        config={config}
        breakdown={breakdown}
        moduleTypes={moduleTypes}
        materials={materials}
        univers={univers}
        projectName={name}
        showPrices={settings.pricing_mode === 'estimation'}
      />
    </div>
  );
}
