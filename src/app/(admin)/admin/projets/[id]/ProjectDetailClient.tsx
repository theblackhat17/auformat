'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  CompositionConfig,
  CompositionModule,
  ConfigurateurMaterial,
  ConfigurateurModuleType,
  ConfigurateurUnivers,
  Project,
  ProjectDocument,
  ProjectEvent,
  ProjectMilestone,
} from '@/lib/types';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_TYPE_ICONS,
  PROJECT_EVENT_TYPES,
} from '@/lib/constants';
import { DEFAULT_MILESTONES, currentMilestone, milestoneProgress } from '@/lib/project-config';
import { PROJECT_STAGE_TEMPLATES } from '@/lib/project-mail-templates';
import { getModuleType, moduleMaterial } from '@/components/configurateur-compo/pricingCompo';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ChatPanel } from '@/components/chat/ChatPanel';

type ClientInfo = { fullName: string | null; email: string; phone: string | null };

const TABS = [
  { key: 'apercu', label: 'Aperçu' },
  { key: 'etapes', label: 'Étapes' },
  { key: 'production', label: 'Production' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'documents', label: 'Documents' },
  { key: 'messagerie', label: 'Messagerie' },
  { key: 'notes', label: 'Notes' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** Fiche projet admin : jalons du cycle de vie, production, documents, messagerie, notes internes */
export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('apercu');
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function handleDelete() {
    if (!confirm('Supprimer définitivement ce projet ? Cette action est irréversible.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Projet supprimé');
      router.push('/admin/projets');
    } catch {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error();
        const p: Project = await res.json();
        if (cancelled) return;
        setProject(p);
        if (p.userId) {
          const cRes = await fetch(`/api/admin/clients/${p.userId}`);
          if (cRes.ok) {
            const d = await cRes.json();
            if (!cancelled && d.client) {
              setClient({ fullName: d.client.fullName || null, email: d.client.email, phone: d.client.phone || null });
            }
          }
        }
      } catch {
        if (!cancelled) toast.error('Erreur chargement du projet');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  if (!project) {
    return (
      <div className="text-center py-16 bg-gray-50/70 rounded-2xl">
        <p className="text-sm text-noir/45">Projet introuvable.</p>
        <Link href="/admin/projets" className="text-sm text-vert-foret hover:underline mt-2 inline-block">← Retour au suivi des projets</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div>
        <Link href="/admin/projets" className="inline-flex items-center gap-1 text-sm text-noir/50 hover:text-vert-foret mb-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Suivi des projets
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl" aria-hidden="true">{PROJECT_TYPE_ICONS[project.type] || '🎨'}</span>
          <h1 className="text-2xl font-bold text-noir">{project.name}</h1>
          <Badge variant={PROJECT_STATUS_COLORS[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          <div className="ml-auto flex items-center gap-2">
            <Link href={`/configurateur?project=${project.id}`} className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-noir/70 hover:border-vert-foret hover:text-vert-foret transition-colors">
              Ouvrir le configurateur
            </Link>
            <button onClick={handleDelete} disabled={deleting} className="text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </div>
        <p className="text-sm text-noir/50 mt-1">
          {client ? `${client.fullName || client.email}${client.fullName ? ` · ${client.email}` : ''}` : 'Sans client'}
        </p>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 flex gap-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key ? 'border-vert-foret text-vert-foret' : 'border-transparent text-noir/40 hover:text-noir/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'apercu' && <ApercuTab project={project} client={client} />}
      {activeTab === 'etapes' && <EtapesTab project={project} onUpdated={(milestones) => setProject((prev) => prev ? { ...prev, milestones } : prev)} />}
      {activeTab === 'production' && <ProductionTab project={project} />}
      {activeTab === 'agenda' && <AgendaTab projectId={project.id} />}
      {activeTab === 'documents' && <DocumentsTab projectId={project.id} />}
      {activeTab === 'messagerie' && (
        <div className="space-y-4">
          <NotifyClientCard projectId={project.id} clientEmail={client?.email || null} />
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <ChatPanel projectId={project.id} viewerRole="admin" />
          </div>
        </div>
      )}
      {activeTab === 'notes' && <NotesTab project={project} onSaved={(adminNotes) => setProject((prev) => prev ? { ...prev, adminNotes } : prev)} />}
    </div>
  );
}

/** Aperçu : coordonnées du client, accès rapides */
function ApercuTab({ project, client }: { project: Project; client: ClientInfo | null }) {
  const toast = useToast();
  const [inviting, setInviting] = useState(false);

  async function handleInvite() {
    if (!client?.email) return;
    setInviting(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: client.email, fullName: client.fullName || '', sendInvite: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Erreur lors de l'envoi de l'invitation");
        return;
      }
      toast.success("E-mail d'accès envoyé");
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-3">Client</p>
        {client ? (
          <div className="space-y-1.5 text-sm text-noir/70">
            <p><span className="text-noir/40">Nom :</span> {client.fullName || '—'}</p>
            <p><span className="text-noir/40">Email :</span> {client.email}</p>
            <p><span className="text-noir/40">Téléphone :</span> {client.phone || '—'}</p>
          </div>
        ) : (
          <p className="text-sm text-noir/45">Aucun client associé à ce projet.</p>
        )}
        {project.userId && (
          <Link href={`/admin/clients/${project.userId}`} className="inline-block text-sm text-vert-foret hover:underline mt-3">
            Voir la fiche client →
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-3">Projet</p>
        <div className="space-y-1.5 text-sm text-noir/70 mb-4">
          <p><span className="text-noir/40">Type :</span> {PROJECT_TYPE_ICONS[project.type] || '🎨'} {project.type}</p>
          <p><span className="text-noir/40">Créé le :</span> {formatDate(project.createdAt)}</p>
          <p><span className="text-noir/40">Dernière maj :</span> {formatDate(project.updatedAt)}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href={`/configurateur?project=${project.id}`}>
            <Button size="sm" className="w-full">Ouvrir dans le configurateur</Button>
          </Link>
          {client?.email && (
            <Button variant="outline" size="sm" className="w-full" onClick={handleInvite} isLoading={inviting}>
              Inviter le client (envoyer son accès)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Étapes : progression visuelle du cycle de vie — timeline verticale cliquable (jalons configurables) */
function EtapesTab({ project, onUpdated }: { project: Project; onUpdated: (milestones: NonNullable<Project['milestones']>) => void }) {
  const toast = useToast();
  const [catalog, setCatalog] = useState<ProjectMilestone[] | null>(null);
  /** Bascules optimistes en attente de confirmation serveur : { [key]: done souhaité } */
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/project-settings')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled) setCatalog(Array.isArray(d.milestones) && d.milestones.length > 0 ? d.milestones : DEFAULT_MILESTONES);
      })
      .catch(() => { if (!cancelled) setCatalog(DEFAULT_MILESTONES); });
    return () => { cancelled = true; };
  }, []);

  const milestones = catalog ?? DEFAULT_MILESTONES;
  const isDone = (key: string) => (key in optimistic ? optimistic[key] : project.milestones?.[key]?.done === true);

  // Vue « effective » (état serveur + bascules optimistes) pour la progression et le jalon courant
  const effective: Pick<Project, 'milestones'> = {
    milestones: Object.fromEntries(milestones.map((m) => [m.key, { ...(project.milestones?.[m.key] || {}), done: isDone(m.key) }])),
  };
  const progress = milestoneProgress(effective, milestones);
  const current = currentMilestone(effective, milestones);
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  async function toggle(key: string) {
    if (pending) return;
    const next = !isDone(key);
    setOptimistic((prev) => ({ ...prev, [key]: next }));
    setPending(key);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, done: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la mise à jour');
        return;
      }
      onUpdated(data.milestones || {});
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setOptimistic((prev) => {
        const rest = { ...prev };
        delete rest[key];
        return rest;
      });
      setPending(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 max-w-2xl">
      {/* En-tête de progression */}
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-noir">Avancement du projet</p>
        <p className="text-sm font-semibold text-vert-foret" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {progress.done} / {progress.total} étapes
        </p>
      </div>
      <div
        className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avancement du projet"
      >
        <div className="h-full bg-vert-foret rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-noir/50 mb-6">
        Cliquez sur une étape pour la valider (ou l&apos;annuler). Les jalons « interne » ne sont jamais visibles par le client.
      </p>

      {catalog === null ? (
        <p className="text-sm text-noir/40">Chargement des jalons…</p>
      ) : (
        <ol>
          {milestones.map((m, i) => {
            const done = isDone(m.key);
            const isCurrent = current?.key === m.key;
            const date = project.milestones?.[m.key]?.date;
            const isLast = i === milestones.length - 1;
            const nextDone = !isLast && isDone(milestones[i + 1].key);
            return (
              <li key={m.key} className="relative">
                {/* Connecteur vertical vers l'étape suivante */}
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className={`absolute left-[17px] top-11 bottom-0 w-0.5 rounded-full transition-colors duration-500 ${
                      done && nextDone ? 'bg-vert-foret' : 'bg-gray-200'
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => toggle(m.key)}
                  disabled={pending !== null}
                  aria-pressed={done}
                  className={`group w-full flex items-start gap-4 text-left py-2 ${pending === m.key ? 'cursor-wait' : 'cursor-pointer'}`}
                >
                  {/* Nœud */}
                  <span
                    className={`relative z-[1] flex items-center justify-center w-9 h-9 shrink-0 rounded-full border-2 transition-all duration-300 ${
                      done
                        ? 'bg-vert-foret border-vert-foret text-white'
                        : 'bg-white border-gray-300 group-hover:border-vert-foret/60 group-hover:scale-105'
                    } ${isCurrent ? 'ring-4 ring-vert-foret/15' : ''}`}
                  >
                    {done ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-vert-foret/50 transition-colors duration-300" aria-hidden="true" />
                    )}
                  </span>
                  {/* Libellé + badges + date */}
                  <span className="flex-1 min-w-0 pt-1.5 pb-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm transition-colors duration-300 ${
                          isCurrent ? 'font-semibold text-vert-foret' : done ? 'font-medium text-noir' : 'text-noir/55 group-hover:text-noir/80'
                        }`}
                      >
                        {m.label}
                      </span>
                      {m.financial && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">interne</span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide bg-vert-foret/10 text-vert-foret px-1.5 py-0.5 rounded">étape actuelle</span>
                      )}
                    </span>
                    {done && date && <span className="block text-xs text-noir/40 mt-0.5">Franchie le {formatDate(date)}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Catalogue configurateur nécessaire au récapitulatif technique */
type ConfigurateurCatalog = {
  moduleTypes: ConfigurateurModuleType[];
  materials: ConfigurateurMaterial[];
  universList: ConfigurateurUnivers[];
};

/** Production : récapitulatif technique (lecture seule, sans prix) de ce que le client a configuré */
function ProductionTab({ project }: { project: Project }) {
  const [catalog, setCatalog] = useState<ConfigurateurCatalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/content/configurateur')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        setCatalog({
          moduleTypes: Array.isArray(d.module_types) ? d.module_types : [],
          materials: Array.isArray(d.materials) ? d.materials : [],
          universList: Array.isArray(d.univers) ? d.univers : [],
        });
      })
      .catch(() => { if (!cancelled) setCatalog({ moduleTypes: [], materials: [], universList: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const config = asCompositionConfig(project.config);

  if (loading || !catalog) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-3xl">
        <p className="text-sm text-noir/40">Chargement de la configuration…</p>
      </div>
    );
  }

  if (!config || config.modules.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-3xl text-center">
        <p className="text-sm text-noir/45">Aucune configuration détaillée pour ce projet.</p>
        <p className="text-xs text-noir/35 mt-1">Le récapitulatif s&apos;affiche dès que le projet contient une composition du configurateur.</p>
      </div>
    );
  }

  const { moduleTypes, materials, universList } = catalog;
  const universInfo = universList.find((u) => u.slug === config.univers);
  const mainMaterial = materials[config.materialIndex];
  // Modules chiffrables (hors éléments d'environnement : fenêtre, porte, radiateur…)
  const chiffrables = config.modules.filter((mod) => !getModuleType(moduleTypes, mod.typeSlug)?.decor);
  // Linéaire total : largeurs cumulées des modules posés (les modules empilés ne s'ajoutent pas)
  const lineaireMm = chiffrables.reduce((sum, mod) => (mod.empileSur ? sum : sum + mod.largeur), 0);
  const lineaireM = (lineaireMm / 1000).toFixed(2).replace('.', ',');

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Vue d'ensemble */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-1">Configuration du client</p>
        <p className="text-xs text-noir/50 mb-4">Récapitulatif technique en lecture seule, issu du configurateur — sans chiffrage.</p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-noir/70">
          <p><span className="text-noir/40">Univers :</span> <span className="font-medium text-noir">{universInfo?.nom || config.univers}</span></p>
          <p><span className="text-noir/40">Matériau principal :</span> <span className="font-medium text-noir">{mainMaterial?.name || '—'}</span></p>
          <p>
            <span className="text-noir/40">Plan de travail :</span>{' '}
            {config.planTravail
              ? `Oui${config.planMaterialIndex != null && materials[config.planMaterialIndex] ? ` — ${materials[config.planMaterialIndex].name}` : ''}`
              : 'Non'}
          </p>
          <p>
            <span className="text-noir/40">Façade coulissante :</span>{' '}
            {config.facadeCoulissante ? `Oui${config.facadeVantaux ? ` — ${config.facadeVantaux} vantaux` : ''}` : 'Non'}
          </p>
          {config.hauteurPlafond != null && (
            <p><span className="text-noir/40">Hauteur sous plafond :</span> {config.hauteurPlafond} mm</p>
          )}
          <p><span className="text-noir/40">Linéaire total :</span> {lineaireM} m</p>
        </div>
      </div>

      {/* Détail des modules */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-3">
          Modules ({chiffrables.length}{config.modules.length > chiffrables.length ? ` + ${config.modules.length - chiffrables.length} élément(s) d'environnement` : ''})
        </p>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs text-noir/40 uppercase tracking-wide border-b border-gray-200">
                <th className="py-2 pr-3 font-semibold">N°</th>
                <th className="py-2 pr-3 font-semibold">Module</th>
                <th className="py-2 pr-3 font-semibold">L × H × P (mm)</th>
                <th className="py-2 pr-3 font-semibold">Matériau</th>
                <th className="py-2 font-semibold">Options &amp; détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {config.modules.map((mod, i) => {
                const type = getModuleType(moduleTypes, mod.typeSlug);
                const isDecor = type?.decor === true;
                const material = isDecor ? undefined : moduleMaterial(materials, config, mod.materialIndex);
                const facadeMat = mod.facadeMaterialIndex != null ? materials[mod.facadeMaterialIndex] : undefined;
                const opts = (type?.options || [])
                  .filter((o) => (mod.options[o.slug] ?? 0) > 0)
                  .map((o) => (o.type === 'compteur' ? `${o.nom} ×${mod.options[o.slug]}` : o.nom));
                const flags = moduleFlags(mod);
                return (
                  <tr key={mod.id} className="align-top">
                    <td className="py-2.5 pr-3 text-noir/40" style={{ fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-noir">{type?.nom || mod.typeSlug}</span>
                      {isDecor && (
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-noir/35 mt-0.5">Environnement (non chiffré)</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-noir/70" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {mod.largeur} × {mod.hauteur} × {mod.profondeur}
                    </td>
                    <td className="py-2.5 pr-3 text-noir/70">
                      {isDecor ? '—' : material?.name || '—'}
                      {!isDecor && facadeMat && <span className="block text-xs text-noir/45 mt-0.5">Façades : {facadeMat.name}</span>}
                    </td>
                    <td className="py-2.5 text-noir/70">
                      {opts.length > 0 ? opts.join(', ') : '—'}
                      {flags.length > 0 && (
                        <span className="block text-xs text-vert-foret/80 mt-0.5">{flags.join(' · ')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Vérifie que la config du projet est une composition v2 exploitable */
function asCompositionConfig(value: unknown): CompositionConfig | null {
  if (!value || typeof value !== 'object') return null;
  const c = value as Partial<CompositionConfig>;
  if (c.version !== 2 || !Array.isArray(c.modules)) return null;
  return c as CompositionConfig;
}

/** Particularités notables d'un module (fusion, bandeau, empilement, grille bibliothèque) */
function moduleFlags(mod: CompositionModule): string[] {
  const flags: string[] = [];
  if (mod.fusionSuivant) flags.push('Fusionné avec le module suivant');
  if (mod.bandeau) flags.push(mod.bandeauHauteur != null ? `Bandeau de finition (${mod.bandeauHauteur} mm)` : 'Bandeau de finition (jusqu’au plafond)');
  if (mod.empileSur) flags.push('Empilé sur un autre module');
  if (mod.grille && mod.grille.colonnes >= 1) flags.push(`Grille bibliothèque : ${mod.grille.colonnes} colonne${mod.grille.colonnes > 1 ? 's' : ''}`);
  return flags;
}

// =============================================
// Agenda du projet (RDV client, jours d'atelier)
// =============================================

/** Valeurs du formulaire d'événement (dates au format des inputs natifs, heure locale) */
type EventFormValues = {
  type: string;
  allDay: boolean;
  start: string; // datetime-local ("YYYY-MM-DDTHH:mm") ou date ("YYYY-MM-DD") si allDay
  end: string;   // idem, optionnel
  title: string;
  notes: string;
};

/** ISO → valeur d'<input type="datetime-local"> en heure locale */
function isoToDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO → valeur d'<input type="date"> en heure locale */
function isoToDateLocal(iso: string): string {
  return isoToDateTimeLocal(iso).slice(0, 10);
}

/** Valeur d'input (locale) → ISO UTC pour l'API. allDay : minuit local (fin : 23h59 local). */
function inputToIso(value: string, allDay: boolean, isEnd = false): string {
  const d = allDay ? new Date(`${value}T${isEnd ? '23:59' : '00:00'}`) : new Date(value);
  return d.toISOString();
}

/** Charge utile POST/PATCH construite depuis le formulaire */
function eventPayload(values: EventFormValues) {
  return {
    type: values.type,
    startAt: inputToIso(values.start, values.allDay),
    endAt: values.end ? inputToIso(values.end, values.allDay, true) : null,
    allDay: values.allDay,
    title: values.title.trim() || null,
    notes: values.notes.trim() || null,
  };
}

/** Date d'un événement en français (jour entier ou date + heure, plage si fin renseignée) */
function eventDateLabel(event: ProjectEvent): string {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;
  const dayFmt: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const startDay = start.toLocaleDateString('fr-FR', dayFmt);
  if (event.allDay) {
    if (end && end.toDateString() !== start.toDateString()) {
      return `Du ${startDay} au ${end.toLocaleDateString('fr-FR', dayFmt)} (journée entière)`;
    }
    return `${startDay} (journée entière)`;
  }
  const time = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (end) {
    if (end.toDateString() === start.toDateString()) return `${startDay}, de ${time(start)} à ${time(end)}`;
    return `Du ${startDay} ${time(start)} au ${end.toLocaleDateString('fr-FR', dayFmt)} ${time(end)}`;
  }
  return `${startDay} à ${time(start)}`;
}

/** Formulaire d'événement partagé entre création et édition */
function EventForm({
  initial,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: ProjectEvent;
  saving: boolean;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => void;
  onCancel?: () => void;
}) {
  const [type, setType] = useState(initial?.type || PROJECT_EVENT_TYPES[0].key);
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  const [start, setStart] = useState(() =>
    initial ? (initial.allDay ? isoToDateLocal(initial.startAt) : isoToDateTimeLocal(initial.startAt)) : ''
  );
  const [end, setEnd] = useState(() =>
    initial?.endAt ? (initial.allDay ? isoToDateLocal(initial.endAt) : isoToDateTimeLocal(initial.endAt)) : ''
  );
  const [title, setTitle] = useState(initial?.title || '');
  const [notes, setNotes] = useState(initial?.notes || '');

  /** Bascule journée entière : convertit les valeurs saisies sans les perdre */
  function toggleAllDay(next: boolean) {
    setAllDay(next);
    if (next) {
      setStart((v) => v.slice(0, 10));
      setEnd((v) => v.slice(0, 10));
    } else {
      setStart((v) => (v && v.length === 10 ? `${v}T09:00` : v));
      setEnd((v) => (v && v.length === 10 ? `${v}T18:00` : v));
    }
  }

  const inputClass = 'px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!start) return;
        onSubmit({ type, allDay, start, end, title, notes });
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-noir/60">
          Type d&apos;événement
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {PROJECT_EVENT_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-noir/60">
          Début
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-noir/60">
          Fin (optionnel)
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-noir/70 pb-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => toggleAllDay(e.target.checked)}
            className="w-4 h-4 accent-[#2C5F2D]"
          />
          Journée entière
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Titre (optionnel)"
          className={`${inputClass} flex-1 min-w-[180px]`}
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          placeholder="Notes internes (optionnel)"
          className={`${inputClass} flex-1 min-w-[220px]`}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" isLoading={saving} disabled={!start}>{submitLabel}</Button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-noir/50 hover:text-noir/80 px-2 py-1">
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

/** Agenda : RDV client et jours d'atelier planifiés sur le projet */
function AgendaTab({ projectId }: { projectId: string }) {
  const toast = useToast();
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/events`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      toast.error("Erreur chargement de l'agenda");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/projects/${projectId}/events`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setEvents(Array.isArray(d.events) ? d.events : []); })
      .catch(() => { if (!cancelled) toast.error("Erreur chargement de l'agenda"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleCreate(values: EventFormValues) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload(values)),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || "Erreur lors de l'ajout");
        return;
      }
      toast.success("Date ajoutée à l'agenda");
      await refresh();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(eventId: string, values: EventFormValues) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/events`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ...eventPayload(values) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || 'Erreur lors de la mise à jour');
        return;
      }
      toast.success('Événement mis à jour');
      setEditingId(null);
      await refresh();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event: ProjectEvent) {
    const label = PROJECT_EVENT_TYPES.find((t) => t.key === event.type)?.label || event.type;
    if (!confirm(`Supprimer « ${label} » du ${eventDateLabel(event)} ?`)) return;
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/events`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      });
      if (!res.ok) {
        toast.error('Erreur lors de la suppression');
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      toast.success('Événement supprimé');
    } catch {
      toast.error('Erreur réseau');
    }
  }

  const now = Date.now();
  const sorted = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const isPast = (e: ProjectEvent) => new Date(e.endAt || e.startAt).getTime() < now && !(e.allDay && new Date(e.startAt).toDateString() === new Date().toDateString());
  const upcoming = sorted.filter((e) => !isPast(e));
  const past = sorted.filter(isPast).reverse();

  function renderEvent(event: ProjectEvent, faded: boolean) {
    const typeInfo = PROJECT_EVENT_TYPES.find((t) => t.key === event.type);
    if (editingId === event.id) {
      return (
        <li key={event.id} className="py-3">
          <EventForm
            initial={event}
            saving={saving}
            submitLabel="Enregistrer"
            onSubmit={(values) => handleUpdate(event.id, values)}
            onCancel={() => setEditingId(null)}
          />
        </li>
      );
    }
    return (
      <li key={event.id} className={`flex items-start gap-3 py-3 ${faded ? 'opacity-60' : ''}`}>
        <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: typeInfo?.color || '#999' }} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-semibold text-noir">{typeInfo?.label || event.type}</span>
            {typeInfo && !typeInfo.clientVisible && (
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded align-middle">interne</span>
            )}
          </p>
          <p className="text-sm text-noir/70">{eventDateLabel(event)}</p>
          {event.title && <p className="text-sm text-noir/70 mt-0.5">{event.title}</p>}
          {event.notes && <p className="text-xs text-noir/45 mt-0.5">{event.notes}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setEditingId(event.id)} className="text-sm text-vert-foret hover:underline">Modifier</button>
          <button onClick={() => handleDelete(event)} className="text-sm text-red-600 hover:text-red-700 hover:underline">Supprimer</button>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Ajout d'une date */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-1">+ Ajouter une date</p>
        <p className="text-xs text-noir/50 mb-4">RDV client ou jour d&apos;atelier. Les jours d&apos;atelier restent internes, jamais visibles par le client.</p>
        <div className="p-3 bg-beige/50 rounded-xl">
          <EventForm saving={saving} submitLabel="Ajouter" onSubmit={handleCreate} />
        </div>
      </div>

      {/* Liste des événements */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-noir">Dates planifiées</p>
          <Link href="/admin/agenda" className="text-sm text-vert-foret hover:underline">Voir l&apos;agenda global →</Link>
        </div>
        {loading ? (
          <p className="text-sm text-noir/40">Chargement…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-noir/45">Aucune date planifiée pour ce projet.</p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-noir/40 mb-1">À venir</p>
                <ul className="divide-y divide-gray-100 mb-4">{upcoming.map((e) => renderEvent(e, false))}</ul>
              </>
            )}
            {past.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-noir/40 mb-1">Passées</p>
                <ul className="divide-y divide-gray-100">{past.map((e) => renderEvent(e, true))}</ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Documents : plans, devis signés… visibles par le client ou internes */
function DocumentsTab({ projectId }: { projectId: string }) {
  const toast = useToast();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState<'client' | 'admin'>('client');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/documents`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setDocuments(Array.isArray(d.documents) ? d.documents : []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('visibility', visibility);
      try {
        const res = await fetch(`/api/admin/projects/${projectId}/documents`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || `Erreur sur « ${file.name} »`);
          continue;
        }
        setDocuments((prev) => [data.document, ...prev]);
      } catch {
        toast.error('Erreur réseau');
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleDelete(doc: ProjectDocument) {
    if (!confirm(`Supprimer le document « ${doc.name} » ?`)) return;
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      });
      if (!res.ok) {
        toast.error('Erreur lors de la suppression');
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success('Document supprimé');
    } catch {
      toast.error('Erreur réseau');
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-2xl">
      <p className="text-sm font-semibold text-noir mb-4">Documents du projet</p>

      {/* Upload */}
      <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-beige/50 rounded-xl">
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value === 'client' ? 'client' : 'admin')}
          className="px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret"
          aria-label="Visibilité du document"
        >
          <option value="client">Visible par le client</option>
          <option value="admin">Interne (admin seulement)</option>
        </select>
        <Button size="sm" onClick={() => fileRef.current?.click()} isLoading={uploading}>
          Ajouter un document
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          hidden
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-noir/40">Chargement…</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-noir/45">Aucun document pour ce projet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5">
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-sm text-noir hover:text-vert-foret hover:underline truncate">
                {doc.name}
              </a>
              <Badge variant={doc.visibility === 'client' ? 'success' : 'default'}>
                {doc.visibility === 'client' ? 'Client' : 'Interne'}
              </Badge>
              <span className="text-xs text-noir/40 hidden sm:block">{formatDate(doc.createdAt)}</span>
              <button
                onClick={() => handleDelete(doc)}
                aria-label={`Supprimer ${doc.name}`}
                className="text-sm text-red-600 hover:text-red-700 hover:underline"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Prévenir le client d'une grande étape par e-mail (modèles prédéfinis, jamais de prix) */
function NotifyClientCard({ projectId, clientEmail }: { projectId: string; clientEmail: string | null }) {
  const toast = useToast();
  const [templateKey, setTemplateKey] = useState(PROJECT_STAGE_TEMPLATES[0]?.key || '');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!templateKey || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateKey, customMessage: customMessage.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || "Erreur lors de l'envoi de l'e-mail");
        return;
      }
      toast.success('E-mail envoyé au client');
      setCustomMessage('');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-noir">Prévenir le client d&apos;une étape</p>
      <p className="text-xs text-noir/50 mb-3">Envoie un e-mail soigné au client pour annoncer une grande avancée — jamais de prix.</p>
      {clientEmail ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
            className="px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret"
            aria-label="Modèle d'e-mail"
          >
            {PROJECT_STAGE_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            maxLength={500}
            placeholder="Message personnalisé (optionnel)"
            className="flex-1 min-w-[220px] px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret"
          />
          <Button size="sm" onClick={handleSend} isLoading={sending}>
            Envoyer l&apos;e-mail
          </Button>
        </div>
      ) : (
        <p className="text-sm text-noir/45">Aucun client avec une adresse e-mail n&apos;est associé à ce projet.</p>
      )}
    </div>
  );
}

/** Notes internes admin — jamais visibles par le client. Autosave différé + aperçu Markdown. */
function NotesTab({ project, onSaved }: { project: Project; onSaved: (adminNotes: string) => void }) {
  const toast = useToast();
  const [notes, setNotes] = useState(project.adminNotes || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: notes }),
      });
      if (!res.ok) throw new Error();
      onSaved(notes);
      toast.success('Notes enregistrées');
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-3xl">
      <label htmlFor="admin-notes" className="block text-sm font-semibold text-noir mb-1">
        Notes privées — jamais visibles par le client
      </label>
      <p className="text-xs text-noir/50 mb-3">Contraintes de pose, points de vigilance, historique des échanges téléphoniques…</p>
      <textarea
        id="admin-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Écrivez vos notes internes ici…"
        className="w-full min-h-[320px] px-4 py-3 bg-white border border-noir/20 rounded-lg text-sm leading-relaxed resize-y focus:outline-none focus:border-vert-foret mb-3"
      />
      <Button size="sm" onClick={save} isLoading={saving} disabled={notes === (project.adminNotes || '')}>
        Enregistrer
      </Button>
    </div>
  );
}
