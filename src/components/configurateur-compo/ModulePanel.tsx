'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { CompositionConfig, CompositionModule, ConfigurateurMaterial, ConfigurateurModuleType, ConfigurateurUnivers } from '@/lib/types';
import { HAUT_BOTTOM_DEFAULT, shelfPositions } from './CompoCanvas';

type DimField = 'largeur' | 'hauteur' | 'profondeur';
const DIM_LABELS: Record<DimField, string> = { largeur: 'Largeur', hauteur: 'Hauteur', profondeur: 'Profondeur' };

/** Champ numérique saisissable au clavier : on tape librement, la valeur est bornée à la validation (Entrée ou sortie du champ). */
function NumField({ value, min, max, onCommit, ariaLabel, className }: { value: number; min: number; max: number; onCommit: (v: number) => void; ariaLabel: string; className?: string }) {
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(String(value)); }, [value, editing]);
  const commit = () => {
    setEditing(false);
    const n = Number(text.replace(',', '.'));
    if (isFinite(n)) onCommit(Math.min(max, Math.max(min, Math.round(n))));
    else setText(String(value));
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      value={text}
      onFocus={() => setEditing(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={className || 'w-20 px-2 py-1 text-right border border-noir/20 rounded-md text-sm focus:outline-none focus:border-vert-foret'}
    />
  );
}

function MaterialSwatches({
  materials,
  value,
  onChange,
  allowInherit,
  showPrices,
}: {
  materials: ConfigurateurMaterial[];
  value: number | null;
  onChange: (index: number | null) => void;
  allowInherit?: boolean;
  showPrices?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowInherit && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          title="Matériau principal de la composition"
          className={`px-3 h-9 rounded-full text-xs font-semibold border transition-colors ${
            value === null ? 'border-vert-foret bg-vert-foret/10 text-vert-foret' : 'border-noir/20 text-noir/70 hover:border-noir/50'
          }`}
        >
          Principal
        </button>
      )}
      {materials.map((m, i) => (
        <span key={m.name} className="relative group/swatch">
          <button
            type="button"
            onClick={() => onChange(i)}
            aria-pressed={value === i}
            aria-label={m.name}
            className={`relative block w-11 h-11 rounded-lg border-2 overflow-hidden transition-transform ${
              value === i ? 'border-vert-foret scale-110 shadow-md' : 'border-noir/15 hover:scale-105'
            }`}
            style={{ backgroundColor: m.colorHex }}
          >
            {/* Veinage suggéré pour les décors bois */}
            {m.renderType === 'bois' && (
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: `repeating-linear-gradient(100deg, transparent 0 3px, ${m.grainHex || '#8B6F47'}33 3px 4px, transparent 4px 9px)` }}
              />
            )}
            {!m.renderType && m.image && <Image src={m.image} alt="" fill sizes="44px" className="object-cover" />}
          </button>
          {/* Nom au survol */}
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 rounded-md bg-noir text-white text-[11px] whitespace-nowrap opacity-0 group-hover/swatch:opacity-100 transition-opacity z-20">
            {m.name}{showPrices ? ` · ${m.prixM2} €/m²` : ''}
          </span>
        </span>
      ))}
    </div>
  );
}

