'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Project, ProjectFolder, ProjectDocument, ProjectEvent } from '@/lib/types';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_TYPE_ICONS, PROJECT_EVENT_TYPES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChatPanel } from '@/components/chat/ChatPanel';

type Unread = { projects: Record<string, number>; folders: Record<string, number> };
type ChatTarget = { projectId?: string; folderId?: string; title: string };

export function MesProjetsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [unread, setUnread] = useState<Unread>({ projects: {}, folders: {} });
  const [loading, setLoading] = useState(true);
  const [configurateurEnabled, setConfigurateurEnabled] = useState(false);
  const [documentsModal, setDocumentsModal] = useState<Project | null>(null);
  const [eventsModal, setEventsModal] = useState<Project | null>(null);
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);

  const refreshUnread = useCallback(() => {
    fetch('/api/chat/unread').then((r) => r.json()).then((d) => {
      if (d && d.projects) setUnread(d);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/folders').then((r) => r.json()),
    ]).then(([p, f]) => {
      setProjects(Array.isArray(p) ? p : []);
      setFolders(Array.isArray(f) ? f : []);
    }).finally(() => setLoading(false));
    refreshUnread();
    fetch('/api/content/settings').then((r) => r.json()).then((d) => {
      setConfigurateurEnabled(d?.general?.configurateurEnabled ?? false);
    }).catch(() => {});
  }, [refreshUnread]);

  async function handleDelete(project: Project) {
    if (!confirm(`Supprimer le projet "${project.name}" ?`)) return;
    const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
    if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== project.id));
  }

  /* ── Dossiers de chantier ── */
  async function handleCreateFolder() {
    const name = prompt('Nom du dossier (ex. « Rénovation maison », « Cuisine + cellier ») :');
    if (!name?.trim()) return;
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const created = await res.json();
      setFolders((prev) => [...prev, created]);
    }
  }

  async function handleRenameFolder(folder: ProjectFolder) {
    const name = prompt('Nouveau nom du dossier :', folder.name);
    if (!name?.trim() || name === folder.name) return;
    const res = await fetch(`/api/folders/${folder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const updated = await res.json();
      setFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, name: updated.name } : f));
    }
  }

  async function handleDeleteFolder(folder: ProjectFolder) {
    if (!confirm(`Supprimer le dossier "${folder.name}" ? Les projets redeviendront « sans dossier » et la discussion du dossier sera perdue.`)) return;
    const res = await fetch(`/api/folders/${folder.id}`, { method: 'DELETE' });
    if (res.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      setProjects((prev) => prev.map((p) => p.folderId === folder.id ? { ...p, folderId: null } : p));
    }
  }

  async function handleMoveToFolder(project: Project, folderId: string | null) {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    });
    if (res.ok) setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, folderId } : p));
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  const ungrouped = projects.filter((p) => !p.folderId);

  const renderCard = (project: Project) => {
    const unreadCount = unread.projects[project.id] || 0;
    return (
      <Card key={project.id} hover>
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl">{PROJECT_TYPE_ICONS[project.type] || '🎨'}</span>
          <Badge variant={PROJECT_STATUS_COLORS[project.status]}>{PROJECT_STATUS_LABELS[project.status] || project.status}</Badge>
        </div>
        <h3 className="text-lg font-semibold text-noir mb-1">{project.name}</h3>
        <p className="text-xs text-noir/40 mb-3">{formatDate(project.createdAt)}</p>
        {project.notes && <p className="text-sm text-noir/50 mb-3 line-clamp-2">{project.notes}</p>}
        {folders.length > 0 && (
          <select
            value={project.folderId || ''}
            onChange={(e) => handleMoveToFolder(project, e.target.value || null)}
            aria-label="Ranger dans un dossier"
            className="w-full mb-3 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-noir/70 focus:outline-none focus:border-vert-foret"
          >
            <option value="">📂 Sans dossier</option>
            {folders.map((f) => <option key={f.id} value={f.id}>📂 {f.name}</option>)}
          </select>
        )}
        <div className="flex gap-2 pt-3 border-t border-gray-50 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setChatTarget({ projectId: project.id, title: project.name })} className="relative">
            💬
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
            )}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDocumentsModal(project)} className="flex-1">
            Documents
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEventsModal(project)} className="flex-1">
            Rendez-vous
          </Button>
          {configurateurEnabled && (
            <Link href={`/configurateur?project=${project.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">Modifier</Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={() => handleDelete(project)} className="text-red-500 hover:bg-red-50">
            🗑
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-noir">Mes projets</h1>
          <p className="text-sm text-noir/50 mt-1">{projects.length} projet(s){folders.length > 0 ? ` · ${folders.length} dossier(s)` : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreateFolder}>+ Dossier</Button>
          {configurateurEnabled && (
            <Link href="/configurateur">
              <Button>Nouveau projet</Button>
            </Link>
          )}
        </div>
      </div>

      {projects.length === 0 && folders.length === 0 ? (
        <EmptyState
          icon="📁"
          title="Aucun projet"
          description={configurateurEnabled ? 'Utilisez le configurateur pour créer votre premier projet.' : 'Aucun projet pour le moment.'}
          action={configurateurEnabled ? <Link href="/configurateur"><Button>Ouvrir le configurateur</Button></Link> : undefined}
        />
      ) : (
        <div className="space-y-10">
          {/* Dossiers de chantier */}
          {folders.map((folder) => {
            const folderProjects = projects.filter((p) => p.folderId === folder.id);
            const folderUnread = unread.folders[folder.id] || 0;
            return (
              <section key={folder.id}>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <h2 className="text-lg font-bold text-noir">📂 {folder.name}</h2>
                  <span className="text-xs text-noir/40">{folderProjects.length} projet(s)</span>
                  <Button variant="outline" size="sm" onClick={() => setChatTarget({ folderId: folder.id, title: `Dossier ${folder.name}` })} className="relative">
                    💬 Discussion du dossier
                    {folderUnread > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{folderUnread}</span>
                    )}
                  </Button>
                  <button onClick={() => handleRenameFolder(folder)} aria-label={`Renommer ${folder.name}`} title="Renommer" className="text-noir/40 hover:text-noir text-sm">✏️</button>
                  <button onClick={() => handleDeleteFolder(folder)} aria-label={`Supprimer ${folder.name}`} title="Supprimer le dossier" className="text-noir/40 hover:text-red-600 text-sm">🗑</button>
                </div>
                {folderProjects.length === 0 ? (
                  <p className="text-sm text-noir/40 bg-gray-50 rounded-xl px-4 py-3">Dossier vide — rangez-y des projets avec le sélecteur « 📂 » de leurs cartes.</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {folderProjects.map(renderCard)}
                  </div>
                )}
              </section>
            );
          })}

          {/* Sans dossier */}
          {ungrouped.length > 0 && (
            <section>
              {folders.length > 0 && <h2 className="text-lg font-bold text-noir mb-4">Sans dossier</h2>}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ungrouped.map(renderCard)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Suivi de fabrication */}
      {/* Documents partagés */}
      {documentsModal && <DocumentsModal project={documentsModal} onClose={() => setDocumentsModal(null)} />}

      {/* Rendez-vous planifiés */}
      {eventsModal && <RendezVousModal project={eventsModal} onClose={() => setEventsModal(null)} />}

      {/* Discussion avec l'atelier */}
      {chatTarget && (
        <Modal isOpen onClose={() => { setChatTarget(null); refreshUnread(); }} title={`💬 ${chatTarget.title}`}>
          <ChatPanel
            projectId={chatTarget.projectId}
            folderId={chatTarget.folderId}
            viewerRole="client"
            onRead={refreshUnread}
          />
        </Modal>
      )}
    </>
  );
}

/** Documents partagés par l'atelier (plans, visuels…) — consultation uniquement */
function DocumentsModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${project.id}/documents`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setDocuments(Array.isArray(d) ? d : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [project.id]);

  return (
    <Modal isOpen onClose={onClose} title={`Documents — ${project.name}`}>
      <div className="max-h-[55vh] overflow-y-auto pr-1">
        {loading ? (
          <p className="text-sm text-noir/40 py-4">Chargement…</p>
        ) : error ? (
          <p className="text-sm text-red-500 py-4">Impossible de charger les documents. Réessayez plus tard.</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-noir/40 py-4">Aucun document partagé pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-1">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50">
                <span aria-hidden className="text-lg flex-shrink-0">📄</span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener"
                  className="text-sm font-medium text-vert-foret hover:underline flex-1 break-all"
                >
                  {doc.name}
                </a>
                <span className="text-xs text-noir/40 whitespace-nowrap">{formatDate(doc.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** Rendez-vous planifiés avec l'atelier (RDV découverte, technique, pose) — consultation uniquement */
function RendezVousModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${project.id}/events`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [project.id]);

  const now = Date.now();
  const isPast = (ev: ProjectEvent) => {
    const ref = new Date(ev.endAt || ev.startAt).getTime();
    // Un événement « journée entière » reste « à venir » jusqu'à la fin de la journée
    return ev.allDay ? ref + 24 * 60 * 60 * 1000 < now : ref < now;
  };
  const sorted = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const upcoming = sorted.filter((ev) => !isPast(ev));
  const past = sorted.filter(isPast);

  const renderEvent = (ev: ProjectEvent, greyed: boolean) => {
    const eventType = PROJECT_EVENT_TYPES.find((t) => t.key === ev.type);
    const dateLabel = new Date(ev.startAt).toLocaleString('fr-FR', {
      dateStyle: 'long',
      ...(ev.allDay ? {} : { timeStyle: 'short' as const }),
    });
    return (
      <li key={ev.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg ${greyed ? 'opacity-50' : 'hover:bg-gray-50'}`}>
        <span
          aria-hidden
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: eventType?.color || '#9ca3af' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-noir">{eventType?.label || ev.title || 'Rendez-vous'}</p>
          <p className="text-xs text-noir/50">{dateLabel}</p>
          {ev.notes && <p className="text-xs text-noir/40 mt-1 whitespace-pre-line">{ev.notes}</p>}
        </div>
      </li>
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={`Rendez-vous — ${project.name}`}>
      <div className="max-h-[55vh] overflow-y-auto pr-1">
        {loading ? (
          <p className="text-sm text-noir/40 py-4">Chargement…</p>
        ) : error ? (
          <p className="text-sm text-red-500 py-4">Impossible de charger les rendez-vous. Réessayez plus tard.</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-noir/40 py-4">Aucun rendez-vous planifié pour l&apos;instant.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-noir/60 uppercase tracking-wide mb-1">À venir</h4>
              {upcoming.length === 0 ? (
                <p className="text-sm text-noir/40 px-3 py-2">Aucun rendez-vous à venir.</p>
              ) : (
                <ul className="space-y-1">{upcoming.map((ev) => renderEvent(ev, false))}</ul>
              )}
            </div>
            {past.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-noir/60 uppercase tracking-wide mb-1">Passés</h4>
                <ul className="space-y-1">{past.map((ev) => renderEvent(ev, true))}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
