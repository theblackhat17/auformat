'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project, ProjectFolder, ProjectMilestone, ProjectUpdate, ProjectDocument, ProjectStatus } from '@/lib/types';
import { PROJECT_STATUS_COLORS, PROJECT_TYPE_ICONS } from '@/lib/constants';
import { currentMilestone, milestoneProgress, isClientVisible } from '@/lib/project-config';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ChatPanel } from '@/components/chat/ChatPanel';

type FolderDetail = ProjectFolder & { clientName: string | null; clientEmail: string | null; clientPhone: string | null };

const TABS = [
  { key: 'projets', label: 'Projets' },
  { key: 'etapes', label: 'Étapes' },
  { key: 'suivi', label: 'Suivi client' },
  { key: 'documents', label: 'Documents' },
  { key: 'messagerie', label: 'Messagerie' },
  { key: 'notes', label: 'Notes' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function DossierDetailClient({ folderId }: { folderId: string }) {
  const [folder, setFolder] = useState<FolderDetail | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [catalog, setCatalog] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('projets');
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/folders/${folderId}`);
    if (!res.ok) throw new Error();
    const d = await res.json();
    setFolder(d.folder);
    setProjects(Array.isArray(d.projects) ? d.projects : []);
  }, [folderId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        const s = await fetch('/api/admin/project-settings').then((r) => r.json()).catch(() => null);
        if (!cancelled && s && Array.isArray(s.milestones)) setCatalog(s.milestones);
      } catch {
        if (!cancelled) toast.error('Erreur de chargement du dossier');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  async function handleDelete() {
    if (!confirm('Supprimer ce dossier ? Les projets qu\'il contient seront détachés (pas supprimés).')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/folders/${folderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Dossier supprimé');
      router.push('/admin/projets');
    } catch {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
    }
  }

  if (loading || !folder) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;
  }

  const stageLabel = currentMilestone({ milestones: folder.milestones }, catalog)?.label ?? 'Nouveau dossier';

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/projets" className="inline-flex items-center gap-1 text-sm text-noir/50 hover:text-vert-foret mb-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Suivi des projets
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl" aria-hidden="true">📂</span>
          <h1 className="text-2xl font-bold text-noir">{folder.name}</h1>
          <Badge variant={PROJECT_STATUS_COLORS[folder.status]}>{stageLabel}</Badge>
          <span className="text-xs text-noir/40">{projects.length} projet{projects.length > 1 ? 's' : ''}</span>
          <div className="ml-auto">
            <button onClick={handleDelete} disabled={deleting} className="text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </div>
        <p className="text-sm text-noir/50 mt-1">
          {folder.clientName || folder.clientEmail
            ? `${folder.clientName || folder.clientEmail}${folder.clientName && folder.clientEmail ? ` · ${folder.clientEmail}` : ''}`
            : 'Aucun client attribué'}
        </p>
      </div>

      <div className="border-b border-gray-200 flex gap-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.key ? 'border-vert-foret text-vert-foret' : 'border-transparent text-noir/40 hover:text-noir/70'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'projets' && (
        <ProjetsTab folderId={folderId} folder={folder} projects={projects} onChanged={refresh} />
      )}
      {tab === 'etapes' && (
        <EtapesTab folderId={folderId} catalog={catalog} milestones={folder.milestones || {}} onChanged={(m, s) => setFolder((f) => (f ? { ...f, milestones: m, status: s } : f))} />
      )}
      {tab === 'suivi' && (
        <SuiviTab folderId={folderId} catalog={catalog} onStageChanged={(m, s) => setFolder((f) => (f ? { ...f, milestones: m, status: s } : f))} />
      )}
      {tab === 'documents' && <DocumentsTab folderId={folderId} />}
      {tab === 'messagerie' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <ChatPanel folderId={folderId} viewerRole="admin" />
        </div>
      )}
      {tab === 'notes' && <NotesTab folderId={folderId} value={folder.adminNotes || ''} onSaved={(v) => setFolder((f) => (f ? { ...f, adminNotes: v } : f))} />}
    </div>
  );
}

/* ————— Projets du dossier ————— */
function ProjetsTab({ folderId, folder, projects, onChanged }: { folderId: string; folder: FolderDetail; projects: Project[]; onChanged: () => Promise<void>; }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [assigning, setAssigning] = useState(false);

  async function createProject() {
    if (!name.trim()) { toast.error('Nom du projet requis'); return; }
    setCreating(true);
    try {
      const res = await fetch(`/api/admin/folders/${folderId}/projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), type: 'libre' }),
      });
      if (!res.ok) throw new Error();
      setName('');
      await onChanged();
      toast.success('Projet ajouté au dossier');
    } catch { toast.error('Erreur'); } finally { setCreating(false); }
  }

  async function detach(p: Project) {
    if (!confirm(`Détacher « ${p.name} » du dossier ? (le projet n'est pas supprimé)`)) return;
    const res = await fetch(`/api/admin/folders/${folderId}/projects`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: p.id }),
    });
    if (res.ok) { await onChanged(); toast.success('Projet détaché'); } else toast.error('Erreur');
  }

  async function assignClient() {
    if (!clientEmail.trim()) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/folders/${folderId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientEmail: clientEmail.trim() }),
      });
      if (!res.ok) throw new Error();
      setClientEmail('');
      await onChanged();
      toast.success('Client attribué au dossier');
    } catch { toast.error('Erreur'); } finally { setAssigning(false); }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {!folder.userId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-2">Aucun client attribué</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <Input label="E-mail du client" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@exemple.fr" />
            </div>
            <Button size="sm" onClick={assignClient} isLoading={assigning}>Attribuer</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-3">Projets du dossier</p>
        {projects.length === 0 ? (
          <p className="text-sm text-noir/45 mb-4">Aucun projet pour l&apos;instant. Ajoutez-en un ci-dessous.</p>
        ) : (
          <ul className="divide-y divide-gray-100 mb-4">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span aria-hidden>{PROJECT_TYPE_ICONS[p.type] || '🪚'}</span>
                <Link href={`/admin/projets/${p.id}`} className="flex-1 min-w-0 text-sm font-medium text-noir hover:text-vert-foret hover:underline truncate">{p.name}</Link>
                <span className="text-xs text-noir/40 hidden sm:block">{formatDate(p.createdAt)}</span>
                <button onClick={() => detach(p)} className="text-sm text-red-600 hover:underline">Détacher</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
          <div className="flex-1 min-w-[200px]">
            <Input label="Nouveau projet (sans configurateur)" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Plan de cuisine" />
          </div>
          <Button size="sm" onClick={createProject} isLoading={creating}>+ Ajouter</Button>
        </div>
      </div>
    </div>
  );
}

/* ————— Étapes du dossier ————— */
function EtapesTab({ folderId, catalog, milestones, onChanged }: {
  folderId: string; catalog: ProjectMilestone[]; milestones: Record<string, { done: boolean }>; onChanged: (m: Record<string, { done: boolean }>, s: ProjectStatus) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const { done, total } = milestoneProgress({ milestones }, catalog);
  const current = currentMilestone({ milestones }, catalog);

  async function toggle(key: string, value: boolean) {
    setSaving(key);
    try {
      const res = await fetch(`/api/admin/folders/${folderId}/milestones`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, done: value }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onChanged(data.milestones, data.status);
    } catch { toast.error('Erreur'); } finally { setSaving(null); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-noir">Avancement du dossier</p>
        <span className="text-sm text-noir/45 tabular-nums">{done} / {total} étapes</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-noir/10 mb-4">
        <span className="block h-full rounded-full bg-vert-foret" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
      </div>
      <p className="text-xs text-noir/50 mb-3">« visible client » = montrée au client ; « interne » = atelier seulement (réglable dans Configuration des étapes).</p>
      <ol className="space-y-1.5">
        {catalog.map((m) => {
          const isDone = milestones[m.key]?.done ?? false;
          const isCurrent = current?.key === m.key;
          return (
            <li key={m.key}>
              <button
                onClick={() => toggle(m.key, !isDone)}
                disabled={saving === m.key}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-beige/50 disabled:opacity-50"
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isDone ? 'border-vert-foret bg-vert-foret text-white' : 'border-noir/25'}`}>
                  {isDone && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </span>
                <span className={isDone ? 'text-noir' : 'text-noir/70'}>{m.label}</span>
                {isClientVisible(m)
                  ? <span className="rounded bg-vert-foret/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vert-foret">visible client</span>
                  : <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">interne</span>}
                {isCurrent && <span className="rounded bg-vert-foret/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vert-foret">étape actuelle</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ————— Suivi client du dossier ————— */
function SuiviTab({ folderId, catalog, onStageChanged }: {
  folderId: string; catalog: ProjectMilestone[]; onStageChanged: (m: Record<string, { done: boolean }>, s: ProjectStatus) => void;
}) {
  const toast = useToast();
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageKey, setStageKey] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/folders/${folderId}/updates`).then((r) => r.json())
      .then((d) => { if (!cancelled) setUpdates(Array.isArray(d.updates) ? d.updates : []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [folderId]);

  async function publish() {
    if (!stageKey && !note.trim() && files.length === 0) { toast.error('Indiquez une étape, une note ou des photos.'); return; }
    setPublishing(true);
    try {
      const fd = new FormData();
      if (stageKey) fd.append('stageKey', stageKey);
      if (note.trim()) fd.append('note', note.trim());
      for (const f of files) fd.append('photos', f);
      const res = await fetch(`/api/admin/folders/${folderId}/updates`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur'); return; }
      if (data.update) setUpdates((prev) => [data.update, ...prev]);
      if (data.milestones && data.status) onStageChanged(data.milestones, data.status);
      setStageKey(''); setNote(''); setFiles([]);
      if (fileRef.current) fileRef.current.value = '';
      toast.success(data.emailed ? 'Publié — le client a été prévenu par e-mail.' : 'Publié.');
    } catch { toast.error('Erreur réseau'); } finally { setPublishing(false); }
  }

  async function del(u: ProjectUpdate) {
    if (!confirm('Supprimer cette étape de la timeline du client ?')) return;
    const res = await fetch(`/api/admin/folders/${folderId}/updates`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updateId: u.id }) });
    if (res.ok) setUpdates((prev) => prev.filter((x) => x.id !== u.id)); else toast.error('Erreur');
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-1">Publier une étape</p>
        <p className="text-xs text-noir/50 mb-4">Le client la verra dans son suivi et recevra un e-mail (jamais de prix).</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-noir/60 mb-1">Marquer une étape franchie (optionnel)</label>
            <select value={stageKey} onChange={(e) => setStageKey(e.target.value)} className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret">
              <option value="">— Ne pas changer l&apos;étape —</option>
              {catalog.map((m) => <option key={m.key} value={m.key}>{m.label}{isClientVisible(m) ? '' : ' (interne)'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-noir/60 mb-1">Message au client (optionnel)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="Ex. Le dossier avance : la pose est planifiée." className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret resize-y" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>{files.length > 0 ? `${files.length} photo(s)` : 'Ajouter des photos'}</Button>
            {files.length > 0 && <button onClick={() => { setFiles([]); if (fileRef.current) fileRef.current.value = ''; }} className="text-xs text-noir/50 hover:text-red-600">retirer</button>}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 10))} />
            <Button size="sm" className="ml-auto" onClick={publish} isLoading={publishing}>Publier</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-4">Timeline du client</p>
        {loading ? <p className="text-sm text-noir/40">Chargement…</p> : updates.length === 0 ? (
          <p className="text-sm text-noir/45">Aucune étape publiée pour l&apos;instant.</p>
        ) : (
          <ol className="space-y-4">
            {updates.map((u) => (
              <li key={u.id} className="relative border-l-2 border-vert-foret/25 pl-4">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-vert-foret" aria-hidden="true" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-noir/45">{formatDate(u.createdAt)}</span>
                  <button onClick={() => del(u)} className="ml-auto text-xs text-red-600 hover:underline">Supprimer</button>
                </div>
                {u.note && <p className="mt-1.5 text-sm text-noir/80 whitespace-pre-line">{u.note}</p>}
                {u.photos?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {u.photos.map((src) => (
                      <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Photo" className="h-full w-full object-cover" />
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

/* ————— Documents du dossier ————— */
function DocumentsTab({ folderId }: { folderId: string }) {
  const toast = useToast();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState<'client' | 'admin'>('client');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/folders/${folderId}/documents`).then((r) => r.json())
      .then((d) => { if (!cancelled) setDocuments(Array.isArray(d) ? d : []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [folderId]);

  async function upload(fl: FileList | null) {
    if (!fl?.length) return;
    setUploading(true);
    for (const file of Array.from(fl)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('visibility', visibility);
      try {
        const res = await fetch(`/api/admin/folders/${folderId}/documents`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || `Erreur sur « ${file.name} »`); continue; }
        setDocuments((prev) => [data.document, ...prev]);
      } catch { toast.error('Erreur réseau'); }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function del(doc: ProjectDocument) {
    if (!confirm(`Supprimer « ${doc.name} » ?`)) return;
    const res = await fetch(`/api/admin/folders/${folderId}/documents`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: doc.id }) });
    if (res.ok) { setDocuments((prev) => prev.filter((d) => d.id !== doc.id)); toast.success('Document supprimé'); } else toast.error('Erreur');
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-2xl">
      <p className="text-sm font-semibold text-noir mb-4">Documents du dossier</p>
      <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-beige/50 rounded-xl">
        <select value={visibility} onChange={(e) => setVisibility(e.target.value === 'client' ? 'client' : 'admin')} className="px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret">
          <option value="client">Visible par le client</option>
          <option value="admin">Interne (admin seulement)</option>
        </select>
        <Button size="sm" onClick={() => fileRef.current?.click()} isLoading={uploading}>Ajouter un document</Button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>
      {loading ? <p className="text-sm text-noir/40">Chargement…</p> : documents.length === 0 ? (
        <p className="text-sm text-noir/45">Aucun document pour ce dossier.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5">
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-sm text-noir hover:text-vert-foret hover:underline truncate">{doc.name}</a>
              <Badge variant={doc.visibility === 'client' ? 'success' : 'default'}>{doc.visibility === 'client' ? 'Client' : 'Interne'}</Badge>
              <span className="text-xs text-noir/40 hidden sm:block">{formatDate(doc.createdAt)}</span>
              <button onClick={() => del(doc)} className="text-sm text-red-600 hover:underline">Supprimer</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ————— Notes internes du dossier ————— */
function NotesTab({ folderId, value, onSaved }: { folderId: string; value: string; onSaved: (v: string) => void }) {
  const toast = useToast();
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/folders/${folderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNotes: text }) });
      if (!res.ok) throw new Error();
      onSaved(text);
      toast.success('Notes enregistrées');
    } catch { toast.error('Erreur'); } finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-2xl">
      <p className="text-sm font-semibold text-noir mb-1">Notes internes</p>
      <p className="text-xs text-noir/50 mb-3">Jamais visibles par le client.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret resize-y" />
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={save} isLoading={saving}>Enregistrer</Button>
      </div>
    </div>
  );
}
