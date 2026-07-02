'use client';

import { useState, useEffect } from 'react';
import type { ConfigurateurModuleType, ConfigurateurModuleOption, ConfigurateurUnivers, ModuleZone } from '@/lib/types';
import { ModuleThumb, ZONE_LABELS } from '@/components/configurateur-compo/ModulePicker';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret';
const numCls = 'w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret';

const ZONES: { value: ModuleZone; label: string }[] = [
  { value: 'bas', label: 'Posé au sol' },
  { value: 'haut', label: 'Suspendu' },
  { value: 'colonne', label: 'Toute hauteur' },
];

export function UniversModulesTab({
  univers,
  moduleTypes,
  onUniversChange,
  onModulesChange,
  onSaveUnivers,
  onSaveModules,
  saving,
}: {
  univers: ConfigurateurUnivers[];
  moduleTypes: ConfigurateurModuleType[];
  onUniversChange: (u: ConfigurateurUnivers[]) => void;
  onModulesChange: (m: ConfigurateurModuleType[]) => void;
  onSaveUnivers: () => void;
  onSaveModules: () => void;
  saving: boolean;
}) {
  const [openModule, setOpenModule] = useState<string | null>(null);

  // Recherche admin : cibler « modules » ouvre le premier module pour révéler ses réglages (socle, dimensions…)
  useEffect(() => {
    const onFocus = (e: Event) => {
      const key = (e as CustomEvent<string>).detail;
      if (key === 'modules') setOpenModule((cur) => cur ?? moduleTypes[0]?.slug ?? null);
    };
    window.addEventListener('admin-focus', onFocus);
    return () => window.removeEventListener('admin-focus', onFocus);
  }, [moduleTypes]);

  const patchUnivers = (slug: string, patch: Partial<ConfigurateurUnivers>) =>
    onUniversChange(univers.map((u) => (u.slug === slug ? { ...u, ...patch } : u)));

  const patchModule = (slug: string, patch: Partial<ConfigurateurModuleType>) =>
    onModulesChange(moduleTypes.map((m) => (m.slug === slug ? { ...m, ...patch } : m)));

  const patchOption = (modSlug: string, idx: number, patch: Partial<ConfigurateurModuleOption>) => {
    const mod = moduleTypes.find((m) => m.slug === modSlug);
    if (!mod) return;
    const options = mod.options.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    patchModule(modSlug, { options });
  };

  const addModule = () => {
    const slug = `module_${Date.now()}`;
    onModulesChange([
      ...moduleTypes,
      {
        slug,
        nom: 'Nouveau module',
        univers: univers[0] ? [univers[0].slug] : [],
        zone: 'colonne',
        description: '',
        dimensionsDefault: { largeur: 600, hauteur: 2000, profondeur: 500 },
        dimensionsMin: { largeur: 100, hauteur: 100, profondeur: 100 },
        dimensionsMax: { largeur: 2800, hauteur: 2800, profondeur: 2800 },
        prixBase: 200,
        options: [],
        actif: true,
        sortOrder: (moduleTypes[moduleTypes.length - 1]?.sortOrder ?? 0) + 1,
      },
    ]);
    setOpenModule(slug);
  };

  return (
    <div className="space-y-8">
      {/* ── Univers ── */}
      <section data-focus="univers">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Univers d&apos;agencement</h2>
            <p className="text-sm text-gray-500">Les familles proposées à l&apos;entrée du configurateur (cuisine, dressing…).</p>
          </div>
          <button onClick={onSaveUnivers} disabled={saving} className="px-4 py-2 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50">
            Enregistrer les univers
          </button>
        </div>
        <div className="space-y-3">
          {univers.map((u) => (
            <div key={u.slug} className="border border-gray-200 rounded-lg p-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
                  <input value={u.nom} onChange={(e) => patchUnivers(u.slug, { nom: e.target.value })} className={inputCls} />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                    <input type="checkbox" checked={u.actif} onChange={(e) => patchUnivers(u.slug, { actif: e.target.checked })} className="accent-vert-foret w-4 h-4" />
                    Actif
                  </label>
                  {u.planTravail && (
                    <>
                      <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                        <input
                          type="checkbox"
                          checked={u.planTravail.disponible}
                          onChange={(e) => patchUnivers(u.slug, { planTravail: { ...u.planTravail!, disponible: e.target.checked } })}
                          className="accent-vert-foret w-4 h-4"
                        />
                        Plan de travail
                      </label>
                      {u.planTravail.disponible && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">€ HT / ml</label>
                          <input
                            type="number"
                            value={u.planTravail.prixMl}
                            onChange={(e) => patchUnivers(u.slug, { planTravail: { ...u.planTravail!, prixMl: Number(e.target.value) || 0 } })}
                            className={numCls}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Façade coulissante : disponibilité, prix au ml, nombre maxi de vantaux */}
                <div className="sm:col-span-2 flex flex-wrap items-end gap-4 border-t border-gray-100 pt-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                    <input
                      type="checkbox"
                      checked={u.facadeCoulissante?.disponible ?? false}
                      onChange={(e) => patchUnivers(u.slug, { facadeCoulissante: { prixMl: 220, maxVantaux: 3, ...u.facadeCoulissante, disponible: e.target.checked } })}
                      className="accent-vert-foret w-4 h-4"
                    />
                    Façade coulissante
                  </label>
                  {u.facadeCoulissante?.disponible && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">€ HT / ml</label>
                        <input
                          type="number"
                          value={u.facadeCoulissante.prixMl}
                          onChange={(e) => patchUnivers(u.slug, { facadeCoulissante: { ...u.facadeCoulissante!, prixMl: Number(e.target.value) || 0 } })}
                          className={numCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Vantaux max (1–6)</label>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={u.facadeCoulissante.maxVantaux ?? 3}
                          onChange={(e) => patchUnivers(u.slug, { facadeCoulissante: { ...u.facadeCoulissante!, maxVantaux: Math.min(6, Math.max(1, Number(e.target.value) || 1)) } })}
                          className={numCls}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <input value={u.description} onChange={(e) => patchUnivers(u.slug, { description: e.target.value })} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Modules de départ (dans l&apos;ordre)</label>
                  <select
                    multiple
                    value={u.starterModules}
                    onChange={(e) => patchUnivers(u.slug, { starterModules: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                    className={`${inputCls} h-28`}
                  >
                    {moduleTypes.filter((m) => m.univers.includes(u.slug)).map((m) => (
                      <option key={m.slug} value={m.slug}>{m.nom}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Ctrl/Cmd + clic pour sélectionner plusieurs modules.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modules ── */}
      <section data-focus="modules">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Modules ({moduleTypes.length})</h2>
            <p className="text-sm text-gray-500">Les briques que le client assemble : caissons, colonnes, penderies…</p>
          </div>
          <div className="flex gap-2">
            <button onClick={addModule} className="px-4 py-2 border border-vert-foret text-vert-foret text-sm font-medium rounded-lg hover:bg-vert-foret hover:text-white transition-colors">
              + Nouveau module
            </button>
            <button onClick={onSaveModules} disabled={saving} className="px-4 py-2 bg-vert-foret text-white text-sm font-medium rounded-lg hover:bg-vert-foret-dark transition-colors disabled:opacity-50">
              Enregistrer les modules
            </button>
          </div>
        </div>

        {/* Grille de cartes — même vignette que la galerie client, pour s'y retrouver d'un coup d'œil */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {moduleTypes.map((mod) => {
            const open = openModule === mod.slug;
            return (
              <button
                key={mod.slug}
                type="button"
                onClick={() => setOpenModule(open ? null : mod.slug)}
                className={`relative text-center p-3 rounded-xl border transition-colors ${open ? 'border-vert-foret bg-vert-foret/5 ring-2 ring-vert-foret/20' : 'border-gray-200 hover:border-vert-foret hover:bg-vert-foret/5'}`}
              >
                <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${mod.actif ? 'bg-vert-foret' : 'bg-gray-300'}`} title={mod.actif ? 'Actif' : 'Inactif'} />
                <ModuleThumb type={mod} />
                <span className="block font-semibold text-gray-900 text-[13px] leading-snug mt-1.5 truncate">{mod.nom}</span>
                <span className="block text-[11px] text-gray-400 mt-0.5">{ZONE_LABELS[mod.zone] ?? mod.zone} · {mod.prixBase} € HT</span>
              </button>
            );
          })}
        </div>

        {/* Éditeur complet du module sélectionné */}
        {(() => {
          const mod = moduleTypes.find((m) => m.slug === openModule);
          if (!mod) {
            return <p className="text-sm text-gray-400 text-center py-6 mt-2">Cliquez sur une carte pour paramétrer le module (dimensions, socle, options…).</p>;
          }
          return (
            <div className="mt-4 border-2 border-vert-foret/40 rounded-xl bg-white p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-24 flex-shrink-0 rounded-lg bg-beige/40 border border-gray-100">
                  <ModuleThumb type={mod} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{mod.nom}</h3>
                  <p className="text-xs text-gray-400">{ZONE_LABELS[mod.zone] ?? mod.zone}</p>
                </div>
                <button onClick={() => setOpenModule(null)} className="ml-auto p-1.5 text-gray-400 hover:text-gray-700" aria-label="Fermer l'éditeur">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
                  <input value={mod.nom} onChange={(e) => patchModule(mod.slug, { nom: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Position</label>
                  <select value={mod.zone} onChange={(e) => patchModule(mod.slug, { zone: e.target.value as ModuleZone })} className={inputCls}>
                    {ZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <input value={mod.description || ''} onChange={(e) => patchModule(mod.slug, { description: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Prix de base (€ HT)</label>
                  <input type="number" value={mod.prixBase} onChange={(e) => patchModule(mod.slug, { prixBase: Number(e.target.value) || 0 })} className={numCls} />
                </div>
                <div className="flex items-end gap-5 pb-1 flex-wrap">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={mod.actif} onChange={(e) => patchModule(mod.slug, { actif: e.target.checked })} className="accent-vert-foret w-4 h-4" />
                    Actif
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {univers.map((u) => (
                      <label key={u.slug} className="flex items-center gap-1.5 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={mod.univers.includes(u.slug)}
                          onChange={(e) =>
                            patchModule(mod.slug, {
                              univers: e.target.checked ? [...mod.univers, u.slug] : mod.univers.filter((s) => s !== u.slug),
                            })
                          }
                          className="accent-vert-foret w-4 h-4"
                        />
                        {u.nom}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Dimensions en mm — <strong>Défaut</strong> à l&apos;ajout du module, <strong>Min/Max</strong> = limites des curseurs côté client
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left font-medium py-1 w-20"></th>
                      <th className="font-medium py-1">Largeur</th>
                      <th className="font-medium py-1">Hauteur</th>
                      <th className="font-medium py-1">Profondeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([['dimensionsDefault', 'Défaut'], ['dimensionsMin', 'Minimum'], ['dimensionsMax', 'Maximum']] as const).map(([group, label]) => (
                      <tr key={group}>
                        <td className="py-1 pr-2 text-gray-600 font-medium">{label}</td>
                        {(['largeur', 'hauteur', 'profondeur'] as const).map((field) => (
                          <td key={field} className="py-1 px-1">
                            <input
                              type="number"
                              aria-label={`${label} ${field}`}
                              value={mod[group][field]}
                              onChange={(e) => patchModule(mod.slug, { [group]: { ...mod[group], [field]: Number(e.target.value) || 0 } })}
                              className={`${numCls} w-full`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Options */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">Options du module (socle, portes, tiroirs, éclairage…)</p>
                  <button
                    onClick={() =>
                      patchModule(mod.slug, {
                        options: [...mod.options, { slug: `option_${Date.now()}`, nom: 'Nouvelle option', type: 'compteur', prix: 10, max: 4, defaut: 0 }],
                      })
                    }
                    className="text-xs text-vert-foret hover:underline"
                  >
                    + Ajouter une option
                  </button>
                </div>
                <div className="space-y-2">
                  {mod.options.map((opt, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2 space-y-2">
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 items-center">
                        <input value={opt.nom} onChange={(e) => patchOption(mod.slug, i, { nom: e.target.value })} className={`${inputCls} !py-1.5`} aria-label="Nom de l'option" />
                        <select value={opt.type} onChange={(e) => patchOption(mod.slug, i, { type: e.target.value as ConfigurateurModuleOption['type'] })} className={`${inputCls} !py-1.5 !w-auto`} aria-label="Type">
                          <option value="compteur">Compteur</option>
                          <option value="toggle">Oui / non</option>
                          <option value="choix">Choix exclusif</option>
                        </select>
                        <label className="text-xs text-gray-500">€ <input type="number" value={opt.prix} onChange={(e) => patchOption(mod.slug, i, { prix: Number(e.target.value) || 0 })} className={`${numCls} !w-16`} aria-label="Prix" /></label>
                        <label className="text-xs text-gray-500">max <input type="number" value={opt.max ?? 10} onChange={(e) => patchOption(mod.slug, i, { max: Number(e.target.value) || 0 })} className={`${numCls} !w-14`} aria-label="Maximum" /></label>
                        <label className="text-xs text-gray-500">déf. <input type="number" value={opt.defaut} onChange={(e) => patchOption(mod.slug, i, { defaut: Number(e.target.value) || 0 })} className={`${numCls} !w-14`} aria-label="Quantité par défaut" /></label>
                        <button
                          onClick={() => patchModule(mod.slug, { options: mod.options.filter((_, j) => j !== i) })}
                          className="p-1.5 text-red-400 hover:text-red-600"
                          aria-label="Supprimer l'option"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {opt.type === 'choix' && (
                        <label className="flex items-center gap-2 text-xs text-gray-500">
                          Groupe exclusif
                          <input
                            value={opt.groupe || ''}
                            onChange={(e) => patchOption(mod.slug, i, { groupe: e.target.value || undefined })}
                            placeholder="ex. socle, poignee"
                            className={`${inputCls} !py-1 !w-40`}
                            aria-label="Groupe exclusif"
                          />
                          <span className="text-gray-400">Les options d&apos;un même groupe s&apos;excluent (radio).</span>
                        </label>
                      )}
                    </div>
                  ))}
                  {mod.options.length === 0 && <p className="text-xs text-gray-400">Aucune option — le module est vendu tel quel.</p>}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => { onModulesChange(moduleTypes.filter((m) => m.slug !== mod.slug)); setOpenModule(null); }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Supprimer ce module
                </button>
              </div>
            </div>
          );
        })()}
      </section>
    </div>
  );
}
