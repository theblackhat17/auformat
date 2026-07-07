'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project, ProjectMilestone, ProjectFolder } from '@/lib/types';
import type { AgendaEvent } from '@/app/api/admin/agenda/route';
import { DEFAULT_MILESTONES, currentMilestone, milestoneProgress, isClientVisible } from '@/lib/project-config';
import { PROJECT_TYPE_ICONS, PROJECT_EVENT_TYPES } from '@/lib/constants';
import { timeAgo } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type AdminProject = Project & {
  clientName: string | null;
  clientEmail: string | null;
  updateCount: number;
  unreadCount: number;
  folderName: string | null;
  folderUnread: number;
  folderId?: string | null;
};

type FolderCard = ProjectFolder & { clientName: string | null; clientEmail: string | null; unreadCount: number };

/** Carte du kanban : soit un dossier (unité qui avance), soit un projet isolé. */
type KanbanCard = {
  kind: 'folder' | 'project';
  id: string;
  name: string;
  clientName: string | null;
  clientEmail: string | null;
  milestones: Record<string, { done: boolean; date?: string | null; by?: string | null }> | undefined;
  updatedAt: string;
  unread: number;
  count: number;
  icon: string;
};

/** Filtre d'étape : tous / non démarré / clé de jalon */
const FILTER_ALL = '__all__';
const FILTER_NONE = '__none__';

/* ————— Cockpit : constantes et helpers de dates ————— */

/** Un projet sans aucune activité depuis N jours est considéré « bloqué » */
const STALLED_DAYS = 14;

/** Types d'événements visibles côté client (les 3 rdv_*) */
const RDV_KEYS = new Set(PROJECT_EVENT_TYPES.filter((t) => t.clientVisible).map((t) => t.key));
/** Jours d'atelier (charge de production de la semaine) */
const WORKSHOP_KEYS = ['jour_coupe', 'jour_usinage', 'jour_montage'] as const;
/** Libellé + couleur par type d'événement (catalogue des constantes) */
const EVENT_TYPE_BY_KEY = new Map(PROJECT_EVENT_TYPES.map((t) => [t.key, t]));

