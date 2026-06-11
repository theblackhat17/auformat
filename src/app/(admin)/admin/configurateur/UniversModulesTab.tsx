'use client';

import { useState } from 'react';
import type { ConfigurateurModuleType, ConfigurateurModuleOption, ConfigurateurUnivers, ModuleZone } from '@/lib/types';

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
        dimensionsMin: { largeur: 300, hauteur: 600, profondeur: 250 },
        dimensionsMax: { largeur: 1500, hauteur: 2700, profondeur: 700 },
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
      <section>
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
      <section>
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

        <div className="space-y-2">
          {moduleTypes.map((mod) => (
            <div key={mod.slug} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setOpenModule(openModule === mod.slug ? null : mod.slug)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${mod.actif ? 'bg-vert-foret' : 'bg-gray-300'}`} />
                  <span className="font-medium text-sm text-gray-900 truncate">{mod.nom}</span>
                  <span className="text-xs text-gray-400">{mod.univers.join(', ')} · {mod.prixBase} € HT</span>
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${openModule === mod.slug ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
              </button>

              {openModule === mod.slug && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
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
                    <div className="flex items-end gap-5 pb-1">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={mod.actif} onChange={(e) => patchModule(mod.slug, { actif: e.target.checked })} className="accent-vert-foret w-4 h-4" />
                        Actif
                      </label>
                      <div className="flex items-center gap-3">
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
                    <p className="text-xs font-medium text-gray-500 mb-2">Dimensions (mm) — défaut / min / max</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(['largeur', 'hauteur', 'profondeur'] as const).map((field) => (
                        <div key={field}>
                          <p className="text-xs text-gray-400 capitalize mb-1">{field}</p>
                          <div className="flex flex-col gap-1.5">
                            {(['dimensionsDefault', 'dimensionsMin', 'dimensionsMax'] as const).map((group) => (
                              <input
                                key={group}
                                type="number"
                                title={`${field} — ${group.replace('dimensions', '').toLowerCase()}`}
                                value={mod[group][field]}
                                onChange={(e) => patchModule(mod.slug, { [group]: { ...mod[group], [field]: Number(e.target.value) || 0 } })}
                                className={`${numCls} w-full`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">Options du module</p>
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
                        <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 items-center bg-gray-50 rounded-lg p-2">
                          <input value={opt.nom} onChange={(e) => patchOption(mod.slug, i, { nom: e.target.value })} className={`${inputCls} !py-1.5`} aria-label="Nom de l'option" />
                          <select value={opt.type} onChange={(e) => patchOption(mod.slug, i, { type: e.target.value as 'compteur' | 'toggle' })} className={`${inputCls} !py-1.5 !w-auto`} aria-label="Type">
                            <option value="compteur">Compteur</option>
                            <option value="toggle">Oui / non</option>
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
                      ))}
                      {mod.options.length === 0 && <p className="text-xs text-gray-400">Aucune option — le module est vendu tel quel.</p>}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => onModulesChange(moduleTypes.filter((m) => m.slug !== mod.slug))}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Supprimer ce module
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
