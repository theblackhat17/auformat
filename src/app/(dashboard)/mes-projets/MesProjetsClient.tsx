'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Project, ProjectFolder, ProjectUpdate } from '@/lib/types';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_STATUS_FLOW, PROJECT_TYPE_ICONS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Timeline } from '@/components/projects/Timeline';

/** Statuts au-delà du brouillon : le projet a une histoire à raconter */
const TRACKABLE: readonly string[] = PROJECT_STATUS_FLOW.filter((s) => s !== 'draft');

type Unread = { projects: Record<string, number>; folders: Record<string, number> };
type ChatTarget = { projectId?: string; folderId?: string; title: string };

export function MesProjetsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [unread, setUnread] = useState<Unread>({ projects: {}, folders: {} });
  const [loading, setLoading] = useState(true);
  const [quoteModal, setQuoteModal] = useState<Project | null>(null);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [configurateurEnabled, setConfigurateurEnabled] = useState(false);
  const [timelineModal, setTimelineModal] = useState<Project | null>(null);
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

  async function handleRequestQuote() {
    if (!quoteModal) return;
    setSubmitting(true);
    const res = await fetch(`/api/projects/${quoteModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'quote_requested', notes: quoteMessage }),
    });
    if (res.ok) {
      setProjects((prev) => prev.map((p) => p.id === quoteModal.id ? { ...p, status: 'quote_requested' as const, notes: quoteMessage } : p));
      setQuoteModal(null);
      setQuoteMessage('');
    }
    setSubmitting(false);
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
          {TRACKABLE.includes(project.status) && (
            <Button variant="secondary" size="sm" onClick={() => setTimelineModal(project)} className="flex-1">
              Suivi
            </Button>
          )}
          {configurateurEnabled && (
            <Link href={`/configurateur?project=${project.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">Modifier</Button>
            </Link>
          )}
          {project.status === 'draft' && (
            <Button variant="secondary" size="sm" onClick={() => setQuoteModal(project)}>Devis</Button>
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

      {/* Quote request modal */}
      <Modal isOpen={!!quoteModal} onClose={() => setQuoteModal(null)} title="Demander un devis" footer={
        <>
          <Button variant="ghost" onClick={() => setQuoteModal(null)}>Annuler</Button>
          <Button onClick={handleRequestQuote} isLoading={submitting}>Envoyer la demande</Button>
        </>
      }>
        <div className="space-y-4">
          <p className="text-sm text-noir/60">Projet : <strong>{quoteModal?.name}</strong></p>
          <div>
            <label className="block text-sm font-medium text-noir/70 mb-1.5">Message (optionnel)</label>
            <textarea value={quoteMessage} onChange={(e) => setQuoteMessage(e.target.value)} rows={4} placeholder="Précisions sur votre projet..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10 resize-none" />
          </div>
        </div>
      </Modal>

      {/* Suivi de fabrication */}
      {timelineModal && <TimelineModal project={timelineModal} onClose={() => setTimelineModal(null)} />}

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

/** Timeline de fabrication : les grandes étapes + les nouvelles de l'atelier (notes, photos) */
function TimelineModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${project.id}/updates`)
      .then((r) => r.json())
      .then((d) => setUpdates(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [project.id]);

  const currentIdx = TRACKABLE.indexOf(project.status);

  return (
    <Modal isOpen onClose={onClose} title={`Suivi — ${project.name}`}>
      {/* Frise des grandes étapes */}
      <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-1">
        {TRACKABLE.map((s, i) => {
          const done = i <= currentIdx;
          return (
            <div key={s} className="flex items-center flex-shrink-0">
              {i > 0 && <span className={`w-5 h-0.5 ${i <= currentIdx ? 'bg-vert-foret' : 'bg-gray-200'}`} />}
              <span
                title={PROJECT_STATUS_LABELS[s]}
                className={`px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                  i === currentIdx ? 'bg-vert-foret text-white' : done ? 'bg-vert-foret/15 text-vert-foret' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {PROJECT_STATUS_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Nouvelles de l'atelier */}
      <div className="max-h-[55vh] overflow-y-auto pr-1">
        {loading ? (
          <p className="text-sm text-noir/40 py-4">Chargement…</p>
        ) : (
          <Timeline
            updates={updates}
            emptyLabel="Votre projet est entre les mains de l'atelier — les nouvelles (photos de fabrication, étapes) apparaîtront ici."
          />
        )}
      </div>
    </Modal>
  );
}
