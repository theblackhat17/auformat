'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project, ProjectFolder, ProjectMilestone, ProjectUpdate, ProjectDocument, ProjectStatus, ProjectEvent, ConfigurateurModuleType, ConfigurateurMaterial, CompositionConfig } from '@/lib/types';
import { PROJECT_STATUS_COLORS, PROJECT_TYPE_ICONS, PROJECT_EVENT_TYPES } from '@/lib/constants';
import { currentMilestone, milestoneProgress, isClientVisible } from '@/lib/project-config';
import { computeDebit } from '@/lib/debit';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ClientPicker, type PickedClient } from '@/components/admin/ClientPicker';

type FolderDetail = ProjectFolder & { clientName: string | null; clientEmail: string | null; clientPhone: string | null };

const TABS = [
  { key: 'projets', label: 'Projets' },
  { key: 'production', label: 'Production' },
  { key: 'etapes', label: 'Étapes' },
  { key: 'suivi', label: 'Suivi client' },
  { key: 'agenda', label: 'Agenda' },
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
      {tab === 'production' && <ProductionTab projects={projects} />}
      {tab === 'etapes' && (
        <EtapesTab folderId={folderId} catalog={catalog} milestones={folder.milestones || {}} onChanged={(m, s) => setFolder((f) => (f ? { ...f, milestones: m, status: s } : f))} />
      )}
      {tab === 'suivi' && (
        <SuiviTab folderId={folderId} catalog={catalog} onStageChanged={(m, s) => setFolder((f) => (f ? { ...f, milestones: m, status: s } : f))} />
      )}
      {tab === 'agenda' && <AgendaTab folderId={folderId} />}
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
  const [client, setClient] = useState<PickedClient>({ email: '' });
  const [assigning, setAssigning] = useState(false);
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([]);
  const [attachId, setAttachId] = useState('');

  // Projets du même client, hors dossier, rattachables à celui-ci
  useEffect(() => {
    if (!folder.userId) { setCandidates([]); return; }
    let cancelled = false;
    fetch('/api/admin/projects').then((r) => r.json()).then((all) => {
      if (cancelled || !Array.isArray(all)) return;
      setCandidates(all.filter((p: Project) => p.userId === folder.userId && !p.folderId).map((p: Project) => ({ id: p.id, name: p.name })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [folder.userId, projects.length]);

  async function attach() {
    if (!attachId) return;
    const res = await fetch(`/api/admin/folders/${folderId}/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: attachId }) });
    if (res.ok) { setAttachId(''); await onChanged(); toast.success('Projet rattaché'); } else toast.error('Erreur');
  }

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
    const payload = client.userId ? { clientUserId: client.userId } : client.email.trim() ? { clientEmail: client.email.trim(), clientName: client.name || undefined } : null;
    if (!payload) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/folders/${folderId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setClient({ email: '' });
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
            <div className="flex-1 min-w-[220px]">
              <ClientPicker label="Client" value={client} onChange={setClient} />
            </div>
            <Button size="sm" onClick={assignClient} isLoading={assigning}>Attribuer</Button>
          </div>
          {!client.userId && client.email.trim() && (
            <div className="mt-2 max-w-xs">
              <Input label="Nom du client (nouveau)" value={client.name || ''} onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))} />
            </div>
          )}
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

        {candidates.length > 0 && (
          <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4 mt-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-noir/60 mb-1">Rattacher un projet existant du client</label>
              <select value={attachId} onChange={(e) => setAttachId(e.target.value)} className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret">
                <option value="">— Choisir un projet —</option>
                {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button size="sm" variant="secondary" onClick={attach} disabled={!attachId}>Rattacher</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ————— Production / débit agrégé du dossier ————— */
function ProductionTab({ projects }: { projects: Project[] }) {
  const [catalog, setCatalog] = useState<{ moduleTypes: ConfigurateurModuleType[]; materials: ConfigurateurMaterial[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/content/configurateur')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setCatalog({ moduleTypes: Array.isArray(d.module_types) ? d.module_types : [], materials: Array.isArray(d.materials) ? d.materials : [] }); })
      .catch(() => { if (!cancelled) setCatalog({ moduleTypes: [], materials: [] }); });
    return () => { cancelled = true; };
  }, []);

  if (!catalog) {
    return <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-3xl"><p className="text-sm text-noir/40">Chargement…</p></div>;
  }

  const perProject: { name: string; panels: number; m2: number }[] = [];
  const panelMap = new Map<string, { piece: string; largeur: number; hauteur: number; materiau: string; quantite: number }>();
  let totalPanels = 0, totalM2 = 0;
  for (const p of projects) {
    const cfg = p.config && typeof p.config === 'object' && (p.config as unknown as CompositionConfig).version === 2 ? (p.config as unknown as CompositionConfig) : null;
    const d = computeDebit(cfg, catalog.moduleTypes, catalog.materials);
    const projM2 = Math.round(d.surfaces.reduce((s, x) => s + x.m2, 0) * 100) / 100;
    perProject.push({ name: p.name, panels: d.totalPanels, m2: projM2 });
    totalPanels += d.totalPanels; totalM2 += projM2;
    for (const pan of d.panels) {
      const key = `${pan.piece}|${pan.materiau}|${pan.largeur}x${pan.hauteur}`;
      const ex = panelMap.get(key);
      if (ex) ex.quantite += pan.quantite; else panelMap.set(key, { ...pan });
    }
  }
  const panels = [...panelMap.values()].sort((a, b) => a.materiau.localeCompare(b.materiau) || a.piece.localeCompare(b.piece));
  const fmtM2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-1">Débit agrégé du dossier</p>
        <p className="text-xs text-noir/50 mb-4">Somme du débit atelier estimatif de tous les projets issus du configurateur. Sans prix.</p>
        <div className="flex flex-wrap gap-8 mb-4">
          <div><p className="text-2xl font-bold text-noir tabular-nums leading-none">{totalPanels}</p><p className="text-xs text-noir/50 mt-1">panneaux</p></div>
          <div><p className="text-2xl font-bold text-noir tabular-nums leading-none">{fmtM2(totalM2)}</p><p className="text-xs text-noir/50 mt-1">m² de panneaux</p></div>
          <div><p className="text-2xl font-bold text-noir tabular-nums leading-none">{projects.length}</p><p className="text-xs text-noir/50 mt-1">projet(s)</p></div>
        </div>
        {perProject.length > 0 && (
          <ul className="text-sm text-noir/70 space-y-1 border-t border-gray-100 pt-3">
            {perProject.map((pp, i) => (
              <li key={i} className="flex justify-between gap-3"><span className="truncate">{pp.name}</span><span className="shrink-0 tabular-nums text-noir/50">{pp.panels} pan · {fmtM2(pp.m2)} m²</span></li>
            ))}
          </ul>
        )}
      </div>

      {panels.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-noir mb-3">Panneaux à débiter (cumulés)</p>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-left text-xs text-noir/40 uppercase tracking-wide border-b border-gray-200">
                  <th className="py-2 pr-3 font-semibold">Pièce</th>
                  <th className="py-2 pr-3 font-semibold">Dim. (mm)</th>
                  <th className="py-2 pr-3 font-semibold">Matériau</th>
                  <th className="py-2 font-semibold text-right">Qté</th>
                </tr>
              </thead>
              <tbody>
                {panels.map((pan, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 pr-3">{pan.piece}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{pan.largeur} × {pan.hauteur}</td>
                    <td className="py-1.5 pr-3">{pan.materiau}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">{pan.quantite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-noir/45">Aucun projet issu du configurateur dans ce dossier — rien à débiter pour l&apos;instant.</p>
        </div>
      )}
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

/* ————— Agenda du dossier ————— */
function AgendaTab({ folderId }: { folderId: string }) {
  const toast = useToast();
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: PROJECT_EVENT_TYPES[0].key, date: '', time: '09:00', allDay: false, title: '' });
  const [saving, setSaving] = useState(false);
  const typeByKey = new Map(PROJECT_EVENT_TYPES.map((t) => [t.key, t]));

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/folders/${folderId}/events`).then((r) => r.json())
      .then((d) => { if (!cancelled) setEvents(Array.isArray(d.events) ? d.events : []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [folderId]);

  async function add() {
    if (!form.date) { toast.error('Choisissez une date'); return; }
    const startAt = form.allDay ? new Date(`${form.date}T00:00`).toISOString() : new Date(`${form.date}T${form.time}`).toISOString();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/folders/${folderId}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: form.type, startAt, allDay: form.allDay, title: form.title || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur'); return; }
      setEvents((e) => [...e, data.event].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
      setForm((f) => ({ ...f, title: '' }));
      toast.success('Événement ajouté');
    } catch { toast.error('Erreur réseau'); } finally { setSaving(false); }
  }

  async function del(ev: ProjectEvent) {
    if (!confirm('Supprimer cet événement ?')) return;
    const res = await fetch(`/api/admin/folders/${folderId}/events`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: ev.id }) });
    if (res.ok) setEvents((e) => e.filter((x) => x.id !== ev.id)); else toast.error('Erreur');
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-3">Ajouter un événement</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-noir/60 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret">
              {PROJECT_EVENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-noir/60 mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret" />
          </div>
          {!form.allDay && (
            <div>
              <label className="block text-xs font-medium text-noir/60 mb-1">Heure</label>
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="w-full px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret" />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-noir/80 self-end pb-2">
            <input type="checkbox" checked={form.allDay} onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-vert-foret focus:ring-vert-foret" /> Journée entière
          </label>
          <div className="sm:col-span-2">
            <Input label="Intitulé (optionnel)" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
        </div>
        <div className="mt-3 flex justify-end"><Button size="sm" onClick={add} isLoading={saving}>Ajouter</Button></div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-noir mb-3">Événements</p>
        {loading ? <p className="text-sm text-noir/40">Chargement…</p> : events.length === 0 ? (
          <p className="text-sm text-noir/45">Aucun événement.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map((ev) => {
              const t = typeByKey.get(ev.type);
              const d = new Date(ev.startAt);
              return (
                <li key={ev.id} className="flex items-center gap-3 py-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t?.color || '#2C5F2D' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-noir truncate">{ev.title || t?.label || ev.type}</p>
                    <p className="text-xs text-noir/50">{t?.label} · {d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}{ev.allDay ? '' : ` à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}</p>
                  </div>
                  <button onClick={() => del(ev)} className="text-sm text-red-600 hover:underline">Supprimer</button>
                </li>
              );
            })}
          </ul>
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
