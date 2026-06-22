'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Project, ProjectStatus, ProjectUpdate } from '@/lib/types';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_STATUS_FLOW } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Timeline } from '@/components/projects/Timeline';

type AdminProject = Project & {
  clientName: string | null;
  clientEmail: string | null;
  updateCount: number;
  unreadCount: number;
  folderName: string | null;
  folderUnread: number;
};

/** Colonnes du kanban : tout le cycle de vie, brouillons repliables */
const COLUMNS = PROJECT_STATUS_FLOW.filter((s) => s !== 'draft');

export function AdminProjetsClient() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<AdminProject | null>(null);

  useEffect(() => {
    fetch('/api/admin/projects').then((r) => r.json()).then((d) => setProjects(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  const byStatus = useMemo(() => {
    const map: Record<string, AdminProject[]> = {};
    for (const s of PROJECT_STATUS_FLOW) map[s] = [];
    for (const p of projects) (map[p.status] || (map[p.status] = [])).push(p);
    return map;
  }, [projects]);

  function handlePublished(projectId: string, newStatus: ProjectStatus | null) {
    setProjects((prev) => prev.map((p) => p.id === projectId
      ? { ...p, status: newStatus || p.status, updateCount: p.updateCount + 1, updatedAt: new Date().toISOString() }
      : p));
    setSelected((prev) => prev && prev.id === projectId ? { ...prev, status: newStatus || prev.status } : prev);
  }

  function handleDeleted(projectId: string) {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setSelected(null);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  const drafts = byStatus['draft'] || [];
  const visible = filter === 'all'
    ? projects
    : (byStatus[filter] || []);

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-noir">Suivi des projets</h1>
        <p className="text-sm text-noir/50 mt-1">
          {projects.length} projet(s) — <strong>cliquez sur un projet</strong> pour le faire avancer d&apos;une étape (le client est prévenu par email), publier des photos d&apos;atelier ou discuter.
        </p>
      </div>

      {/* Filtres par étape — aperçu du pipeline sans scroll horizontal */}
      <div className="flex flex-wrap gap-2 mb-5">
        <FilterChip label="Tous" count={projects.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        {COLUMNS.map((status) => (
          <FilterChip
            key={status}
            label={PROJECT_STATUS_LABELS[status]}
            count={byStatus[status]?.length || 0}
            color={PROJECT_STATUS_COLORS[status]}
            active={filter === status}
            onClick={() => setFilter(status)}
          />
        ))}
        {drafts.length > 0 && (
          <FilterChip label="Brouillons" count={drafts.length} active={filter === 'draft'} onClick={() => setFilter('draft')} />
        )}
      </div>

      {/* Liste verticale */}
      {visible.length === 0 ? (
        <div className="text-center py-16 bg-gray-50/70 rounded-2xl">
          <p className="text-sm text-noir/45">Aucun projet dans cette étape.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-w-3xl">
          {visible.map((p) => (
            <ProjectRow key={p.id} project={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      )}

      {selected && (
        <ProjectDrawer
          project={selected}
          onClose={() => setSelected(null)}
          onPublished={handlePublished}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}

/** Pastille de filtre par étape, avec compteur */
function FilterChip({ label, count, active, color, onClick }: { label: string; count: number; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active ? 'bg-noir text-white border-noir' : 'bg-white text-noir/70 border-gray-200 hover:border-noir/40'
      } ${count === 0 && !active ? 'opacity-50' : ''}`}
    >
      {color && !active && <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden="true" />}
      {label}
      <span className={`tabular-nums ${active ? 'text-white/70' : 'text-noir/40'}`}>{count}</span>
    </button>
  );
}

/** Ligne de projet pleine largeur (vue liste verticale) */
function ProjectRow({ project: p, onClick }: { project: AdminProject; onClick: () => void }) {
  const unread = p.unreadCount + p.folderUnread;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:border-vert-foret hover:shadow transition-all p-4 flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-noir truncate">{p.name}</p>
          <Badge variant={PROJECT_STATUS_COLORS[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge>
          {p.folderName && <span className="text-[11px] text-noir/40">📂 {p.folderName}</span>}
        </div>
        <p className="text-xs text-noir/50 mt-1">
          {p.clientName || p.clientEmail || 'Sans client'} · maj {formatDate(p.updatedAt)}
          {p.updateCount > 0 && <span> · 📷 {p.updateCount} étape{p.updateCount > 1 ? 's' : ''}</span>}
        </p>
      </div>
      {unread > 0 && (
        <span className="min-w-[24px] h-6 px-2 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
          💬 {unread}
        </span>
      )}
      <svg className="w-5 h-5 text-noir/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

/** Panneau latéral : timeline du projet + publication d'une nouvelle étape */
function ProjectDrawer({
  project,
  onClose,
  onPublished,
  onDeleted,
}: {
  project: AdminProject;
  onClose: () => void;
  onPublished: (projectId: string, newStatus: ProjectStatus | null) => void;
  onDeleted: (projectId: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement le projet « ${project.name} » ? Sa configuration, son suivi et sa discussion seront perdus. Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (res.ok) onDeleted(project.id);
      else { alert('Erreur lors de la suppression'); setDeleting(false); }
    } catch {
      alert('Erreur réseau'); setDeleting(false);
    }
  }

  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [newStatus, setNewStatus] = useState<string>('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingUpdates(true);
    fetch(`/api/projects/${project.id}/updates`)
      .then((r) => r.json())
      .then((d) => setUpdates(Array.isArray(d) ? d : []))
      .finally(() => setLoadingUpdates(false));
  }, [project.id]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files).slice(0, 10 - photos.length)) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok && data.path) setPhotos((prev) => [...prev, data.path]);
      } catch { /* fichier suivant */ }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handlePublish() {
    setPublishing(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus || undefined, note: note || undefined, photos }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || 'Erreur lors de la publication');
        return;
      }
      setUpdates((prev) => [...prev, data.update]);
      onPublished(project.id, (newStatus as ProjectStatus) || null);
      setFeedback(data.emailed ? '✓ Étape publiée — le client a été prévenu par email.' : '✓ Étape publiée.');
      setNewStatus('');
      setNote('');
      setPhotos([]);
    } catch {
      setFeedback('Erreur réseau');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="fixed inset-0 bg-noir/40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl animate-fade-in p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="text-xl font-bold text-noir">{project.name}</h2>
            <p className="text-sm text-noir/50 mt-0.5">
              {project.clientName || project.clientEmail || 'Sans client'} · <Badge variant={PROJECT_STATUS_COLORS[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-full hover:bg-gray-100 text-noir/50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {/* Actions principales */}
        <div className="grid grid-cols-2 gap-2 mt-4 mb-5">
          <Link href={`/configurateur?project=${project.id}`} className="col-span-2">
            <Button className="w-full" size="sm">Voir / modifier le projet</Button>
          </Link>
          <Link href={`/admin/chat?project=${project.id}`} className="relative">
            <Button variant="outline" size="sm" className="w-full">
              💬 Discuter
              {project.unreadCount > 0 && (
                <span className="ml-1.5 inline-flex min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full items-center justify-center">{project.unreadCount}</span>
              )}
            </Button>
          </Link>
          {project.userId
            ? <Link href={`/admin/clients/${project.userId}`}><Button variant="outline" size="sm" className="w-full">Fiche client</Button></Link>
            : <span />}
        </div>
        {project.folderId && project.folderName && (
          <Link href={`/admin/chat?folder=${project.folderId}`} className="flex items-center gap-1.5 text-xs text-vert-foret hover:underline mb-5">
            📂 Discussion du dossier « {project.folderName} »
            {project.folderUnread > 0 && (
              <span className="inline-flex min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full items-center justify-center">{project.folderUnread}</span>
            )}
          </Link>
        )}

        {/* Faire avancer le projet (changement d'étape) */}
        <div className="bg-beige/50 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-noir mb-1">Faire avancer le projet</p>
          <p className="text-xs text-noir/55 mb-3">
            Étape actuelle : <Badge variant={PROJECT_STATUS_COLORS[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </p>
          <label className="block text-xs font-medium text-noir/60 mb-1">Passer à l&apos;étape</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm mb-3 focus:outline-none focus:border-vert-foret"
          >
            <option value="">— Garder « {PROJECT_STATUS_LABELS[project.status]} » —</option>
            {PROJECT_STATUS_FLOW.filter((s) => s !== 'draft' && s !== project.status).map((s) => (
              <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <label className="block text-xs font-medium text-noir/60 mb-1">Note pour le client (optionnel)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Caissons assemblés, vernis en cours de séchage…"
            className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm mb-3 resize-none focus:outline-none focus:border-vert-foret"
          />
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {photos.map((p, i) => (
              <span key={p} className="relative w-16 h-16 rounded-lg overflow-hidden ring-1 ring-noir/10">
                <Image src={p} alt={`Photo ${i + 1}`} fill sizes="64px" className="object-cover" />
                <button
                  onClick={() => setPhotos((prev) => prev.filter((x) => x !== p))}
                  aria-label="Retirer la photo"
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-noir/70 text-white rounded-full text-[10px] leading-none flex items-center justify-center"
                >×</button>
              </span>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || photos.length >= 10}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-noir/20 text-noir/40 hover:border-vert-foret hover:text-vert-foret flex items-center justify-center text-xl disabled:opacity-40 transition-colors"
              aria-label="Ajouter des photos d'atelier"
            >
              {uploading ? '…' : '+'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          </div>
          {feedback && <p className={`text-xs mb-2 ${feedback.startsWith('✓') ? 'text-vert-foret font-semibold' : 'text-red-600'}`}>{feedback}</p>}
          <Button onClick={handlePublish} isLoading={publishing} size="sm" className="w-full">
            {newStatus ? `Passer à « ${PROJECT_STATUS_LABELS[newStatus]} » et prévenir le client` : 'Publier (le client est prévenu par email)'}
          </Button>
        </div>

        {/* Historique de fabrication */}
        <p className="text-sm font-semibold text-noir mb-3">Historique</p>
        {loadingUpdates ? (
          <p className="text-sm text-noir/40">Chargement…</p>
        ) : (
          <Timeline updates={updates} />
        )}

        {/* Zone dangereuse */}
        <div className="mt-8 pt-4 border-t border-gray-100">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
          >
            {deleting ? 'Suppression…' : 'Supprimer ce projet'}
          </button>
        </div>
      </div>
    </div>
  );
}