/** Lundi 00:00 de la semaine du jour donné */
function mondayOfWeek(d: Date): Date {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

const COCKPIT_DAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const COCKPIT_TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** « mar. 7 juil. à 09:30 » — heure omise pour les événements « journée entière » */
function formatEventDate(e: Pick<AgendaEvent, 'startAt' | 'allDay'>): string {
  const d = new Date(e.startAt);
  return e.allDay ? COCKPIT_DAY_FMT.format(d) : `${COCKPIT_DAY_FMT.format(d)} à ${COCKPIT_TIME_FMT.format(d)}`;
}

export function AdminProjetsClient() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [folders, setFolders] = useState<FolderCard[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(DEFAULT_MILESTONES);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(FILTER_ALL);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'kanban'>('kanban');
  const [npOpen, setNpOpen] = useState(false);
  const [npForm, setNpForm] = useState({ name: '', clientEmail: '', clientName: '' });
  const [npCreating, setNpCreating] = useState(false);
  const [ndOpen, setNdOpen] = useState(false);
  const [ndForm, setNdForm] = useState({ name: '', clientEmail: '', clientName: '' });
  const [ndCreating, setNdCreating] = useState(false);
  const toast = useToast();
  const router = useRouter();

  /** Crée un dossier (unité de gestion) et ouvre sa fiche. */
  async function handleCreateFolder() {
    if (!ndForm.name.trim()) { toast.error('Donnez un nom au dossier'); return; }
    setNdCreating(true);
    try {
      const res = await fetch('/api/admin/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ndForm.name.trim(),
          ...(ndForm.clientEmail.trim() ? { clientEmail: ndForm.clientEmail.trim(), clientName: ndForm.clientName.trim() || undefined } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur lors de la création'); return; }
      toast.success('Dossier créé');
      router.push(`/admin/dossiers/${data.id}`);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setNdCreating(false);
    }
  }

  /** Crée un projet « libre » (sans configurateur) et ouvre sa fiche. */
  async function handleCreateProject() {
    if (!npForm.name.trim()) { toast.error('Donnez un nom au projet'); return; }
    setNpCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: npForm.name.trim(),
          type: 'libre',
          config: {},
          ...(npForm.clientEmail.trim()
            ? { clientEmail: npForm.clientEmail.trim(), clientName: npForm.clientName.trim() || undefined }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur lors de la création'); return; }
      toast.success('Projet créé');
      router.push(`/admin/projets/${data.id}`);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setNpCreating(false);
    }
  }

  // Préférence de vue (Liste / Kanban) mémorisée localement
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('projets_view') : null;
    if (saved === 'list' || saved === 'kanban') setView(saved);
  }, []);
  useEffect(() => {
    try { localStorage.setItem('projets_view', view); } catch { /* stockage indispo */ }
  }, [view]);

  // Colonnes du kanban masquées (clés d'étape), mémorisées localement
  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('projets_kanban_hidden') : null;
    if (saved) {
      try { const arr = JSON.parse(saved); if (Array.isArray(arr)) setHiddenCols(arr); } catch { /* ignore */ }
    }
  }, []);
  useEffect(() => {
    try { localStorage.setItem('projets_kanban_hidden', JSON.stringify(hiddenCols)); } catch { /* ignore */ }
  }, [hiddenCols]);
  const toggleCol = (key: string) => setHiddenCols((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]));

  /**
   * Définit l'étape courante d'un projet par glisser-déposer : coche les étapes
   * jusqu'à `upToKey` inclus (null = non démarré). Écrit la MÊME donnée que la
   * checklist de la fiche projet → kanban et onglet Étapes toujours synchro.
   */
  async function moveCard(card: KanbanCard, upToKey: string | null) {
    const targetIndex = upToKey === null ? -1 : milestones.findIndex((m) => m.key === upToKey);
    const prev = card.milestones;
    const optimistic: Record<string, { done: boolean }> = {};
    milestones.forEach((m, i) => { optimistic[m.key] = { done: i <= targetIndex }; });
    const patch = (mil: KanbanCard['milestones']) => {
      if (card.kind === 'folder') setFolders((fs) => fs.map((f) => (f.id === card.id ? { ...f, milestones: mil } : f)));
      else setProjects((ps) => ps.map((p) => (p.id === card.id ? { ...p, milestones: mil } : p)));
    };
    patch(optimistic);
    try {
      const base = card.kind === 'folder' ? 'folders' : 'projects';
      const res = await fetch(`/api/admin/${base}/${card.id}/milestones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upTo: upToKey }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      patch(data.milestones);
      toast.success(`« ${card.name} » → ${targetIndex >= 0 ? milestones[targetIndex].label : 'Non démarré'}`);
    } catch {
      patch(prev);
      toast.error('Déplacement impossible');
    }
  }

  useEffect(() => {
    let cancelled = false;
    // Fenêtre du cockpit : lundi de la semaine courante → +21 jours (RDV, poses, charge atelier)
    const monday = mondayOfWeek(new Date());
    const windowEnd = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 21, 23, 59, 59);
    const agendaQuery = `from=${encodeURIComponent(monday.toISOString())}&to=${encodeURIComponent(windowEnd.toISOString())}`;
    Promise.all([
      fetch('/api/admin/projects')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('projects'))))
        .catch(() => null),
      fetch('/api/admin/project-settings')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('settings'))))
        .catch(() => null),
      fetch(`/api/admin/agenda?${agendaQuery}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('agenda'))))
        .catch(() => null),
      fetch('/api/admin/folders')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('folders'))))
        .catch(() => null),
    ]).then(([projectsData, settingsData, agendaData, foldersData]) => {
      if (cancelled) return;
      if (Array.isArray(projectsData)) {
        setProjects(projectsData);
      } else {
        toast.error('Impossible de charger les projets');
      }
      if (Array.isArray(foldersData)) setFolders(foldersData);
      if (settingsData && Array.isArray(settingsData.milestones) && settingsData.milestones.length > 0) {
        setMilestones(settingsData.milestones);
      }
      if (agendaData && Array.isArray(agendaData.events)) {
        setEvents(agendaData.events);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Étape courante + avancement, calculés une fois par projet */
  const stageById = useMemo(() => {
    const map = new Map<string, { stage: ProjectMilestone | null; done: number; total: number }>();
    for (const p of projects) {
      const stage = currentMilestone(p, milestones);
      const { done, total } = milestoneProgress(p, milestones);
      map.set(p.id, { stage, done, total });
    }
    return map;
  }, [projects, milestones]);

  const lastKey = milestones.length > 0 ? milestones[milestones.length - 1].key : null;

  /** Chiffres du tableau de bord */
  const stats = useMemo(() => {
    let enCours = 0;
    let nonDemarres = 0;
    let termines = 0;
    let unread = 0;
    for (const p of projects) {
      const info = stageById.get(p.id);
      unread += p.unreadCount;
      if (!info || info.stage === null) nonDemarres++;
      else if (lastKey && info.stage.key === lastKey) termines++;
      else enCours++;
    }
    return { total: projects.length, enCours, nonDemarres, termines, unread };
  }, [projects, stageById, lastKey]);

  /** Cockpit : tout ce qui demande une action aujourd'hui / cette semaine */
  const cockpit = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monday = mondayOfWeek(now);
    const weekEnd = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59);

    // RDV client (rdv_*) restant d'ici la fin de la semaine courante
    const rdvSemaine = events.filter((e) => {
      if (!RDV_KEYS.has(e.type)) return false;
      const start = new Date(e.startAt);
      return start >= todayStart && start <= weekEnd;
    });

    // Charge atelier de la semaine (lun → dim) : coupe / usinage / montage
    const atelier: Record<(typeof WORKSHOP_KEYS)[number], number> = { jour_coupe: 0, jour_usinage: 0, jour_montage: 0 };
    let atelierTotal = 0;
    for (const e of events) {
      if (!(WORKSHOP_KEYS as readonly string[]).includes(e.type)) continue;
      const start = new Date(e.startAt);
      if (start >= monday && start <= weekEnd) {
        atelier[e.type as (typeof WORKSHOP_KEYS)[number]]++;
        atelierTotal++;
      }
    }

    // Poses à venir (fenêtre chargée : jusqu'à lundi + 21 jours)
    const poses = events.filter((e) => e.type === 'rdv_pose' && new Date(e.startAt) >= todayStart);

    // Messages clients non lus, par projet
    const unreadProjects = projects
      .filter((p) => p.unreadCount > 0)
      .sort((a, b) => b.unreadCount - a.unreadCount);
    const unreadTotal = unreadProjects.reduce((sum, p) => sum + p.unreadCount, 0);

    // Projets « bloqués » : ni terminés, ni brouillons/modèles, sans activité depuis 14 jours
    const bloques = projects
      .filter((p) => !p.isTemplate && p.status !== 'completed' && p.status !== 'draft')
      .map((p) => ({ project: p, days: Math.floor((now.getTime() - new Date(p.updatedAt).getTime()) / 86_400_000) }))
      .filter((x) => x.days >= STALLED_DAYS)
      .sort((a, b) => b.days - a.days);

    // Alerte financière : devis accepté mais demande d'acompte pas encore faite
    const sansAcompte = projects.filter(
      (p) =>
        !p.isTemplate &&
        p.status !== 'completed' &&
        p.milestones?.devis_accepte?.done === true &&
        p.milestones?.acompte?.done !== true
    );

    return { rdvSemaine, atelier, atelierTotal, poses, unreadProjects, unreadTotal, bloques, sansAcompte };
  }, [projects, events]);

  const rienATraiter =
    cockpit.unreadTotal === 0 && cockpit.rdvSemaine.length === 0 && cockpit.bloques.length === 0 && cockpit.sansAcompte.length === 0;

  /** Répartition du pipeline : combien de projets à chaque étape courante */
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { [FILTER_NONE]: 0 };
    for (const m of milestones) counts[m.key] = 0;
    for (const p of projects) {
      const stage = stageById.get(p.id)?.stage;
      counts[stage ? stage.key : FILTER_NONE]++;
    }
    return counts;
  }, [projects, stageById, milestones]);

  const maxStageCount = Math.max(1, ...Object.values(stageCounts));

  /** Liste filtrée (étape puis recherche), triée par dernière activité */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) => {
        if (filter !== FILTER_ALL) {
          const stage = stageById.get(p.id)?.stage;
          if (filter === FILTER_NONE ? stage !== null : stage?.key !== filter) return false;
        }
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.clientName || '').toLowerCase().includes(q) ||
          (p.clientEmail || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [projects, stageById, filter, search]);

  /** Projets filtrés par la seule recherche (le kanban regroupe déjà par statut). */
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.clientName || '').toLowerCase().includes(q) ||
            (p.clientEmail || '').toLowerCase().includes(q)
        )
      : projects;
    return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [projects, search]);

  /** Cartes du kanban : dossiers (unités qui avancent) + projets isolés (sans dossier). */
  const kanbanCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (name: string, cn: string | null, ce: string | null) =>
      !q || name.toLowerCase().includes(q) || (cn || '').toLowerCase().includes(q) || (ce || '').toLowerCase().includes(q);
    const cards: KanbanCard[] = [];
    for (const f of folders) {
      if (!match(f.name, f.clientName ?? null, f.clientEmail ?? null)) continue;
      cards.push({ kind: 'folder', id: f.id, name: f.name, clientName: f.clientName ?? null, clientEmail: f.clientEmail ?? null, milestones: f.milestones, updatedAt: f.updatedAt, unread: f.unreadCount || 0, count: f.projectCount || 0, icon: '📂' });
    }
    for (const p of projects) {
      if (p.folderId) continue; // dans un dossier → géré par le dossier
      if (p.isTemplate) continue;
      if (!match(p.name, p.clientName, p.clientEmail)) continue;
      cards.push({ kind: 'project', id: p.id, name: p.name, clientName: p.clientName, clientEmail: p.clientEmail, milestones: p.milestones, updatedAt: p.updatedAt, unread: (p.unreadCount || 0) + (p.folderUnread || 0), count: 0, icon: PROJECT_TYPE_ICONS[p.type] || '🪚' });
    }
    return cards.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [folders, projects, search]);

  const filterLabel =
    filter === FILTER_ALL ? null
      : filter === FILTER_NONE ? 'Non démarré'
      : milestones.find((m) => m.key === filter)?.label || null;

  return (
    <>
      {/* En-tête */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-noir">Suivi des projets</h1>
          <p className="text-sm text-noir/50 mt-1">
            Vue d&apos;ensemble de l&apos;atelier — cliquez sur un projet pour ouvrir sa fiche : étapes, production, documents et messagerie.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setNdOpen(true)}>+ Nouveau dossier</Button>
          <Button size="sm" variant="outline" onClick={() => setNpOpen(true)}>+ Nouveau projet</Button>
          {/* Agenda global : tous les RDV et jours d'atelier, tous projets confondus */}
          <Link
            href="/admin/agenda"
            className="px-3 py-1.5 border border-noir/20 text-noir/70 text-sm rounded-lg hover:border-vert-foret hover:text-vert-foret transition-colors"
          >
            📅 Agenda
          </Link>
          {/* Configuration des étapes (jalons) partagées par le dashboard et les fiches projet */}
          <Link
            href="/admin/projets/config"
            className="px-3 py-1.5 border border-noir/20 text-noir/70 text-sm rounded-lg hover:border-vert-foret hover:text-vert-foret transition-colors"
          >
            ⚙ Configuration des étapes
          </Link>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Cockpit — le coup d'œil du matin : à traiter + semaine d'atelier */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
            {/* À traiter : uniquement ce qui demande une action */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <p className="text-sm font-semibold text-noir">À traiter</p>
                <p className="text-xs text-noir/45">Aujourd&apos;hui et cette semaine</p>
              </div>
              {rienATraiter ? (
                <p className="rounded-lg bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700">Tout est à jour ✅</p>
              ) : (
                <div className="space-y-4">
                  {cockpit.unreadTotal > 0 && (
                    <CockpitSection label={`Messages non lus · ${cockpit.unreadTotal}`}>
                      <div className="flex flex-wrap gap-1.5">
                        {cockpit.unreadProjects.slice(0, 6).map((p) => (
                          <Link
                            key={p.id}
                            href={`/admin/projets/${p.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                          >
                            <span className="max-w-[180px] truncate">{p.name}</span>
                            <span className="font-bold tabular-nums">{p.unreadCount}</span>
                          </Link>
                        ))}
                        {cockpit.unreadProjects.length > 6 && (
                          <span className="self-center text-xs text-noir/45">+ {cockpit.unreadProjects.length - 6} autres</span>
                        )}
                      </div>
                    </CockpitSection>
                  )}

                  {cockpit.rdvSemaine.length > 0 && (
                    <CockpitSection label="RDV cette semaine">
                      <ul className="space-y-1">
                        {cockpit.rdvSemaine.map((e) => {
                          const type = EVENT_TYPE_BY_KEY.get(e.type);
                          return (
                            <li key={e.id}>
                              <Link
                                href={`/admin/projets/${e.projectId}`}
                                className="group/rdv flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 text-sm transition-colors hover:bg-beige/50"
                              >
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: type?.color || '#2C5F2D' }} aria-hidden="true" />
                                <span className="shrink-0 font-medium tabular-nums text-noir">{formatEventDate(e)}</span>
                                <span className="shrink-0 text-noir/55">{type?.label || e.type}</span>
                                <span className="min-w-0 truncate text-noir/70 transition-colors group-hover/rdv:text-vert-foret">{e.projectName}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </CockpitSection>
                  )}

                  {cockpit.sansAcompte.length > 0 && (
                    <CockpitSection label="Devis accepté — acompte à demander">
                      <ul className="space-y-1">
                        {cockpit.sansAcompte.slice(0, 5).map((p) => (
                          <li key={p.id}>
                            <Link
                              href={`/admin/projets/${p.id}`}
                              className="group/acompte flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 text-sm transition-colors hover:bg-beige/50"
                            >
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Acompte</span>
                              <span className="min-w-0 truncate font-medium text-noir transition-colors group-hover/acompte:text-vert-foret">{p.name}</span>
                              <span className="min-w-0 truncate text-noir/55">{p.clientName || p.clientEmail || 'Sans client'}</span>
                            </Link>
                          </li>
                        ))}
                        {cockpit.sansAcompte.length > 5 && (
                          <li className="px-2 text-xs text-noir/45">+ {cockpit.sansAcompte.length - 5} autres projets</li>
                        )}
                      </ul>
                    </CockpitSection>
                  )}

                  {cockpit.bloques.length > 0 && (
                    <CockpitSection label="Projets sans activité">
                      <ul className="space-y-1">
                        {cockpit.bloques.slice(0, 5).map(({ project: p, days }) => (
                          <li key={p.id}>
                            <Link
                              href={`/admin/projets/${p.id}`}
                              className="group/stall flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 text-sm transition-colors hover:bg-beige/50"
                            >
                              <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-orange-700">
                                inactif depuis {days} j
                              </span>
                              <span className="min-w-0 truncate font-medium text-noir transition-colors group-hover/stall:text-vert-foret">{p.name}</span>
                              <span className="min-w-0 truncate text-noir/55">{p.clientName || p.clientEmail || 'Sans client'}</span>
                            </Link>
                          </li>
                        ))}
                        {cockpit.bloques.length > 5 && (
                          <li className="px-2 text-xs text-noir/45">+ {cockpit.bloques.length - 5} autres projets</li>
                        )}
                      </ul>
                    </CockpitSection>
                  )}
                </div>
              )}
            </div>

            {/* Cette semaine : charge d'atelier + poses à venir */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <p className="text-sm font-semibold text-noir">Cette semaine</p>
                <Link href="/admin/agenda" className="text-xs font-medium text-vert-foret hover:underline">
                  Agenda →
                </Link>
              </div>
              <div className="space-y-4">
                <CockpitSection label="Charge atelier">
                  {cockpit.atelierTotal === 0 ? (
                    <p className="text-sm text-noir/50">Aucun jour d&apos;atelier planifié cette semaine.</p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold tabular-nums text-noir leading-none">{cockpit.atelierTotal}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-noir/70">
                        {WORKSHOP_KEYS.filter((k) => cockpit.atelier[k] > 0).map((k, i, arr) => (
                          <span key={k} className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EVENT_TYPE_BY_KEY.get(k)?.color }} aria-hidden="true" />
                            <span className="tabular-nums">
                              {cockpit.atelier[k]} {WORKSHOP_SHORT_LABELS[k]}
                            </span>
                            {i < arr.length - 1 && <span className="text-noir/30">·</span>}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                </CockpitSection>

                <CockpitSection label="Poses à venir (21 jours)">
                  {cockpit.poses.length === 0 ? (
                    <p className="text-sm text-noir/50">Aucune pose planifiée.</p>
                  ) : (
                    <ul className="space-y-1">
                      {cockpit.poses.slice(0, 5).map((e) => (
                        <li key={e.id}>
                          <Link
                            href={`/admin/projets/${e.projectId}`}
                            className="group/pose flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 text-sm transition-colors hover:bg-beige/50"
                          >
                            <span className="shrink-0 font-medium tabular-nums text-noir">{formatEventDate(e)}</span>
                            <span className="min-w-0 truncate text-noir/70 transition-colors group-hover/pose:text-vert-foret">{e.projectName}</span>
                          </Link>
                        </li>
                      ))}
                      {cockpit.poses.length > 5 && (
                        <li className="px-2 text-xs text-noir/45">+ {cockpit.poses.length - 5} autres poses</li>
                      )}
                    </ul>
                  )}
                </CockpitSection>
              </div>
            </div>
          </div>

          {/* Chiffres clés */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
            <StatCard label="Projets au total" value={stats.total} tone="bg-beige text-noir" icon={ICONS.total} />
            <StatCard label="En cours" value={stats.enCours} tone="bg-purple-100 text-purple-700" icon={ICONS.enCours} />
            <StatCard label="Non démarrés" value={stats.nonDemarres} tone="bg-amber-100 text-amber-700" icon={ICONS.nouveaux} />
            <StatCard label="Terminés" value={stats.termines} tone="bg-green-100 text-green-700" icon={ICONS.termines} />
            <StatCard
              label="Messages non lus"
              value={stats.unread}
              tone={stats.unread > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-noir/40'}
              icon={ICONS.messages}
            />
          </div>

          {/* Barre d'outils : bascule de vue + recherche */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label="Choisir la vue">
                <button
                  onClick={() => setView('kanban')}
                  aria-pressed={view === 'kanban'}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'kanban' ? 'bg-vert-foret text-white' : 'text-noir/60 hover:text-noir'}`}
                >
                  Kanban
                </button>
                <button
                  onClick={() => setView('list')}
                  aria-pressed={view === 'list'}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'list' ? 'bg-vert-foret text-white' : 'text-noir/60 hover:text-noir'}`}
                >
                  Liste
                </button>
              </div>
              {view === 'kanban' && (
                <details className="relative">
                  <summary className="cursor-pointer list-none select-none rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-noir/70 transition-colors hover:border-vert-foret hover:text-vert-foret">
                    Colonnes{hiddenCols.length > 0 ? ` · ${hiddenCols.length} masquée${hiddenCols.length > 1 ? 's' : ''}` : ''}
                  </summary>
                  <div className="absolute z-20 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                    <div className="flex items-center justify-between px-1 pb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-noir/40">Colonnes affichées</span>
                      {hiddenCols.length > 0 && (
                        <button onClick={() => setHiddenCols([])} className="text-xs text-vert-foret hover:underline">Tout afficher</button>
                      )}
                    </div>
                    {[{ key: '__none__', label: 'Non démarré' }, ...milestones.map((m) => ({ key: m.key, label: m.label }))].map((col) => (
                      <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm text-noir/80 hover:bg-beige/50">
                        <input
                          type="checkbox"
                          checked={!hiddenCols.includes(col.key)}
                          onChange={() => toggleCol(col.key)}
                          className="h-4 w-4 rounded border-gray-300 text-vert-foret focus:ring-vert-foret"
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </details>
              )}
            </div>
            <div className="relative w-full sm:w-auto sm:min-w-[18rem] sm:flex-1 sm:max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noir/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un projet, un client, un email…"
                aria-label="Rechercher un projet"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-noir placeholder-noir/45 focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10"
              />
            </div>
          </div>

          {projects.length === 0 && folders.length === 0 ? (
            <EmptyState
              title="Aucun projet pour l'instant"
              text="Les projets créés depuis le configurateur ou ajoutés pour un client apparaîtront ici."
            />
          ) : view === 'kanban' ? (
            <KanbanBoard
              cards={kanbanCards}
              milestones={milestones}
              hiddenCols={hiddenCols}
              onMove={moveCard}
              onOpen={(card) => router.push(card.kind === 'folder' ? `/admin/dossiers/${card.id}` : `/admin/projets/${card.id}`)}
            />
          ) : (
          <>
          {/* Pipeline par étape (catalogue de jalons, dans l'ordre) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <p className="text-sm font-semibold text-noir">Pipeline par étape</p>
              <p className="text-xs text-noir/45">Étape courante de chaque projet — cliquez pour filtrer la liste</p>
            </div>
            <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filtrer les projets par étape">
              <StageSegment
                label="Tous"
                count={stats.total}
                pct={100}
                active={filter === FILTER_ALL}
                onClick={() => setFilter(FILTER_ALL)}
              />
              <StageSegment
                label="Non démarré"
                count={stageCounts[FILTER_NONE]}
                pct={(stageCounts[FILTER_NONE] / maxStageCount) * 100}
                active={filter === FILTER_NONE}
                onClick={() => setFilter(filter === FILTER_NONE ? FILTER_ALL : FILTER_NONE)}
              />
              {milestones.map((m) => (
                <StageSegment
                  key={m.key}
                  label={m.label}
                  count={stageCounts[m.key] || 0}
                  pct={((stageCounts[m.key] || 0) / maxStageCount) * 100}
                  active={filter === m.key}
                  onClick={() => setFilter(filter === m.key ? FILTER_ALL : m.key)}
                />
              ))}
            </div>
          </div>

          {/* Compteur de résultats */}
          <div className="flex items-center justify-end mb-4">
            <p className="text-sm text-noir/50 tabular-nums">
              {visible.length} projet{visible.length > 1 ? 's' : ''}
              {filterLabel && <> · étape « {filterLabel} »</>}
            </p>
          </div>

          {/* Liste des projets */}
          {projects.length === 0 ? (
            <EmptyState
              title="Aucun projet pour l'instant"
              text="Les projets créés depuis le configurateur ou ajoutés pour un client apparaîtront ici."
            />
          ) : visible.length === 0 ? (
            <EmptyState
              title="Aucun projet ne correspond"
              text={search.trim() ? 'Essayez un autre nom de projet, de client ou une autre étape.' : 'Aucun projet n’est actuellement à cette étape.'}
            >
              <button
                onClick={() => { setSearch(''); setFilter(FILTER_ALL); }}
                className="mt-4 px-4 py-1.5 text-sm font-semibold text-vert-foret border-[1.5px] border-vert-foret rounded-full hover:bg-vert-foret hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vert-foret focus-visible:ring-offset-2"
              >
                Réinitialiser les filtres
              </button>
            </EmptyState>
          ) : (
            <div className="space-y-2.5">
              {visible.map((p) => {
                const info = stageById.get(p.id);
                return (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    stage={info?.stage ?? null}
                    done={info?.done ?? 0}
                    total={info?.total ?? milestones.length}
                  />
                );
              })}
            </div>
          )}
          </>
          )}
        </>
      )}

      {/* Création d'un projet libre (sans configurateur) */}
      <Modal
        isOpen={npOpen}
        onClose={() => setNpOpen(false)}
        title="Nouveau projet (sans configurateur)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNpOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateProject} isLoading={npCreating}>Créer le projet</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nom du projet *" value={npForm.name} onChange={(e) => setNpForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex. Aménagement combles — Dupont" />
          <Input label="E-mail du client (existant ou nouveau)" type="email" value={npForm.clientEmail} onChange={(e) => setNpForm((p) => ({ ...p, clientEmail: e.target.value }))} placeholder="client@exemple.fr" />
          <Input label="Nom du client (si nouveau)" value={npForm.clientName} onChange={(e) => setNpForm((p) => ({ ...p, clientName: e.target.value }))} />
          <p className="text-xs text-noir/50">
            Le projet sera géré comme les autres (kanban, étapes, documents, suivi client, messagerie) mais sans configurateur.
            Laissez l&apos;e-mail vide pour l&apos;attribuer à un client plus tard depuis la fiche projet.
          </p>
        </div>
      </Modal>

      {/* Création d'un dossier (unité de gestion regroupant des projets) */}
      <Modal
        isOpen={ndOpen}
        onClose={() => setNdOpen(false)}
        title="Nouveau dossier"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNdOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateFolder} isLoading={ndCreating}>Créer le dossier</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nom du dossier *" value={ndForm.name} onChange={(e) => setNdForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex. Rénovation maison — Dupont" />
          <Input label="E-mail du client (existant ou nouveau)" type="email" value={ndForm.clientEmail} onChange={(e) => setNdForm((p) => ({ ...p, clientEmail: e.target.value }))} placeholder="client@exemple.fr" />
          <Input label="Nom du client (si nouveau)" value={ndForm.clientName} onChange={(e) => setNdForm((p) => ({ ...p, clientName: e.target.value }))} />
          <p className="text-xs text-noir/50">
            Le <strong>dossier</strong> avance dans le kanban (étapes, suivi client, documents). Vous y ajouterez ensuite des projets, qui en sont les livrables.
          </p>
        </div>
      </Modal>
    </>
  );
}

/* ————— Kanban : colonnes = étapes configurées, cartes déplaçables (drag & drop natif) ————— */
const KANBAN_NONE = '__none__';

function KanbanBoard({
  cards,
  milestones,
  hiddenCols,
  onMove,
  onOpen,
}: {
  cards: KanbanCard[];
  milestones: ProjectMilestone[];
  hiddenCols: string[];
  onMove: (card: KanbanCard, upToKey: string | null) => void;
  onOpen: (card: KanbanCard) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      [
        { key: KANBAN_NONE, label: 'Non démarré', clientVisible: true },
        ...milestones.map((m) => ({ key: m.key, label: m.label, clientVisible: isClientVisible(m) })),
      ].filter((c) => !hiddenCols.includes(c.key)),
    [milestones, hiddenCols]
  );

  /** Cartes (dossiers + projets isolés) regroupées par étape courante. */
  const byStage = useMemo(() => {
    const map: Record<string, KanbanCard[]> = { [KANBAN_NONE]: [] };
    for (const m of milestones) map[m.key] = [];
    for (const c of cards) {
      const cur = currentMilestone({ milestones: c.milestones }, milestones);
      (map[cur?.key ?? KANBAN_NONE] ??= []).push(c);
    }
    return map;
  }, [cards, milestones]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
      {columns.map((col) => {
        const list = byStage[col.key] || [];
        const isOver = overCol === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (overCol !== col.key) setOverCol(col.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol((o) => (o === col.key ? null : o));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain') || dragId;
              setOverCol(null);
              setDragId(null);
              const card = cards.find((c) => c.id === id);
              if (card) onMove(card, col.key === KANBAN_NONE ? null : col.key);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-xl border transition-colors ${isOver ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-100 bg-gray-50/60'}`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-noir">{col.label}</span>
                {!col.clientVisible && (
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-noir/45" title="Étape interne — non visible par le client">interne</span>
                )}
              </span>
              <span className="shrink-0 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-noir/60">{list.length}</span>
            </div>
            <div className="min-h-[80px] flex-1 space-y-2 p-2">
              {list.map((c) => (
                <article
                  key={c.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', c.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragId(c.id);
                  }}
                  onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  onClick={() => onOpen(c)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onOpen(c); }}
                  className={`cursor-grab rounded-lg border bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-vert-foret active:cursor-grabbing ${c.kind === 'folder' ? 'border-vert-foret/40' : 'border-gray-200'} ${dragId === c.id ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none" aria-hidden="true">{c.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-noir">{c.name}</p>
                      <p className="truncate text-xs text-noir/50">{c.clientName || c.clientEmail || 'Sans client'}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="shrink-0 rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-5 text-white">{c.unread}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-noir/45">
                    {c.kind === 'folder' && (
                      <span className="rounded bg-vert-foret/10 px-1.5 py-0.5 font-medium text-vert-foret">Dossier · {c.count} projet{c.count > 1 ? 's' : ''}</span>
                    )}
                    <span>{timeAgo(c.updatedAt)}</span>
                  </div>
                </article>
              ))}
              {list.length === 0 && <p className="px-1 py-6 text-center text-xs text-noir/30">Déposez une carte ici</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ————— Icônes SVG (trait 1.5, style heroicons outline) ————— */
const ICONS = {
  total: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  enCours: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  nouveaux: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
  termines: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  messages: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
} as const;

/** Libellés courts pour le récap de charge atelier (« 2 coupe · 1 usinage ») */
const WORKSHOP_SHORT_LABELS: Record<(typeof WORKSHOP_KEYS)[number], string> = {
  jour_coupe: 'coupe',
  jour_usinage: 'usinage',
  jour_montage: 'montage',
};

/** Sous-bloc du cockpit : petit intitulé en capitales + contenu */
function CockpitSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-noir/45">{label}</p>
      {children}
    </div>
  );
}

/** Carte de chiffre clé */
function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`} aria-hidden="true">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-noir tabular-nums leading-none">{value}</p>
        <p className="text-xs text-noir/55 mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

/** Segment cliquable du pipeline : compteur, label, mini-barre de volume */
function StageSegment({ label, count, pct, active, onClick }: { label: string; count: number; pct: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-[96px] flex-1 shrink-0 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-vert-foret focus-visible:ring-offset-1 ${
        active
          ? 'bg-vert-foret text-white'
          : `bg-beige/60 text-noir hover:bg-beige ${count === 0 ? 'opacity-50 hover:opacity-80' : ''}`
      }`}
    >
      <span className="block text-lg font-bold tabular-nums leading-none">{count}</span>
      <span className={`mt-1 block text-[11px] font-medium leading-tight line-clamp-2 min-h-[28px] ${active ? 'text-white/90' : 'text-noir/70'}`}>
        {label}
      </span>
      <span className={`mt-1 block h-1 rounded-full overflow-hidden ${active ? 'bg-white/25' : 'bg-noir/10'}`} aria-hidden="true">
        <span
          className={`block h-full rounded-full ${active ? 'bg-white' : 'bg-vert-foret'}`}
          style={{ width: `${Math.max(count > 0 ? 6 : 0, Math.min(100, pct))}%` }}
        />
      </span>
    </button>
  );
}

/** Ligne de projet — ouvre la fiche /admin/projets/[id] */
function ProjectRow({ project: p, stage, done, total }: { project: AdminProject; stage: ProjectMilestone | null; done: number; total: number }) {
  const unread = p.unreadCount + p.folderUnread;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const finished = total > 0 && done === total;
  return (
    <Link
      href={`/admin/projets/${p.id}`}
      className="group flex flex-wrap items-center gap-x-4 gap-y-2.5 bg-white rounded-xl border border-gray-100 shadow-sm p-4 transition-all duration-200 hover:border-vert-foret/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-vert-foret"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-beige text-lg" aria-hidden="true">
        {PROJECT_TYPE_ICONS[p.type] || '🪚'}
      </span>

      <div className="min-w-0 flex-1 basis-48">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-noir truncate transition-colors group-hover:text-vert-foret">{p.name}</p>
          {p.status === 'draft' && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">Brouillon</span>
          )}
          {p.isTemplate && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">Modèle</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-noir/55">
          {p.clientName || p.clientEmail || 'Sans client'}
          {p.folderName && <> · 📂 {p.folderName}</>}
          {p.updateCount > 0 && <> · 📷 {p.updateCount}</>}
          {' · '}
          {timeAgo(p.updatedAt)}
        </p>
      </div>

      {/* Étape courante + avancement (passe sous le titre en mobile) */}
      <div className="flex basis-full items-center justify-between gap-3 pl-14 sm:basis-auto sm:justify-end sm:pl-0">
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <span
            className={`inline-flex max-w-[220px] truncate rounded-full px-2.5 py-0.5 text-xs font-medium ${
              stage
                ? finished
                  ? 'bg-green-100 text-green-700'
                  : 'bg-vert-foret/10 text-vert-foret'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {stage ? stage.label : 'Non démarré'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-noir/10" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label={`Avancement : ${done} étape(s) sur ${total}`}>
              <span className={`block h-full rounded-full ${finished ? 'bg-green-600' : 'bg-vert-foret'}`} style={{ width: `${pct}%` }} />
            </span>
            <span className="text-[11px] tabular-nums text-noir/50">{done}/{total}</span>
          </span>
        </div>

        {unread > 0 && (
          <span className="flex h-6 min-w-[24px] shrink-0 items-center justify-center gap-1 rounded-full bg-red-600 px-2 text-xs font-bold text-white" title={`${unread} message(s) non lu(s)`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unread}
          </span>
        )}

        <svg className="hidden w-5 h-5 shrink-0 text-noir/30 transition-transform group-hover:translate-x-0.5 sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

/** État vide (liste sans résultat ou atelier sans projet) */
function EmptyState({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white border border-gray-100 py-16 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-beige" aria-hidden="true">
        <svg className="w-6 h-6 text-noir/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </span>
      <p className="mt-4 font-semibold text-noir">{title}</p>
      <p className="mt-1 max-w-md text-sm text-noir/55">{text}</p>
      {children}
    </div>
  );
}

/** Squelette de chargement : mêmes gabarits que le contenu réel */
function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement des projets">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <div className="lg:col-span-2 h-[180px] rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-[180px] rounded-xl bg-gray-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[74px] rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
      <div className="h-[120px] rounded-xl bg-gray-100 animate-pulse mb-6" />
      <div className="h-10 w-full max-w-sm rounded-lg bg-gray-100 animate-pulse mb-4" />
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[76px] rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