function Counter({ label, value, max, onChange, hint }: { label: string; value: number; max: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-noir">{label}</p>
        {hint && <p className="text-xs text-noir/55">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          aria-label={`Retirer ${label}`}
          className="w-8 h-8 rounded-full border border-noir/20 text-noir flex items-center justify-center hover:border-noir disabled:opacity-30 transition-colors"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Ajouter ${label}`}
          className="w-8 h-8 rounded-full border border-noir/20 text-noir flex items-center justify-center hover:border-noir disabled:opacity-30 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-noir">{label}</p>
        {hint && <p className="text-xs text-noir/55">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${value ? 'bg-vert-foret' : 'bg-noir/20'}`}
      >
        <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transform transition-transform ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export function ModulePanel({
  module: mod,
  type,
  config,
  materials,
  moduleCount,
  totalWidth,
  showPrices,
  onDim,
  onMaterial,
  onOption,
  onMove,
  onDuplicate,
  onRemove,
  onPos,
  onEcart,
  onTiroirsHauteur,
  onEtagerePos,
}: {
  module: CompositionModule;
  type: ConfigurateurModuleType;
  config: CompositionConfig;
  materials: ConfigurateurMaterial[];
  moduleCount: number;
  totalWidth: number;
  showPrices: boolean;
  onDim: (field: DimField, value: number) => void;
  onMaterial: (index: number | null) => void;
  onOption: (slug: string, value: number) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onPos: (posX: number | null, posY: number | null) => void;
  onEcart: (value: number) => void;
  onTiroirsHauteur: (value: number | null) => void;
  onEtagerePos: (index: number, value: number | null) => void;
}) {
  const isFree = type.zone === 'haut';
  const posX = mod.posX ?? 0;
  const posY = mod.posY ?? HAUT_BOTTOM_DEFAULT;
  const nbTiroirs = mod.options['tiroir'] ?? 0;
  const nbEtageres = mod.options['etagere'] ?? 0;
  const shelfYs = shelfPositions(mod, mod.hauteur);
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="font-display text-lg text-noir">{type.nom}</h3>
          {type.description && <p className="text-xs text-noir/60 mt-0.5">{type.description}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isFree && (
            <>
              <button type="button" onClick={() => onMove(-1)} aria-label="Déplacer à gauche" className="w-8 h-8 rounded-full border border-noir/15 text-noir/70 hover:border-noir flex items-center justify-center transition-colors">←</button>
              <button type="button" onClick={() => onMove(1)} aria-label="Déplacer à droite" className="w-8 h-8 rounded-full border border-noir/15 text-noir/70 hover:border-noir flex items-center justify-center transition-colors">→</button>
            </>
          )}
          <button type="button" onClick={onDuplicate} aria-label="Dupliquer le module" title="Dupliquer" className="w-8 h-8 rounded-full border border-noir/15 text-noir/70 hover:border-noir flex items-center justify-center transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={moduleCount <= 1}
            aria-label="Supprimer le module"
            title="Supprimer"
            className="w-8 h-8 rounded-full border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-30 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Dimensions */}
      <div className="mt-4 space-y-3">
        {(['largeur', 'hauteur', 'profondeur'] as DimField[]).map((field) => (
          <div key={field}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-noir">{DIM_LABELS[field]}</label>
              <span className="text-sm tabular-nums text-noir/70">
                <NumField
                  value={mod[field]}
                  min={type.dimensionsMin[field]}
                  max={type.dimensionsMax[field]}
                  onCommit={(v) => onDim(field, v)}
                  ariaLabel={`${DIM_LABELS[field]} en millimètres`}
                /> mm
              </span>
            </div>
            <input
              type="range"
              aria-label={`${DIM_LABELS[field]} en millimètres`}
              value={mod[field]}
              min={type.dimensionsMin[field]}
              max={type.dimensionsMax[field]}
              step={10}
              onChange={(e) => onDim(field, Number(e.target.value))}
              className="w-full accent-vert-foret"
            />
          </div>
        ))}
      </div>

      {/* Position libre des modules suspendus */}
      {isFree && (
        <div className="mt-5 p-4 bg-beige/60 rounded-xl">
          <p className="text-sm font-medium text-noir mb-1">Position du module</p>
          <p className="text-xs text-noir/60 mb-3">Glissez-le directement sur le dessin, ou réglez finement ici.</p>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="pos-x" className="text-xs font-medium text-noir/80">Position horizontale</label>
                <span className="text-xs tabular-nums text-noir/70">{posX} mm</span>
              </div>
              <input
                id="pos-x"
                type="range"
                min={0}
                max={Math.max(totalWidth - mod.largeur + 200, 200)}
                step={10}
                value={posX}
                onChange={(e) => onPos(Number(e.target.value), posY)}
                className="w-full accent-vert-foret"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="pos-y" className="text-xs font-medium text-noir/80">Hauteur de pose (bas du module)</label>
                <span className="text-xs tabular-nums text-noir/70">{posY} mm</span>
              </div>
              <input
                id="pos-y"
                type="range"
                min={100}
                max={2400}
                step={10}
                value={posY}
                onChange={(e) => onPos(posX, Number(e.target.value))}
                className="w-full accent-vert-foret"
              />
            </div>
          </div>
        </div>
      )}

      {/* Décalage dans la rangée (modules posés) */}
      {!isFree && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-noir">Écart à gauche</label>
            <span className="text-sm tabular-nums text-noir/70">
              <NumField value={mod.ecartGauche || 0} min={0} max={3000} onCommit={onEcart} ariaLabel="Écart à gauche en millimètres" /> mm
            </span>
          </div>
          <input type="range" min={0} max={1500} step={10} value={mod.ecartGauche || 0} onChange={(e) => onEcart(Number(e.target.value))} className="w-full accent-vert-foret" aria-label="Écart à gauche" />
          <p className="text-xs text-noir/55 mt-0.5">Décale ce module dans la rangée — glissez-le aussi directement sur le dessin.</p>
        </div>
      )}

      {/* Hauteur de la zone tiroirs */}
      {nbTiroirs > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-noir">Hauteur de la zone tiroirs</label>
            <span className="text-sm tabular-nums text-noir/70">
              {mod.tiroirsHauteur != null ? (
                <NumField value={mod.tiroirsHauteur} min={120} max={mod.hauteur} onCommit={(v) => onTiroirsHauteur(v)} ariaLabel="Hauteur de la zone tiroirs" />
              ) : (
                <button type="button" onClick={() => onTiroirsHauteur(Math.round(mod.hauteur * 0.4))} className="text-xs font-semibold text-vert-foret hover:underline">Auto — régler</button>
              )}
              {mod.tiroirsHauteur != null && ' mm'}
            </span>
          </div>
          {mod.tiroirsHauteur != null && (
            <>
              <input type="range" min={120} max={mod.hauteur} step={10} value={mod.tiroirsHauteur} onChange={(e) => onTiroirsHauteur(Number(e.target.value))} className="w-full accent-vert-foret" aria-label="Hauteur de la zone tiroirs" />
              <button type="button" onClick={() => onTiroirsHauteur(null)} className="text-xs text-noir/55 hover:text-noir underline">Revenir en automatique</button>
            </>
          )}
        </div>
      )}

      {/* Position des étagères */}
      {nbEtageres > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-noir mb-1.5">Position des étagères <span className="text-xs text-noir/55 font-normal">(mm depuis le bas)</span></p>
          <div className="flex flex-wrap gap-2">
            {shelfYs.map((y, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs text-noir/70">
                n°{i + 1}
                <NumField
                  value={Math.round(y)}
                  min={80}
                  max={mod.hauteur - 80}
                  onCommit={(v) => onEtagerePos(i, v)}
                  ariaLabel={`Position de l'étagère ${i + 1}`}
                  className="w-16 px-1.5 py-1 text-right border border-noir/20 rounded-md text-xs focus:outline-none focus:border-vert-foret"
                />
              </span>
            ))}
            {mod.etageresPos?.some((p) => p != null) && (
              <button type="button" onClick={() => shelfYs.forEach((_, i) => onEtagerePos(i, null))} className="text-xs text-noir/55 hover:text-noir underline">
                Répartir automatiquement
              </button>
            )}
          </div>
        </div>
      )}

      {/* Matériau du module */}
      <div className="mt-5">
        <p className="text-sm font-medium text-noir mb-2">Matériau de ce module</p>
        <MaterialSwatches materials={materials} value={mod.materialIndex} onChange={onMaterial} allowInherit showPrices={showPrices} />
        <p className="text-xs text-noir/55 mt-1.5">
          {mod.materialIndex === null
            ? `Suit le matériau principal (${materials[config.materialIndex]?.name || '—'})`
            : materials[mod.materialIndex]?.name}
        </p>
      </div>

      {/* Options */}
      {type.options.length > 0 && (
        <div className="mt-5 divide-y divide-noir/8 border-t border-noir/8">
          {type.options
            .filter((o) => o.type !== 'choix')
            .map((opt) =>
              opt.type === 'toggle' ? (
                <Toggle
                  key={opt.slug}
                  label={opt.nom}
                  hint={showPrices && opt.prix > 0 ? `+ ${opt.prix} € HT` : undefined}
                  value={(mod.options[opt.slug] ?? 0) > 0}
                  onChange={(v) => onOption(opt.slug, v ? 1 : 0)}
                />
              ) : (
                <Counter
                  key={opt.slug}
                  label={opt.nom}
                  hint={showPrices && opt.prix > 0 ? `${opt.prix} € HT / unité` : undefined}
                  value={mod.options[opt.slug] ?? 0}
                  max={opt.max ?? 10}
                  onChange={(v) => onOption(opt.slug, v)}
                />
              )
            )}

          {/* Groupes de choix exclusifs (ex. style de poignée) */}
          {Array.from(new Set(type.options.filter((o) => o.type === 'choix').map((o) => o.groupe || 'choix'))).map((groupe) => {
            const members = type.options.filter((o) => o.type === 'choix' && (o.groupe || 'choix') === groupe);
            const groupLabels: Record<string, string> = { poignee: 'Style de poignées', sens_ouverture: "Sens d'ouverture (porte seule)" };
            return (
              <div key={groupe} className="py-2.5">
                <p className="text-sm font-medium text-noir mb-2">{groupLabels[groupe] || 'Finition'}</p>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={groupLabels[groupe] || groupe}>
                  {members.map((opt) => {
                    const active = (mod.options[opt.slug] ?? 0) > 0;
                    return (
                      <button
                        key={opt.slug}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          for (const m of members) onOption(m.slug, m.slug === opt.slug ? 1 : 0);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          active ? 'bg-noir text-white border-noir' : 'bg-transparent text-noir border-noir/20 hover:border-noir'
                        }`}
                      >
                        {opt.nom}{showPrices && opt.prix > 0 ? ` (+${opt.prix} €)` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GlobalPanel({
  config,
  univers,
  materials,
  totalWidth,
  showPrices,
  onGlobalMaterial,
  onPlanTravail,
  onFacadeCoulissante,
  onFacadeVantaux,
  onPlanMaterial,
  onPlintheMaterial,
  onLineaireMax,
  onPlanDims,
}: {
  config: CompositionConfig;
  univers?: ConfigurateurUnivers;
  materials: ConfigurateurMaterial[];
  totalWidth: number;
  showPrices: boolean;
  onGlobalMaterial: (index: number) => void;
  onPlanTravail: (value: boolean) => void;
  onFacadeCoulissante: (value: boolean) => void;
  onFacadeVantaux: (value: number) => void;
  onPlanMaterial: (index: number | null) => void;
  onPlintheMaterial: (index: number | null) => void;
  onLineaireMax: (value: number | null) => void;
  onPlanDims: (dims: { debord?: number; epaisseur?: number }) => void;
}) {
  const overMax = config.lineaireMax ? totalWidth > config.lineaireMax : false;
  const hasBas = true; // les plinthes concernent les modules posés ; le sélecteur reste simple
  return (
    <div>
      <h3 className="font-display text-lg text-noir mb-1">Réglages de la composition</h3>
      <p className="text-xs text-noir/60 mb-4">Cliquez sur un module du dessin pour le configurer individuellement.</p>

      <p className="text-sm font-medium text-noir mb-2">Matériau principal</p>
      <MaterialSwatches materials={materials} value={config.materialIndex} onChange={(i) => onGlobalMaterial(i ?? 0)} showPrices={showPrices} />
      <p className="text-xs text-noir/55 mt-1.5">
        {materials[config.materialIndex]?.name}{showPrices ? ` — ${materials[config.materialIndex]?.prixM2} €/m²` : ''}
      </p>

      {/* Plinthes */}
      {hasBas && (
        <div className="mt-4">
          <p className="text-sm font-medium text-noir mb-2">Matériau des plinthes</p>
          <MaterialSwatches materials={materials} value={config.plintheMaterialIndex ?? null} onChange={onPlintheMaterial} allowInherit />
          <p className="text-xs text-noir/55 mt-1.5">
            {config.plintheMaterialIndex != null ? materials[config.plintheMaterialIndex]?.name : 'Assorties au matériau de chaque module (teinte foncée)'}
          </p>
        </div>
      )}

      {/* Largeur de mur disponible */}
      <div className="mt-5 pt-4 border-t border-noir/8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-noir">Largeur de mur disponible</p>
            <p className="text-xs text-noir/55">Le dessin vous alerte si la composition dépasse.</p>
          </div>
          <span className="text-sm tabular-nums text-noir/70 flex-shrink-0">
            <input
              type="number"
              aria-label="Largeur de mur disponible en millimètres"
              value={config.lineaireMax ?? ''}
              placeholder="—"
              min={300}
              step={10}
              onChange={(e) => onLineaireMax(e.target.value ? Number(e.target.value) : null)}
              className="w-24 px-2 py-1 text-right border border-noir/20 rounded-md text-sm focus:outline-none focus:border-vert-foret"
            /> mm
          </span>
        </div>
        {overMax && (
          <p className="text-xs text-red-700 font-medium mt-2">
            Votre composition ({totalWidth} mm) dépasse le mur de {totalWidth - (config.lineaireMax || 0)} mm.
          </p>
        )}
      </div>

      {(univers?.planTravail?.disponible || univers?.facadeCoulissante?.disponible) && (
        <div className="mt-2 border-t border-noir/8 divide-y divide-noir/8">
          {univers?.planTravail?.disponible && (
            <>
              <Toggle
                label="Plan de travail"
                hint={showPrices ? `${univers.planTravail.prixMl} € HT / mètre linéaire, posé sur les modules bas` : 'Posé sur les modules bas et l\'îlot'}
                value={config.planTravail}
                onChange={onPlanTravail}
              />
              {config.planTravail && (
                <div className="py-3">
                  <p className="text-sm font-medium text-noir mb-2">Matériau du plan de travail</p>
                  <MaterialSwatches materials={materials} value={config.planMaterialIndex ?? null} onChange={onPlanMaterial} allowInherit />
                  <p className="text-xs text-noir/55 mt-1.5 mb-3">
                    {config.planMaterialIndex != null ? materials[config.planMaterialIndex]?.name : 'Assorti au matériau principal (teinte foncée)'}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-noir/80">Débord</label>
                        <span className="text-xs tabular-nums text-noir/70">
                          <NumField value={config.planDebord ?? 20} min={0} max={400} onCommit={(v) => onPlanDims({ debord: v })} ariaLabel="Débord du plan de travail" className="w-14 px-1.5 py-1 text-right border border-noir/20 rounded-md text-xs focus:outline-none focus:border-vert-foret" /> mm
                        </span>
                      </div>
                      <input type="range" min={0} max={400} step={10} value={config.planDebord ?? 20} onChange={(e) => onPlanDims({ debord: Number(e.target.value) })} className="w-full accent-vert-foret" aria-label="Débord du plan de travail" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-noir/80">Épaisseur</label>
                        <span className="text-xs tabular-nums text-noir/70">
                          <NumField value={config.planEpaisseur ?? 40} min={20} max={100} onCommit={(v) => onPlanDims({ epaisseur: v })} ariaLabel="Épaisseur du plan de travail" className="w-14 px-1.5 py-1 text-right border border-noir/20 rounded-md text-xs focus:outline-none focus:border-vert-foret" /> mm
                        </span>
                      </div>
                      <input type="range" min={20} max={100} step={5} value={config.planEpaisseur ?? 40} onChange={(e) => onPlanDims({ epaisseur: Number(e.target.value) })} className="w-full accent-vert-foret" aria-label="Épaisseur du plan de travail" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {univers?.facadeCoulissante?.disponible && (
            <>
              <Toggle
                label="Façade coulissante d'ensemble"
                hint={showPrices ? `${univers.facadeCoulissante.prixMl} € HT / ml — portes coulissantes devant tout le dressing` : 'Portes coulissantes devant tout le dressing'}
                value={config.facadeCoulissante ?? false}
                onChange={onFacadeCoulissante}
              />
              {config.facadeCoulissante && (
                <Counter
                  label="Nombre de vantaux"
                  hint="De 2 à 4 portes coulissantes"
                  value={Math.min(4, Math.max(2, config.facadeVantaux ?? 2))}
                  max={4}
                  onChange={(v) => onFacadeVantaux(Math.max(2, v))}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
