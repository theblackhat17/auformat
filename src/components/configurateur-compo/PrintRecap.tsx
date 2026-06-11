'use client';

import type { CompositionConfig, CompositionPriceBreakdown, ConfigurateurMaterial, ConfigurateurModuleType, ConfigurateurUnivers } from '@/lib/types';
import { CompoCanvas } from './CompoCanvas';
import { getModuleType, formatEur } from './pricingCompo';

/**
 * Récapitulatif au format A4, rendu uniquement à l'impression (bouton « PDF »
 * → impression navigateur → « Enregistrer en PDF »). Les règles @media print
 * de globals.css masquent le reste de la page.
 */
export function PrintRecap({
  config,
  breakdown,
  moduleTypes,
  materials,
  univers,
  projectName,
  showPrices = false,
}: {
  config: CompositionConfig;
  breakdown: CompositionPriceBreakdown;
  moduleTypes: ConfigurateurModuleType[];
  materials: ConfigurateurMaterial[];
  univers?: ConfigurateurUnivers;
  projectName?: string | null;
  showPrices?: boolean;
}) {
  const mainMaterial = materials[config.materialIndex];

  return (
    <div data-print-recap className="hidden bg-white text-noir p-10" style={{ fontSize: '12px' }}>
      {/* En-tête */}
      <div className="flex items-baseline justify-between border-b-2 border-noir pb-4 mb-6">
        <div>
          <p className="font-display text-3xl">Au Format</p>
          <p className="text-noir/70">Agencement &amp; menuiserie sur mesure — auformat.com</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-base">{projectName || `${univers?.nom || 'Projet'} sur mesure`}</p>
          <p className="text-noir/70">Édité le {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Dessin */}
      <div className="mb-6">
        <CompoCanvas
          config={config}
          moduleTypes={moduleTypes}
          materials={materials}
          univers={univers}
          selectedId={null}
          onSelect={() => {}}
        />
      </div>

      {/* Détail des modules */}
      <table className="w-full border-collapse mb-6" style={{ fontSize: '11px' }}>
        <thead>
          <tr className="border-b border-noir text-left">
            <th className="py-1.5 pr-2">N°</th>
            <th className="py-1.5 pr-2">Module</th>
            <th className="py-1.5 pr-2">Dimensions (L×H×P mm)</th>
            <th className="py-1.5 pr-2">Matériau</th>
            <th className="py-1.5 pr-2">Détail</th>
            {showPrices && <th className="py-1.5 text-right">Total HT</th>}
          </tr>
        </thead>
        <tbody>
          {config.modules.map((mod, i) => {
            const type = getModuleType(moduleTypes, mod.typeSlug);
            if (!type) return null;
            const line = breakdown.moduleLines.find((l) => l.moduleId === mod.id);
            const material = materials[mod.materialIndex ?? config.materialIndex];
            const optsText = type.options
              .filter((o) => (mod.options[o.slug] ?? 0) > 0)
              .map((o) => (o.type === 'compteur' ? `${o.nom} ×${mod.options[o.slug]}` : o.nom))
              .join(', ');
            return (
              <tr key={mod.id} className="border-b border-noir/15 align-top">
                <td className="py-1.5 pr-2">{i + 1}</td>
                <td className="py-1.5 pr-2 font-semibold">{type.nom}</td>
                <td className="py-1.5 pr-2">{mod.largeur} × {mod.hauteur} × {mod.profondeur}</td>
                <td className="py-1.5 pr-2">{material?.name}</td>
                <td className="py-1.5 pr-2">{optsText || '—'}</td>
                {showPrices && <td className="py-1.5 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{line ? formatEur(line.total) : '—'}</td>}
              </tr>
            );
          })}
          {breakdown.planTravailLine && (
            <tr className="border-b border-noir/15">
              <td className="py-1.5" />
              <td className="py-1.5 pr-2 font-semibold" colSpan={4}>{breakdown.planTravailLine.label}</td>
              {showPrices && <td className="py-1.5 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEur(breakdown.planTravailLine.total)}</td>}
            </tr>
          )}
        </tbody>
      </table>

      {/* Totaux (mode estimation uniquement) */}
      {showPrices && (
        <div className="flex justify-end mb-8">
          <table style={{ fontSize: '12px' }}>
            <tbody>
              <tr><td className="pr-8 py-0.5 text-noir/70">Total HT</td><td className="text-right py-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEur(breakdown.subtotalHt)}</td></tr>
              <tr><td className="pr-8 py-0.5 text-noir/70">TVA 20 %</td><td className="text-right py-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEur(breakdown.tva)}</td></tr>
              <tr className="border-t border-noir"><td className="pr-8 py-1 font-bold text-base">Estimation TTC</td><td className="text-right py-1 font-bold text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEur(breakdown.totalTtc)}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-noir/60 border-t border-noir/20 pt-3" style={{ fontSize: '10px' }}>
        {showPrices
          ? 'Estimation indicative générée par le configurateur Au Format — '
          : 'Récapitulatif de votre projet généré par le configurateur Au Format (prix sur devis) — '}
        matériau principal : {mainMaterial?.name}.
        Le devis définitif est établi après étude par l&apos;atelier (prise de mesures, contraintes techniques, finitions).
        Au Format — Cysoing (Lille) &amp; La Calotterie (Côte d&apos;Opale) — auformat.com
      </p>
    </div>
  );
}
