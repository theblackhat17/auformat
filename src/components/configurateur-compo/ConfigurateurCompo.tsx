'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { CompositionConfig, ConfigurateurSettings } from '@/lib/types';
import { useComposition } from './useComposition';
import { computeCompositionPrice, formatEur, getModuleType } from './pricingCompo';
import { CompoCanvas, layoutModules } from './CompoCanvas';
import { ModulePanel, GlobalPanel } from './ModulePanel';
import { ModulePicker } from './ModulePicker';
import { CompoQuoteModal } from './CompoQuoteModal';
import { AssistantModal } from './AssistantModal';
import { PrintRecap } from './PrintRecap';

/* La 3D (Three.js) n'est chargée que si le client ouvre l'onglet */
const Compo3D = dynamic(() => import('./Compo3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[55vh] min-h-[360px]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-noir/60">Chargement de la 3D…</p>
      </div>
    </div>
  ),
});

export const COMPO_DRAFT_KEY = 'auformat-compo-draft';

type DraftPayload = { config: CompositionConfig; projectId: string | null; projectName: string | null; savedAt: string };

export function readCompoDraft(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(COMPO_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    return parsed?.config?.version === 2 ? parsed : null;
  } catch {
    return null;
  }
}

export function ConfigurateurCompo({
  settings,
  initialConfig,
  initialProjectId,
  initialProjectName,
  onBackToUnivers,
}: {
  settings: ConfigurateurSettings;
  initialConfig: CompositionConfig;
  initialProjectId?: string | null;
  initialProjectName?: string | null;
  onBackToUnivers: () => void;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const moduleTypes = useMemo(() => settings.module_types || [], [settings.module_types]);
  const materials = settings.materials || [];

  const compo = useComposition(initialConfig);
  const univers = (settings.univers || []).find((u) => u.slug === compo.config.univers);
  /** Mode prix : 'masque' (défaut) = aucun prix côté client, chiffrage par devis */
  const showPrices = settings.pricing_mode === 'estimation';

  const [pickerOpen, setPickerOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantNote, setAssistantNote] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [projectId, setProjectId] = useState<string | null>(initialProjectId ?? null);
  const [projectName, setProjectName] = useState<string | null>(initialProjectName ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'naming' | 'saving' | 'saved' | 'error'>('idle');
  const [nameInput, setNameInput] = useState('');
  const [shareAfterSave, setShareAfterSave] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle');

  const breakdown = useMemo(
    () => computeCompositionPrice(compo.config, moduleTypes, materials, univers),
    [compo.config, moduleTypes, materials, univers]
  );
  const { totalWidth } = useMemo(() => layoutModules(compo.config, moduleTypes), [compo.config, moduleTypes]);

  const selectedModule = compo.config.modules.find((m) => m.id === compo.selectedId) || null;
  const selectedType = selectedModule ? getModuleType(moduleTypes, selectedModule.typeSlug) : undefined;

  /* Brouillon local : le travail n'est jamais perdu, même sans compte. */
  useEffect(() => {
    if (compo.dirty === 0) return;
    const t = setTimeout(() => {
      try {
        const payload: DraftPayload = { config: compo.config, projectId, projectName, savedAt: new Date().toISOString() };
        localStorage.setItem(COMPO_DRAFT_KEY, JSON.stringify(payload));
      } catch { /* stockage plein ou bloqué : tant pis pour le brouillon */ }
    }, 600);
    return () => clearTimeout(t);
  }, [compo.config, compo.dirty, projectId, projectName]);

  /* Sauvegarde auto du projet en base quand il existe déjà. */
  const lastSyncedDirty = useRef(0);
  useEffect(() => {
    if (!projectId || !isAuthenticated || compo.dirty === 0 || compo.dirty === lastSyncedDirty.current) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: compo.config }),
        });
        if (res.ok) {
          lastSyncedDirty.current = compo.dirty;
          setSaveState('saved');
        }
      } catch { /* le brouillon local couvre la panne réseau */ }
    }, 1500);
    return () => clearTimeout(t);
  }, [compo.config, compo.dirty, projectId, isAuthenticated]);

  async function handleSaveClick() {
    if (!isAuthenticated) {
      router.push('/login?redirect=/configurateur');
      return;
    }
    if (projectId) {
      setSaveState('saving');
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: compo.config }),
        });
        setSaveState(res.ok ? 'saved' : 'error');
        if (res.ok) lastSyncedDirty.current = compo.dirty;
      } catch {
        setSaveState('error');
      }
      return;
    }
    setNameInput(`${univers?.nom || 'Projet'} sur mesure`);
    setSaveState('naming');
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setSaveState('saving');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() || 'Projet sur mesure', type: compo.config.univers, config: compo.config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setProjectId(data.id);
      setProjectName(data.name);
      lastSyncedDirty.current = compo.dirty;
      setSaveState('saved');
      window.history.replaceState(null, '', `/configurateur?project=${data.id}`);
      if (shareAfterSave) {
        setShareAfterSave(false);
        await doShare(data.id);
      }
    } catch {
      setSaveState('error');
    }
  }

  async function doShare(id: string) {
    setShareState('busy');
    try {
      const res = await fetch(`/api/projects/${id}/share`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error();
      const url = `${window.location.origin}${data.path}`;
      await navigator.clipboard.writeText(url).catch(() => {
        window.prompt('Copiez le lien de partage :', url);
      });
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 3500);
    } catch {
      setShareState('error');
      setTimeout(() => setShareState('idle'), 3500);
    }
  }

  function handleShareClick() {
    if (!isAuthenticated) {
      router.push('/login?redirect=/configurateur');
      return;
    }
    if (!projectId) {
      // Le partage suppose un projet enregistré : on enchaîne nommage → partage
      setShareAfterSave(true);
      setNameInput(`${univers?.nom || 'Projet'} sur mesure`);
      setSaveState('naming');
      return;
    }
    doShare(projectId);
  }

  async function handleQuoteSent() {
    if (projectId && isAuthenticated) {
      fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: compo.config, status: 'quote_requested' }),
      }).catch(() => {});
    }
    try { localStorage.removeItem(COMPO_DRAFT_KEY); } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-beige/40 pb-28 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Barre de titre */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBackToUnivers} className="flex-shrink-0 w-9 h-9 rounded-full border border-noir/15 text-noir/70 hover:border-noir flex items-center justify-center transition-colors" aria-label="Changer d'univers">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl text-noir truncate">
                {projectName || `${univers?.nom || 'Composition'} sur mesure`}
              </h1>
              <p className="text-xs text-noir/55">
                {compo.config.modules.length} module{compo.config.modules.length > 1 ? 's' : ''} · {(totalWidth / 1000).toFixed(2).replace('.', ',')} m linéaire
                {saveState === 'saved' && <span className="text-vert-foret"> · Enregistré ✓</span>}
                {saveState === 'error' && <span className="text-red-700"> · Erreur d&apos;enregistrement</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={() => window.print()} title="Télécharger le récapitulatif en PDF" className="btn-secondary !py-2 !px-4 text-sm">
              PDF
            </button>
            <button onClick={handleShareClick} disabled={shareState === 'busy'} className="btn-secondary !py-2 !px-4 text-sm disabled:opacity-60">
              {shareState === 'copied' ? 'Lien copié ✓' : shareState === 'error' ? 'Erreur' : shareState === 'busy' ? '…' : 'Partager'}
            </button>
            <button onClick={handleSaveClick} disabled={saveState === 'saving'} className="btn-secondary !py-2 !px-5 text-sm disabled:opacity-60">
              {saveState === 'saving' ? 'Enregistrement…' : projectId ? 'Enregistrer' : 'Enregistrer le projet'}
            </button>
            <button onClick={() => setQuoteOpen(true)} className="btn-primary !py-2 !px-5 text-sm">
              Demander un devis
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 items-start">
          {/* Canvas */}
          <div className="lg:col-span-8 bg-white rounded-2xl ring-1 ring-noir/8 p-4 sm:p-6">
            {/* Onglets 2D / 3D */}
            <div className="flex gap-1 mb-4 bg-beige/70 rounded-full p-1 w-fit" role="tablist" aria-label="Mode d'affichage">
              <button
                role="tab"
                aria-selected={viewMode === '2d'}
                onClick={() => setViewMode('2d')}
                className={`px-5 py-1.5 text-sm font-semibold rounded-full transition-colors ${viewMode === '2d' ? 'bg-white text-noir shadow-sm' : 'text-noir/60 hover:text-noir'}`}
              >
                Plan 2D
              </button>
              <button
                role="tab"
                aria-selected={viewMode === '3d'}
                onClick={() => setViewMode('3d')}
                className={`px-5 py-1.5 text-sm font-semibold rounded-full transition-colors ${viewMode === '3d' ? 'bg-white text-noir shadow-sm' : 'text-noir/60 hover:text-noir'}`}
              >
                Aperçu 3D
              </button>
            </div>

            {viewMode === '2d' ? (
              <CompoCanvas
                config={compo.config}
                moduleTypes={moduleTypes}
                materials={materials}
                univers={univers}
                selectedId={compo.selectedId}
                onSelect={(id) => compo.select(id === compo.selectedId ? null : id)}
                onMoveFree={(id, posX, posY) => compo.setModulePos(id, posX, posY)}
              />
            ) : (
              <Compo3D
                config={compo.config}
                moduleTypes={moduleTypes}
                materials={materials}
                univers={univers}
                selectedId={compo.selectedId}
                onSelect={(id) => compo.select(id === compo.selectedId ? null : id)}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-noir/8">
              <div className="flex flex-wrap gap-2.5">
                <button onClick={() => setPickerOpen(true)} className="btn-primary !py-2.5 text-sm">
                  + Ajouter un module
                </button>
                {settings.ai_enabled && (
                  <button onClick={() => setAssistantOpen(true)} className="btn-secondary !py-2.5 text-sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                    </svg>
                    Assistant
                  </button>
                )}
              </div>
              <p className="text-xs text-noir/55">Cliquez sur un module du dessin pour le modifier.</p>
            </div>
            {assistantNote && (
              <div className="mt-3 p-3.5 bg-vert-foret/8 border border-vert-foret/20 rounded-xl flex items-start gap-2.5">
                <svg className="w-4 h-4 text-vert-foret flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                </svg>
                <p className="text-sm text-noir/80 leading-relaxed flex-1">{assistantNote}</p>
                <button onClick={() => setAssistantNote(null)} aria-label="Masquer" className="text-noir/45 hover:text-noir flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
          </div>

          {/* Panneau latéral */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white rounded-2xl ring-1 ring-noir/8 p-5">
              {selectedModule && selectedType ? (
                <ModulePanel
                  module={selectedModule}
                  type={selectedType}
                  config={compo.config}
                  materials={materials}
                  moduleCount={compo.config.modules.length}
                  totalWidth={totalWidth}
                  showPrices={showPrices}
                  onDim={(f, v) => compo.setModuleDim(selectedModule.id, f, v)}
                  onMaterial={(i) => compo.setModuleMaterial(selectedModule.id, i)}
                  onOption={(slug, v) => compo.setModuleOption(selectedModule.id, slug, v)}
                  onMove={(d) => compo.moveModule(selectedModule.id, d)}
                  onDuplicate={() => compo.duplicateModule(selectedModule.id)}
                  onRemove={() => compo.removeModule(selectedModule.id)}
                  onPos={(posX, posY) => compo.setModulePos(selectedModule.id, posX, posY)}
                />
              ) : (
                <GlobalPanel
                  config={compo.config}
                  univers={univers}
                  materials={materials}
                  totalWidth={totalWidth}
                  showPrices={showPrices}
                  onGlobalMaterial={compo.setGlobalMaterial}
                  onPlanTravail={compo.setPlanTravail}
                  onFacadeCoulissante={compo.setFacadeCoulissante}
                  onFacadeVantaux={compo.setFacadeVantaux}
                  onPlanMaterial={compo.setPlanMaterial}
                  onPlintheMaterial={compo.setPlintheMaterial}
                  onLineaireMax={compo.setLineaireMax}
                />
              )}
            </div>

            {/* Prix (ou chiffrage sur devis selon le mode) */}
            <div className="bg-noir text-white rounded-2xl p-5">
              {showPrices ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-white/75">Estimation TTC</p>
                    <p className="font-display text-3xl" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEur(breakdown.totalTtc)}</p>
                  </div>
                  <p className="text-xs text-white/55 mt-1">Indicative — devis définitif après étude par l&apos;atelier.</p>
                  <details className="mt-3 group">
                    <summary className="cursor-pointer text-sm text-bois-clair list-none [&::-webkit-details-marker]:hidden flex items-center gap-1.5">
                      Détail par module
                      <svg className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
                    </summary>
                    <ul className="mt-3 space-y-1.5 text-sm text-white/85">
                      {breakdown.moduleLines.map((line, i) => (
                        <li key={line.moduleId} className="flex justify-between gap-3">
                          <span className="truncate">{i + 1}. {line.label}</span>
                          <span className="tabular-nums flex-shrink-0">{formatEur(line.total)}</span>
                        </li>
                      ))}
                      {breakdown.planTravailLine && (
                        <li className="flex justify-between gap-3">
                          <span className="truncate">{breakdown.planTravailLine.label}</span>
                          <span className="tabular-nums flex-shrink-0">{formatEur(breakdown.planTravailLine.total)}</span>
                        </li>
                      )}
                      <li className="flex justify-between gap-3 pt-2 border-t border-white/15 text-white/65">
                        <span>Total HT</span><span className="tabular-nums">{formatEur(breakdown.subtotalHt)}</span>
                      </li>
                      <li className="flex justify-between gap-3 text-white/65">
                        <span>TVA 20 %</span><span className="tabular-nums">{formatEur(breakdown.tva)}</span>
                      </li>
                    </ul>
                  </details>
                </>
              ) : (
                <>
                  <p className="font-display text-xl">Prix sur devis</p>
                  <p className="text-sm text-white/75 mt-1.5 leading-relaxed">
                    Enregistrez votre projet et demandez votre devis : l&apos;atelier vous transmet un chiffrage détaillé sous 48h, gratuit et sans engagement.
                  </p>
                  <button onClick={() => setQuoteOpen(true)} className="btn-on-dark w-full !py-2.5 text-sm mt-4">
                    Demander mon devis gratuit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barre mobile fixe */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-noir/10 px-4 py-3 flex items-center justify-between gap-3 z-40">
        <div>
          {showPrices ? (
            <>
              <p className="text-xs text-noir/55">Estimation TTC</p>
              <p className="font-display text-xl text-noir tabular-nums">{formatEur(breakdown.totalTtc)}</p>
            </>
          ) : (
            <>
              <p className="font-display text-lg text-noir">Prix sur devis</p>
              <p className="text-xs text-noir/55">Chiffrage gratuit sous 48h</p>
            </>
          )}
        </div>
        <button onClick={() => setQuoteOpen(true)} className="btn-primary !py-2.5 text-sm">Demander un devis</button>
      </div>

      {pickerOpen && (
        <ModulePicker
          moduleTypes={moduleTypes}
          universSlug={compo.config.univers}
          showPrices={showPrices}
          onAdd={compo.addModule}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {assistantOpen && (
        <AssistantModal
          currentConfig={compo.config}
          onResult={(config, explication) => {
            compo.load(config);
            setAssistantNote(explication || null);
          }}
          onClose={() => setAssistantOpen(false)}
        />
      )}

      {quoteOpen && (
        <CompoQuoteModal
          config={compo.config}
          breakdown={breakdown}
          totalWidth={totalWidth}
          univers={univers}
          materials={materials}
          showPrices={showPrices}
          onClose={() => setQuoteOpen(false)}
          onSent={handleQuoteSent}
        />
      )}

      {/* Récap imprimable (visible uniquement à l'impression) */}
      <PrintRecap
        config={compo.config}
        breakdown={breakdown}
        moduleTypes={moduleTypes}
        materials={materials}
        univers={univers}
        projectName={projectName}
        showPrices={showPrices}
      />

      {/* Nommage du projet */}
      {saveState === 'naming' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-noir/45 animate-fade-in" onClick={() => setSaveState('idle')} aria-hidden="true" />
          <form onSubmit={handleCreateProject} className="relative bg-white rounded-2xl shadow-[0_24px_64px_-16px_rgba(43,43,43,0.35)] w-full max-w-sm p-6 animate-scale-in">
            <h2 className="font-display text-xl text-noir mb-1">Nommer votre projet</h2>
            <p className="text-sm text-noir/60 mb-4">Vous le retrouverez dans « Mes projets » pour le reprendre à tout moment.</p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              aria-label="Nom du projet"
              className="w-full px-3.5 py-2.5 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret focus:ring-[3px] focus:ring-vert-foret/15"
            />
            <div className="flex justify-end gap-2.5 mt-5">
              <button type="button" onClick={() => setSaveState('idle')} className="btn-secondary !py-2 !px-5 text-sm">Annuler</button>
              <button type="submit" className="btn-primary !py-2 !px-5 text-sm">Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
