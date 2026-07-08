'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  ProjectStatus,
  ProjectUpdate,
  Quote,
} from '@/lib/types';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_TYPE_ICONS,
  PROJECT_EVENT_TYPES,
  PROJECT_PRODUCTION_TASKS,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
} from '@/lib/constants';
import { DEFAULT_MILESTONES, currentMilestone, milestoneProgress, isClientVisible } from '@/lib/project-config';
import { createStarterConfig } from '@/components/configurateur-compo/useComposition';
import { PROJECT_STAGE_TEMPLATES } from '@/lib/project-mail-templates';
import { getModuleType, moduleMaterial } from '@/components/configurateur-compo/pricingCompo';
import { computeDebit } from '@/lib/debit';
import { CuttingPlan } from '@/components/debit/CuttingPlan';
import { formatDate, formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ChatPanel } from '@/components/chat/ChatPanel';

type ClientInfo = { fullName: string | null; email: string; phone: string | null };

const TABS = [
  { key: 'apercu', label: 'Aperçu' },
  { key: 'etapes', label: 'Étapes' },
  { key: 'suivi', label: 'Suivi client' },
  { key: 'production', label: 'Production' },
  { key: 'devis', label: 'Devis' },
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
  const [catalog, setCatalog] = useState<ProjectMilestone[]>([]);
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

  /** (Re)charge le projet et les coordonnées de son client propriétaire. */
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) throw new Error();
    const p: Project = await res.json();
    setProject(p);
    if (p.userId) {
      const cRes = await fetch(`/api/admin/clients/${p.userId}`);
      if (cRes.ok) {
        const d = await cRes.json();
        setClient(d.client ? { fullName: d.client.fullName || null, email: d.client.email, phone: d.client.phone || null } : null);
      }
    } else {
      setClient(null);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        fetch('/api/admin/project-settings')
          .then((r) => r.json())
          .then((d) => { if (!cancelled) setCatalog(Array.isArray(d.milestones) ? d.milestones : []); })
          .catch(() => {});
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
          <Badge variant={PROJECT_STATUS_COLORS[project.status]}>{currentMilestone(project, catalog)?.label ?? 'Nouveau projet'}</Badge>
          <div className="ml-auto flex items-center gap-2">
            {project.type !== 'libre' && (
              <Link href={`/configurateur?project=${project.id}`} className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-noir/70 hover:border-vert-foret hover:text-vert-foret transition-colors">
                Ouvrir le configurateur
              </Link>
            )}
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

      {activeTab === 'apercu' && <ApercuTab project={project} client={client} onChanged={refresh} onOpenNotes={() => setActiveTab('notes')} onOpenAgenda={() => setActiveTab('agenda')} />}
      {activeTab === 'etapes' && <EtapesTab project={project} onUpdated={(milestones) => setProject((prev) => prev ? { ...prev, milestones } : prev)} />}
      {activeTab === 'suivi' && <SuiviTab projectId={project.id} onStageChanged={(milestones, status) => setProject((prev) => prev ? { ...prev, milestones, status } : prev)} />}
      {activeTab === 'production' && <ProductionTab project={project} />}
      {activeTab === 'devis' && <DevisTab project={project} />}
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

/** Aperçu : coordonnées du client, attribution/création de compte, récap notes + dates, accès rapides */
function ApercuTab({ project, client, onChanged, onOpenNotes, onOpenAgenda }: {
  project: Project;
  client: ClientInfo | null;
  onChanged: () => Promise<void>;
  onOpenNotes: () => void;
  onOpenAgenda: () => void;
}) {
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
      toast.success("E-mail d'accès renvoyé à " + client.email);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
    <div className="grid md:grid-cols-2 gap-4">
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
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {project.userId && (
            <Link href={`/admin/clients/${project.userId}`} className="text-sm text-vert-foret hover:underline">
              Voir la fiche client →
            </Link>
          )}
          {client?.email && (
            <button onClick={handleInvite} disabled={inviting} className="text-sm text-noir/50 hover:text-vert-foret disabled:opacity-50 transition-colors">
              {inviting ? 'Envoi…' : "Renvoyer l'accès"}
            </button>
          )}
        </div>

        {/* Attribuer / changer le client propriétaire du projet */}
        <AssignClientForm project={project} currentEmail={client?.email || null} onChanged={onChanged} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-3">Projet</p>
        <div className="space-y-1.5 text-sm text-noir/70 mb-4">
          <p><span className="text-noir/40">Type :</span> {PROJECT_TYPE_ICONS[project.type] || '🎨'} {project.type}</p>
          <p><span className="text-noir/40">Créé le :</span> {formatDate(project.createdAt)}</p>
          <p><span className="text-noir/40">Dernière maj :</span> {formatDate(project.updatedAt)}</p>
        </div>
        {project.type !== 'libre' ? (
          <div className="flex flex-col gap-2">
            <Link href={`/configurateur?project=${project.id}`}>
              <Button size="sm" className="w-full">Ouvrir dans le configurateur</Button>
            </Link>
          </div>
        ) : (
          <ConvertToConfigurateur project={project} onChanged={onChanged} />
        )}
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      {/* Récap des notes internes (édition dans l'onglet Notes) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-noir">Notes internes</p>
          <button onClick={onOpenNotes} className="text-sm text-vert-foret hover:underline">Modifier →</button>
        </div>
        {project.adminNotes?.trim() ? (
          <p className="text-sm text-noir/75 whitespace-pre-line max-h-56 overflow-y-auto">{project.adminNotes}</p>
        ) : (
          <p className="text-sm text-noir/45">Aucune note pour l&apos;instant — ajoutez-en dans l&apos;onglet Notes.</p>
        )}
      </div>

      {/* Dates fixées avec le client (agenda du projet) */}
      <ApercuDatesCard projectId={project.id} onOpenAgenda={onOpenAgenda} />
    </div>
    </div>
  );
}

