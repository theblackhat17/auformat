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
import { UnitProvider, useUnit } from './units';

/** Sélecteur d'unité d'affichage mm / cm (préférence persistée) */
function UnitToggle() {
  const { unit, setUnit } = useUnit();
  return (
    <div className="flex items-center bg-beige/70 rounded-full p-0.5" role="group" aria-label="Unité d'affichage">
      {(['mm', 'cm'] as const).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => setUnit(u)}
          aria-pressed={unit === u}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${unit === u ? 'bg-white text-noir shadow-sm' : 'text-noir/55 hover:text-noir'}`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

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
  const { isAuthenticated, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  /* Attribution du projet à un client (commercial en RDV) */
  const [clients, setClients] = useState<{ id: string; email: string; fullName: string | null }[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientUserId, setClientUserId] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const moduleTypes = useMemo(() => settings.module_types || [], [settings.module_types]);
  const materials = settings.materials || [];

  const compo = useComposition(initialConfig);
  const univers = (settings.univers || []).find((u) => u.slug === compo.config.univers);
  /** Les prix ne sont JAMAIS montrés au client : seul un admin (commercial) voit le chiffrage. */
  const showPrices = isAdmin;
  /** Un client connecté ne demande pas de devis (son commercial pilote tout) ; on garde la
   *  demande pour les prospects (visiteurs non connectés) et pour l'admin. */
  const canRequestQuote = isAdmin || !isAuthenticated;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantNote, setAssistantNote] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [showDims, setShowDims] = useState(false);
  const [templateState, setTemplateState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [projectId, setProjectId] = useState<string | null>(initialProjectId ?? null);
  const [projectName, setProjectName] = useState<string | null>(initialProjectName ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'naming' | 'saving' | 'saved' | 'error'>('idle');
  const [nameInput, setNameInput] = useState('');
  const [shareAfterSave, setShareAfterSave] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [attribOpen, setAttribOpen] = useState(false);
  const [attribState, setAttribState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  const breakdown = useMemo(
    () => computeCompositionPrice(compo.config, moduleTypes, materials, univers),
    [compo.config, moduleTypes, materials, univers]
  );
  const layout = useMemo(() => layoutModules(compo.config, moduleTypes), [compo.config, moduleTypes]);
  const { totalWidth } = layout;

  const selectedModule = compo.config.modules.find((m) => m.id === compo.selectedId) || null;
  const selectedType = selectedModule ? getModuleType(moduleTypes, selectedModule.typeSlug) : undefined;

  /** Flèches ← → : intervertit avec le voisin de la même rangée (mur principal, retour ou îlot) */
  function moveSelected(direction: -1 | 1) {
    if (!selectedModule) return;
    const me = layout.placed.find((p) => p.module.id === selectedModule.id);
    if (!me || me.free) {
      compo.moveModule(selectedModule.id, direction);
      return;
    }
    const sameRow = layout.placed
      .filter((p) => !p.free && p.row === me.row && p.module.id !== selectedModule.id)
      .sort((a, b) => a.x - b.x);
    const neighbor = direction === 1
      ? sameRow.find((p) => p.x > me.x)
      : [...sameRow].reverse().find((p) => p.x < me.x);
    if (neighbor) compo.swapModules(selectedModule.id, neighbor.module.id);
  }

  /** Ajout d'un module, avec une astuce quand un plan libre risque de doublonner le plan automatique */
  function handleAddModule(type: NonNullable<typeof selectedType>) {
    compo.addModule(type);
    if (type.slug === 'plan_de_travail' && compo.config.planTravail && univers?.planTravail?.disponible) {
      setAssistantNote(
        'Astuce : le plan de travail automatique couvre déjà vos meubles bas. Ce plan libre sert plutôt de plan snack ou de tablette — si vous vouliez remplacer le plan automatique, désactivez « Plan de travail » dans les réglages de la composition, ou cochez « Sans plan de travail au-dessus » sur certains meubles.'
      );
    }
  }

  /* Annuler / rétablir au clavier (hors champs de saisie) */
  const undoRef = useRef({ undo: compo.undo, redo: compo.redo });
  undoRef.current = { undo: compo.undo, redo: compo.redo };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) undoRef.current.redo();
        else undoRef.current.undo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        undoRef.current.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        body: JSON.stringify({
          name: nameInput.trim() || 'Projet sur mesure',
          type: compo.config.univers,
          config: compo.config,
          ...(isAdmin && clientUserId ? { clientUserId } : {}),
          ...(isAdmin && !clientUserId && clientEmail ? { clientEmail } : {}),
        }),
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
      setShareUrl(url);
      setShareOpen(true);
      setShareState('idle');
    } catch {
      setShareState('error');
      setTimeout(() => setShareState('idle'), 3500);
    }
  }

  async function regenerateShare() {
    if (!projectId) return;
    if (!window.confirm("Générer un nouveau lien ? L'ancien lien ne fonctionnera plus.")) return;
    setShareState('busy');
    try {
      await fetch(`/api/projects/${projectId}/share`, { method: 'DELETE' });
      await doShare(projectId);
    } catch {
      setShareState('error');
    }
  }

  // Recherche / sélection de client, partagée entre le modal de nommage et le modal d'attribution
  function renderClientPicker() {
    return (
      <>
        <input
          value={clientSearch}
          onChange={async (e) => {
            setClientSearch(e.target.value);
            setClientUserId(null);
            if (clients.length === 0) {
              try {
                const res = await fetch('/api/admin/clients');
                const data = await res.json();
                setClients(Array.isArray(data) ? data : data.clients || []);
              } catch { /* liste indisponible */ }
            }
          }}
          placeholder="Rechercher par nom ou email…"
          aria-label="Rechercher un client"
          className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret"
        />
        {clientSearch.length >= 2 && !clientUserId && !clientEmail && (
          <ul className="mt-1.5 max-h-36 overflow-y-auto bg-white rounded-lg ring-1 ring-noir/10 divide-y divide-noir/5">
            {clients
              .filter((c) => `${c.fullName || ''} ${c.email}`.toLowerCase().includes(clientSearch.toLowerCase()))
              .slice(0, 8)
              .map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { setClientUserId(c.id); setClientSearch(`${c.fullName || c.email}`); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-beige/60 transition-colors"
                  >
                    <span className="font-medium text-noir">{c.fullName || '—'}</span>
                    <span className="block text-xs text-noir/55">{c.email}</span>
                  </button>
                </li>
              ))}
            {/* Client sans compte : création par email */}
            {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientSearch.trim()) &&
              !clients.some((c) => c.email.toLowerCase() === clientSearch.trim().toLowerCase()) && (
                <li>
                  <button
                    type="button"
                    onClick={() => setClientEmail(clientSearch.trim().toLowerCase())}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-vert-foret/10 transition-colors text-vert-foret font-semibold"
                  >
                    + Créer le compte client « {clientSearch.trim()} » et lui attribuer
                  </button>
                </li>
              )}
          </ul>
        )}
        {clientUserId && (
          <p className="mt-1.5 text-xs text-vert-foret font-semibold flex items-center gap-1.5">
            ✓ Sera enregistré sur le compte de {clientSearch}
            <button type="button" onClick={() => { setClientUserId(null); setClientSearch(''); }} className="text-noir/55 underline font-normal">annuler</button>
          </p>
        )}
        {clientEmail && (
          <p className="mt-1.5 text-xs text-vert-foret font-semibold">
            ✓ Compte client créé pour {clientEmail} — il l&apos;activera via « Mot de passe oublié » avec cet email.
            <button type="button" onClick={() => { setClientEmail(null); setClientSearch(''); }} className="ml-1.5 text-noir/55 underline font-normal">annuler</button>
          </p>
        )}
      </>
    );
  }

  async function handleAttribuer() {
    if (!projectId || (!clientUserId && !clientEmail)) return;
    setAttribState('busy');
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientUserId ? { clientUserId } : { clientEmail }),
      });
      if (!res.ok) throw new Error();
      setAttribState('done');
    } catch {
      setAttribState('error');
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2500);
    } catch {
      window.prompt('Copiez le lien de partage :', shareUrl);
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
    <UnitProvider>
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
            <UnitToggle />
            {/* Annuler / rétablir */}
            <div className="flex items-center gap-1">
              <button
                onClick={compo.undo}
                disabled={!compo.canUndo}
                title="Annuler (Ctrl+Z)"
                aria-label="Annuler la dernière modification"
                className="w-9 h-9 rounded-full border border-noir/15 text-noir/70 hover:border-noir disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
              </button>
              <button
                onClick={compo.redo}
                disabled={!compo.canRedo}
                title="Rétablir (Ctrl+Shift+Z)"
                aria-label="Rétablir la modification annulée"
                className="w-9 h-9 rounded-full border border-noir/15 text-noir/70 hover:border-noir disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>
              </button>
            </div>
            <button onClick={() => window.print()} title="Télécharger le récapitulatif en PDF" className="btn-secondary !py-2 !px-4 text-sm">
              PDF
            </button>
            <button onClick={handleShareClick} disabled={shareState === 'busy'} className="btn-secondary !py-2 !px-4 text-sm disabled:opacity-60">
              {shareState === 'error' ? 'Erreur' : shareState === 'busy' ? '…' : 'Partager'}
            </button>
            {isAdmin && projectId && (
              <button
                onClick={() => { setAttribState('idle'); setClientUserId(null); setClientEmail(null); setClientSearch(''); setAttribOpen(true); }}
                className="btn-secondary !py-2 !px-4 text-sm"
              >
                Attribuer
              </button>
            )}
            {isAdmin && projectId && (
              <button
                onClick={async () => {
                  setTemplateState('busy');
                  try {
                    const res = await fetch(`/api/projects/${projectId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isTemplate: true, config: compo.config }),
                    });
                    setTemplateState(res.ok ? 'done' : 'idle');
                  } catch {
                    setTemplateState('idle');
                  }
                }}
                disabled={templateState !== 'idle'}
                title="Proposer cette composition comme point de départ aux clients"
                className="btn-secondary !py-2 !px-4 text-sm disabled:opacity-60"
              >
                {templateState === 'done' ? 'Modèle ✓' : templateState === 'busy' ? '…' : 'Définir comme modèle'}
              </button>
            )}
            <button onClick={handleSaveClick} disabled={saveState === 'saving'} className="btn-secondary !py-2 !px-5 text-sm disabled:opacity-60">
              {saveState === 'saving' ? 'Enregistrement…' : projectId ? 'Enregistrer' : 'Enregistrer le projet'}
            </button>
            {canRequestQuote && (
              <button onClick={() => setQuoteOpen(true)} className="btn-primary !py-2 !px-5 text-sm">
                Demander un devis
              </button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 items-start">
          {/* Canvas — reste visible (collé en haut) pendant qu'on fait défiler les réglages */}
          <div className="lg:col-span-8 lg:sticky lg:top-4 lg:self-start bg-white rounded-2xl ring-1 ring-noir/8 p-4 sm:p-6">
            {/* Onglets 2D / 3D + cotes */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex gap-1 bg-beige/70 rounded-full p-1 w-fit" role="tablist" aria-label="Mode d'affichage">
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
              {viewMode === '2d' && (
                <button
                  onClick={() => setShowDims((v) => !v)}
                  aria-pressed={showDims}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                    showDims ? 'bg-noir text-white border-noir' : 'text-noir/65 border-noir/20 hover:border-noir'
                  }`}
                >
                  Cotes
                </button>
              )}
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
                onEcart={(id, value) => compo.setModuleEcart(id, value)}
                onSwap={(a, b) => compo.swapModules(a, b)}
                showDims={showDims}
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
                  moduleTypes={moduleTypes}
                  moduleCount={compo.config.modules.length}
                  totalWidth={totalWidth}
                  showPrices={showPrices}
                  onDim={(f, v) => compo.setModuleDim(selectedModule.id, f, v)}
                  onMaterial={(i) => compo.setModuleMaterial(selectedModule.id, i)}
                  onOption={(slug, v) => compo.setModuleOption(selectedModule.id, slug, v)}
                  onMove={moveSelected}
                  onDuplicate={() => compo.duplicateModule(selectedModule.id)}
                  onRemove={() => compo.removeModule(selectedModule.id)}
                  onPos={(posX, posY) => compo.setModulePos(selectedModule.id, posX, posY)}
                  onTiroirsHauteur={(value) => compo.setTiroirsHauteur(selectedModule.id, value)}
                  onEtagerePos={(index, value) => compo.setEtagerePos(selectedModule.id, index, value)}
                  onFacadeMaterial={(index) => compo.setFacadeMaterial(selectedModule.id, index)}
                  onInterieurMaterial={(index) => compo.setInterieurMaterial(selectedModule.id, index)}
                  onStyleFacade={(value) => compo.setStyleFacade(selectedModule.id, value)}
                  onApplyMaterialAll={compo.applyMaterialAll}
                  onMur={(value) => compo.setModuleMur(selectedModule.id, value)}
                  onFusion={(value) => compo.setFusion(selectedModule.id, value)}
                  onBandeau={(value) => compo.setBandeau(selectedModule.id, value)}
                  onBandeauHauteur={(value) => compo.setBandeauHauteur(selectedModule.id, value)}
                  onGrille={(value) => compo.setGrille(selectedModule.id, value)}
                  onGrilleColonnes={(value) => compo.setGrilleColonnes(selectedModule.id, value)}
                  onGrilleEtageres={(col, value) => compo.setGrilleEtageres(selectedModule.id, col, value)}
                  onEmpile={(baseId) => compo.setEmpile(selectedModule.id, baseId)}
                  onEmpileOffset={(value) => compo.setEmpileOffset(selectedModule.id, value)}
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
                  onPlanChant={compo.setPlanChant}
                  onPlintheMaterial={compo.setPlintheMaterial}
                  onLineaireMax={compo.setLineaireMax}
                  onHauteurPlafond={compo.setHauteurPlafond}
                  onPlanDims={compo.setPlanDims}
                  onPoigneeFinition={compo.setPoigneeFinition}
                  onLedTemp={compo.setLedTemp}
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
                  {canRequestQuote ? (
                    <>
                      <p className="text-sm text-white/75 mt-1.5 leading-relaxed">
                        Enregistrez votre projet et demandez votre devis : l&apos;atelier vous transmet un chiffrage détaillé sous 48h, gratuit et sans engagement.
                      </p>
                      <button onClick={() => setQuoteOpen(true)} className="btn-on-dark w-full !py-2.5 text-sm mt-4">
                        Demander mon devis gratuit
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-white/75 mt-1.5 leading-relaxed">
                      Votre conseiller Au Format chiffre votre projet et vous accompagne à chaque étape.
                    </p>
                  )}
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
        {canRequestQuote && (
          <button onClick={() => setQuoteOpen(true)} className="btn-primary !py-2.5 text-sm">Demander un devis</button>
        )}
      </div>

      {pickerOpen && (
        <ModulePicker
          moduleTypes={moduleTypes}
          universList={settings.univers || []}
          universSlug={compo.config.univers}
          showPrices={showPrices}
          onAdd={handleAddModule}
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

      {/* Fenêtre de partage */}
      {shareOpen && shareUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-noir/45 animate-fade-in" onClick={() => setShareOpen(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-2xl shadow-[0_24px_64px_-16px_rgba(43,43,43,0.35)] w-full max-w-md p-6 animate-scale-in">
            <h2 className="font-display text-xl text-noir mb-1.5">Partager ce projet</h2>
            <p className="text-sm text-noir/60 mb-4">
              Ce lien est consultable par <strong>toutes les personnes</strong> à qui vous l&apos;envoyez — partagez-le autant de fois que vous voulez.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                aria-label="Lien de partage"
                className="flex-1 min-w-0 px-3 py-2.5 bg-beige/60 border border-noir/15 rounded-lg text-sm text-noir/80 font-mono"
              />
              <button onClick={copyShareUrl} className="btn-primary !py-2 !px-4 text-sm flex-shrink-0">
                {shareState === 'copied' ? 'Copié ✓' : 'Copier'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5 mt-4">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Voici mon projet d'agencement Au Format : ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary !py-2 !px-4 text-sm"
              >
                WhatsApp
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('Mon projet d\'agencement Au Format')}&body=${encodeURIComponent(`Bonjour,\n\nVoici mon projet d'agencement sur mesure :\n${shareUrl}\n\n`)}`}
                className="btn-secondary !py-2 !px-4 text-sm"
              >
                Email
              </a>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2 !px-4 text-sm">
                Ouvrir
              </a>
            </div>
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-noir/8">
              <button onClick={regenerateShare} className="text-xs text-noir/55 hover:text-red-700 underline">
                Générer un nouveau lien (révoque l&apos;ancien)
              </button>
              <button onClick={() => setShareOpen(false)} className="btn-secondary !py-1.5 !px-4 text-sm">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Attribution du projet au compte d'un client (admin) */}
      {attribOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-noir/45 animate-fade-in" onClick={() => setAttribOpen(false)} aria-hidden="true" />
          <div className="relative bg-white rounded-2xl shadow-[0_24px_64px_-16px_rgba(43,43,43,0.35)] w-full max-w-sm p-6 animate-scale-in">
            <h2 className="font-display text-xl text-noir mb-1">Attribuer à un client</h2>
            {attribState === 'done' ? (
              <div className="mt-3">
                <p className="text-sm text-vert-foret font-semibold">
                  ✓ Projet attribué au compte de {clientUserId ? clientSearch : clientEmail}.
                </p>
                <p className="text-xs text-noir/60 mt-1.5">
                  Il le retrouvera dans « Mes projets » et pourra le modifier.
                  {clientEmail && ' S’il n’a pas encore de mot de passe : « Mot de passe oublié » avec cet email, ou connexion Google sur le même email.'}
                </p>
                <div className="flex justify-end mt-4">
                  <button onClick={() => setAttribOpen(false)} className="btn-primary !py-2 !px-5 text-sm">Fermer</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-noir/60 mb-4">
                  Transfère ce projet sur le compte du client : il apparaîtra dans son espace « Mes projets » et il pourra le modifier.
                </p>
                {renderClientPicker()}
                {attribState === 'error' && (
                  <p className="mt-2 text-xs text-red-700 font-semibold">Erreur lors de l&apos;attribution — réessayez.</p>
                )}
                <div className="flex justify-end gap-2.5 mt-5">
                  <button onClick={() => setAttribOpen(false)} className="btn-secondary !py-2 !px-5 text-sm">Annuler</button>
                  <button
                    onClick={handleAttribuer}
                    disabled={attribState === 'busy' || (!clientUserId && !clientEmail)}
                    className="btn-primary !py-2 !px-5 text-sm disabled:opacity-50"
                  >
                    {attribState === 'busy' ? '…' : 'Attribuer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

            {/* Commercial : attribuer le projet au compte d'un client */}
            {isAdmin && (
              <div className="mt-4 p-3.5 bg-beige/60 rounded-xl">
                <p className="text-sm font-semibold text-noir mb-0.5">Attribuer à un client</p>
                <p className="text-xs text-noir/60 mb-2.5">Le projet apparaîtra dans « Mes projets » du client, qui pourra le modifier. Laissez vide pour le garder sur votre compte.</p>
                {renderClientPicker()}
              </div>
            )}
            <div className="flex justify-end gap-2.5 mt-5">
              <button type="button" onClick={() => setSaveState('idle')} className="btn-secondary !py-2 !px-5 text-sm">Annuler</button>
              <button type="submit" className="btn-primary !py-2 !px-5 text-sm">Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </div>
    </UnitProvider>
  );
}