/** Prochaines dates du projet (RDV client, pose…) — récap lecture seule de l'agenda */
function ApercuDatesCard({ projectId, onOpenAgenda }: { projectId: string; onOpenAgenda: () => void }) {
  const [events, setEvents] = useState<ProjectEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/projects/${projectId}/events`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        // Dates à venir (on garde aussi celles d'hier pour le contexte), 5 max
        const cutoff = Date.now() - 24 * 3600 * 1000;
        const all: ProjectEvent[] = Array.isArray(d.events) ? d.events : [];
        setEvents(
          all
            .filter((e) => new Date(e.endAt || e.startAt).getTime() >= cutoff)
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
            .slice(0, 5)
        );
      })
      .catch(() => { if (!cancelled) setEvents([]); });
    return () => { cancelled = true; };
  }, [projectId]);

  const upcoming = events || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-noir">Dates prévues</p>
        <button onClick={onOpenAgenda} className="text-sm text-vert-foret hover:underline">Agenda →</button>
      </div>
      {events === null ? (
        <p className="text-sm text-noir/40">Chargement…</p>
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-noir/45">Aucune date à venir — planifiez un RDV dans l&apos;onglet Agenda.</p>
      ) : (
        <ul className="space-y-2.5">
          {upcoming.map((e) => {
            const t = PROJECT_EVENT_TYPES.find((x) => x.key === e.type);
            return (
              <li key={e.id} className="flex items-start gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: t?.color || '#999' }} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-noir truncate">
                    {e.title || t?.label || e.type}
                    {t && !t.clientVisible && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded align-middle">interne</span>
                    )}
                  </p>
                  <p className="text-xs text-noir/55">{eventDateLabel(e)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Transforme un projet « libre » (sans configurateur) en projet configurateur :
 * on choisit un univers, une composition de départ est créée, et le bouton
 * « Ouvrir dans le configurateur » apparaît.
 */
function ConvertToConfigurateur({ project, onChanged }: { project: Project; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const [catalog, setCatalog] = useState<{ universList: ConfigurateurUnivers[]; moduleTypes: ConfigurateurModuleType[] } | null>(null);
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/content/configurateur')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        const universList: ConfigurateurUnivers[] = (Array.isArray(d.univers) ? d.univers : []).filter((u: ConfigurateurUnivers) => u.actif !== false);
        setCatalog({ universList, moduleTypes: Array.isArray(d.module_types) ? d.module_types : [] });
        if (universList.length > 0) setSlug(universList[0].slug);
      })
      .catch(() => { if (!cancelled) setCatalog({ universList: [], moduleTypes: [] }); });
    return () => { cancelled = true; };
  }, []);

  async function convert() {
    const univers = catalog?.universList.find((u) => u.slug === slug);
    if (!univers) return;
    setBusy(true);
    try {
      const config = createStarterConfig(univers, catalog?.moduleTypes || [], 0);
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: univers.slug, config }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Projet transformé en projet configurateur (${univers.nom}).`);
      await onChanged();
    } catch {
      toast.error('Erreur lors de la transformation');
    } finally {
      setBusy(false);
    }
  }

  if (!catalog) return <p className="text-xs text-noir/40">Chargement du configurateur…</p>;
  if (catalog.universList.length === 0) return null;

  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="text-xs text-noir/55 mb-2">
        Projet sans configurateur. Transformez-le pour le composer visuellement (une composition de départ sera créée).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="flex-1 min-w-[140px] px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret"
          aria-label="Univers du configurateur"
        >
          {catalog.universList.map((u) => <option key={u.slug} value={u.slug}>{u.nom}</option>)}
        </select>
        <Button size="sm" onClick={convert} isLoading={busy}>Transformer en projet configurateur</Button>
      </div>
    </div>
  );
}

/**
 * Attribue le projet à un client : crée le compte (email + nom + tél) s'il n'existe pas,
 * envoie l'e-mail de définition du mot de passe, puis réattribue le projet à ce compte.
 * Le client pourra aussi se connecter via Google (même e-mail) sans définir de mot de passe.
 */
function AssignClientForm({ project, currentEmail, onChanged }: { project: Project; currentEmail: string | null; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      toast.error('E-mail client invalide');
      return;
    }
    setBusy(true);
    try {
      // 1) Créer (ou compléter) le compte client et envoyer l'accès
      const cRes = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, fullName: name.trim(), phone: phone.trim() || undefined, sendInvite }),
      });
      const cData = await cRes.json().catch(() => null);
      if (!cRes.ok || !cData?.id) {
        toast.error(cData?.error || 'Impossible de créer le compte client');
        return;
      }
      // 2) Réattribuer le projet à ce client
      const pRes = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientUserId: cData.id }),
      });
      if (!pRes.ok) {
        const pData = await pRes.json().catch(() => null);
        toast.error(pData?.error || 'Compte créé, mais réattribution du projet impossible');
        return;
      }
      toast.success(
        sendInvite
          ? `Projet attribué à ${mail} — e-mail d'accès envoyé (mot de passe ou Google).`
          : `Projet attribué à ${mail}.`
      );
      setOpen(false);
      setEmail(''); setName(''); setPhone('');
      await onChanged();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 w-full text-sm font-medium px-3 py-2 rounded-lg border border-dashed border-gray-300 text-noir/60 hover:border-vert-foret hover:text-vert-foret transition-colors"
      >
        {currentEmail ? '↳ Changer le client / réattribuer' : '+ Attribuer à un client'}
      </button>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
      <p className="text-sm font-semibold text-noir">Attribuer à un client</p>
      <div className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail du client *"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-vert-foret focus:bg-white"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du client"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-vert-foret focus:bg-white"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Téléphone (optionnel)"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-vert-foret focus:bg-white"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-noir/70 cursor-pointer">
        <input type="checkbox" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} className="mt-0.5" />
        <span>Envoyer l&apos;e-mail d&apos;accès (définition du mot de passe). Le client pourra aussi se connecter avec Google (même e-mail), sans mot de passe.</span>
      </label>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit} isLoading={busy}>Créer le compte et attribuer</Button>
        <button onClick={() => setOpen(false)} disabled={busy} className="text-sm text-noir/50 hover:text-noir px-2 py-1.5 disabled:opacity-50">Annuler</button>
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
        Cliquez sur une étape pour la valider (ou l&apos;annuler). « visible client » = montrée au client ; « interne » = atelier seulement. Réglez la visibilité dans « Configuration des étapes ».
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
                      {isClientVisible(m) ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide bg-vert-foret/10 text-vert-foret px-1.5 py-0.5 rounded">visible client</span>
                      ) : (
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
type ProductionState = Record<string, { done: boolean; note?: string | null }>;

/** Checklist de production (décors, panneaux, spécificités) — persistée dans projects.production. */
function ProductionChecklistCard({ project }: { project: Project }) {
  const toast = useToast();
  const [state, setState] = useState<ProductionState>(
    ((project as unknown as { production?: ProductionState }).production) || {}
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(key: string, done: boolean) {
    setSaving(key);
    setState((s) => ({ ...s, [key]: { done, note: s[key]?.note ?? null } }));
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/production`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, done }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setState((s) => ({ ...s, [key]: { done: !done, note: s[key]?.note ?? null } }));
      toast.error('Enregistrement impossible');
    } finally {
      setSaving(null);
    }
  }

  const doneCount = PROJECT_PRODUCTION_TASKS.filter((t) => state[t.key]?.done).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-noir">Checklist de production</p>
        <span className="text-xs tabular-nums text-noir/45">{doneCount}/{PROJECT_PRODUCTION_TASKS.length}</span>
      </div>
      <ul className="space-y-1.5">
        {PROJECT_PRODUCTION_TASKS.map((t) => {
          const checked = state[t.key]?.done ?? false;
          return (
            <li key={t.key}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-noir/80">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={saving === t.key}
                  onChange={(e) => toggle(t.key, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-vert-foret focus:ring-vert-foret"
                />
                <span className={checked ? 'text-noir/40 line-through' : ''}>{t.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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
      <div className="space-y-4 max-w-3xl">
        <ProductionChecklistCard project={project} />
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-noir/45">Aucune configuration détaillée pour ce projet.</p>
          <p className="text-xs text-noir/35 mt-1">Le récapitulatif s&apos;affiche dès que le projet contient une composition du configurateur.</p>
        </div>
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
  // Débit atelier estimatif (panneaux + quincaillerie), sans prix
  const debit = computeDebit(config, moduleTypes, materials);
  const totalM2 = Math.round(debit.surfaces.reduce((sum, s) => sum + s.m2, 0) * 100) / 100;
  const formatM2 = (m2: number) => m2.toFixed(2).replace('.', ',');

  return (
    <div className="space-y-4 max-w-3xl">
      <ProductionChecklistCard project={project} />

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

      {/* Débit atelier estimatif */}
      {debit.panels.length > 0 && (
        <div id="debit-print" className="bg-white rounded-xl border border-gray-200 p-5">
          {/* À l'impression, seul le bloc débit est visible */}
          <style>{`@media print {
            body * { visibility: hidden; }
            #debit-print, #debit-print * { visibility: visible; }
            #debit-print { position: absolute; left: 0; top: 0; width: 100%; border: none; padding: 0; }
            #debit-print .no-print { display: none; }
          }`}</style>
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-sm font-semibold text-noir">Débit atelier (estimatif)</p>
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-noir/70 hover:border-vert-foret hover:text-vert-foret transition-colors"
            >
              🖨 Imprimer le débit
            </button>
          </div>
          <p className="text-xs text-noir/50 mb-4">
            Débit estimatif — épaisseur 18 mm, assemblage à valider par l&apos;atelier.
          </p>

          {/* Panneaux à commander */}
          <p className="text-xs font-semibold uppercase tracking-wide text-noir/40 mb-2">Panneaux à commander</p>
          <div className="space-y-1 text-sm text-noir/70 mb-5">
            {debit.surfaces.map((s) => (
              <p key={s.materiau} className="flex justify-between gap-4 max-w-sm">
                <span>{s.materiau}</span>
                <span className="font-medium text-noir" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatM2(s.m2)} m²</span>
              </p>
            ))}
            <p className="flex justify-between gap-4 max-w-sm border-t border-gray-200 pt-1 mt-1">
              <span className="font-semibold text-noir">Total</span>
              <span className="font-semibold text-noir" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatM2(totalM2)} m²</span>
            </p>
          </div>

          {/* Liste de débit */}
          <p className="text-xs font-semibold uppercase tracking-wide text-noir/40 mb-2">Liste de débit</p>
          <div className="overflow-x-auto -mx-5 px-5 mb-5">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs text-noir/40 uppercase tracking-wide border-b border-gray-200">
                  <th className="py-2 pr-3 font-semibold">Module</th>
                  <th className="py-2 pr-3 font-semibold">Pièce</th>
                  <th className="py-2 pr-3 font-semibold">L (mm)</th>
                  <th className="py-2 pr-3 font-semibold">H (mm)</th>
                  <th className="py-2 pr-3 font-semibold">Qté</th>
                  <th className="py-2 font-semibold">Matériau</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {debit.panels.map((panel, i) => {
                  const firstOfModule = i === 0 || debit.panels[i - 1].moduleLabel !== panel.moduleLabel;
                  return (
                    <tr key={i} className="align-top">
                      <td className="py-2 pr-3 text-noir/70">{firstOfModule ? <span className="font-medium text-noir">{panel.moduleLabel}</span> : ''}</td>
                      <td className="py-2 pr-3 text-noir/70">{panel.piece}</td>
                      <td className="py-2 pr-3 text-noir/70" style={{ fontVariantNumeric: 'tabular-nums' }}>{panel.largeur}</td>
                      <td className="py-2 pr-3 text-noir/70" style={{ fontVariantNumeric: 'tabular-nums' }}>{panel.hauteur}</td>
                      <td className="py-2 pr-3 text-noir/70" style={{ fontVariantNumeric: 'tabular-nums' }}>{panel.quantite}</td>
                      <td className="py-2 text-noir/70">{panel.materiau}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-gray-200">
                  <td colSpan={4} className="py-2 pr-3 font-semibold text-noir">Total panneaux</td>
                  <td className="py-2 pr-3 font-semibold text-noir" style={{ fontVariantNumeric: 'tabular-nums' }}>{debit.totalPanels}</td>
                  <td className="py-2" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quincaillerie */}
          <p className="text-xs font-semibold uppercase tracking-wide text-noir/40 mb-2">Quincaillerie</p>
          {debit.hardware.length > 0 ? (
            <div className="space-y-1 text-sm text-noir/70">
              {debit.hardware.map((h) => (
                <p key={h.label} className="flex justify-between gap-4 max-w-sm">
                  <span>{h.label}</span>
                  <span className="font-medium text-noir" style={{ fontVariantNumeric: 'tabular-nums' }}>{h.quantite}</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-noir/45">Aucune quincaillerie détectée.</p>
          )}

          {/* Plan de découpe 2D (calepinage façon MaxCut) */}
          <CuttingPlan panels={debit.panels} />
        </div>
      )}
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

/** Devis : génération depuis la config 3D + liste des devis du projet (admin uniquement, prix visibles) */
function DevisTab({ project }: { project: Project }) {
  const toast = useToast();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/projects/${project.id}/quotes`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setQuotes(Array.isArray(d.quotes) ? d.quotes : []); })
      .catch(() => { if (!cancelled) toast.error('Erreur chargement des devis'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/quote`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || 'Erreur lors de la génération du devis');
        setGenerating(false);
        return;
      }
      toast.success(`Devis ${data.quoteNumber} créé`);
      router.push(`/admin/devis/${data.id}`);
    } catch {
      toast.error('Erreur réseau');
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-noir">Devis du projet</p>
          <p className="text-xs text-noir/45 mt-0.5">Chiffrage depuis la configuration, puis édition dans l&apos;éditeur de devis. Les prix restent invisibles côté client.</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? 'Génération…' : 'Générer un devis depuis la config'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/70 rounded-2xl">
          <p className="text-sm text-noir/45">Aucun devis pour ce projet — générez-en un depuis la configuration.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-noir/45">
                <th className="px-4 py-3 font-medium">Numéro</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Total TTC</th>
                <th className="px-4 py-3 font-medium">Créé le</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-noir">{q.quoteNumber}</td>
                  <td className="px-4 py-3"><Badge variant={QUOTE_STATUS_COLORS[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge></td>
                  <td className="px-4 py-3 text-right tabular-nums text-noir">{formatPrice(q.totalTtc)}</td>
                  <td className="px-4 py-3 text-noir/60">{formatDate(q.createdAt)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={`/admin/devis/${q.id}`} className="text-vert-foret hover:underline font-medium">Éditer</Link>
                    <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noopener noreferrer" className="ml-3 text-noir/60 hover:text-vert-foret hover:underline font-medium">PDF</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
/**
 * Suivi client : l'admin publie une étape de fabrication (statut, note, photos
 * d'atelier) → le client la voit dans sa timeline et reçoit un e-mail. C'est le
 * pendant « visible client » des jalons internes de l'onglet Étapes.
 */
function SuiviTab({ projectId, onStageChanged }: { projectId: string; onStageChanged: (milestones: NonNullable<Project['milestones']>, status: ProjectStatus) => void }) {
  const toast = useToast();
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [catalog, setCatalog] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageKey, setStageKey] = useState<string>('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/admin/projects/${projectId}/updates`).then((r) => r.json()).catch(() => null),
      fetch('/api/admin/project-settings').then((r) => r.json()).catch(() => null),
    ]).then(([u, s]) => {
      if (cancelled) return;
      setUpdates(u && Array.isArray(u.updates) ? u.updates : []);
      setCatalog(s && Array.isArray(s.milestones) ? s.milestones : []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handlePublish() {
    if (!stageKey && !note.trim() && files.length === 0) {
      toast.error('Indiquez une étape, une note ou des photos.');
      return;
    }
    setPublishing(true);
    try {
      const fd = new FormData();
      if (stageKey) fd.append('stageKey', stageKey);
      if (note.trim()) fd.append('note', note.trim());
      for (const f of files) fd.append('photos', f);
      const res = await fetch(`/api/admin/projects/${projectId}/updates`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la publication');
        return;
      }
      if (data.update) setUpdates((prev) => [data.update, ...prev]);
      if (data.milestones && data.status) onStageChanged(data.milestones, data.status as ProjectStatus);
      setStageKey(''); setNote(''); setFiles([]);
      if (fileRef.current) fileRef.current.value = '';
      toast.success(data.emailed ? 'Publié — le client a été prévenu par e-mail.' : 'Publié.');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(u: ProjectUpdate) {
    if (!confirm('Supprimer cette étape de la timeline du client ?')) return;
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/updates`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateId: u.id }),
      });
      if (!res.ok) { toast.error('Erreur lors de la suppression'); return; }
      setUpdates((prev) => prev.filter((x) => x.id !== u.id));
      toast.success('Étape supprimée');
    } catch {
      toast.error('Erreur réseau');
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Publier une étape */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-1">Publier une étape</p>
        <p className="text-xs text-noir/50 mb-4">
          Le client la verra dans son suivi et recevra un e-mail (jamais de prix).
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-noir/60 mb-1">Marquer une étape franchie (optionnel)</label>
            <select
              value={stageKey}
              onChange={(e) => setStageKey(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret"
            >
              <option value="">— Ne pas changer l&apos;étape —</option>
              {catalog.map((m) => (
                <option key={m.key} value={m.key}>{m.label}{(m.clientVisible ?? m.clientNotify) ? '' : ' (interne)'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-noir/60 mb-1">Message au client (optionnel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ex. Vos façades chêne sont usinées, on passe au montage cette semaine."
              className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret resize-y"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              {files.length > 0 ? `${files.length} photo(s) sélectionnée(s)` : 'Ajouter des photos d’atelier'}
            </Button>
            {files.length > 0 && (
              <button onClick={() => { setFiles([]); if (fileRef.current) fileRef.current.value = ''; }} className="text-xs text-noir/50 hover:text-red-600">
                retirer
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 10))}
            />
            <Button size="sm" className="ml-auto" onClick={handlePublish} isLoading={publishing}>
              Publier
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline publiée */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-4">Timeline du client</p>
        {loading ? (
          <p className="text-sm text-noir/40">Chargement…</p>
        ) : updates.length === 0 ? (
          <p className="text-sm text-noir/45">Aucune étape publiée pour l’instant. La première publication lancera le suivi côté client.</p>
        ) : (
          <ol className="space-y-4">
            {updates.map((u) => (
              <li key={u.id} className="relative border-l-2 border-vert-foret/25 pl-4">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-vert-foret" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-2">
                  {u.status && <Badge variant={PROJECT_STATUS_COLORS[u.status]}>{PROJECT_STATUS_LABELS[u.status]}</Badge>}
                  <span className="text-xs text-noir/45">{formatDate(u.createdAt)}</span>
                  <button onClick={() => handleDelete(u)} className="ml-auto text-xs text-red-600 hover:underline">Supprimer</button>
                </div>
                {u.note && <p className="mt-1.5 text-sm text-noir/80 whitespace-pre-line">{u.note}</p>}
                {u.photos?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {u.photos.map((src) => (
                      <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Photo d’atelier" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

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
