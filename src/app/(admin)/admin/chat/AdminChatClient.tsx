'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from '@/lib/constants';

type Conversation = {
  kind: 'project' | 'folder';
  threadId: string;
  label: string;
  projectStatus: string | null;
  clientId: string;
  clientName: string | null;
  clientEmail: string | null;
  lastAt: string;
  lastBody: string | null;
  lastRole: 'client' | 'admin';
  lastAtt: number;
  unread: number;
};

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function AdminChatClient() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);

  const load = useCallback(() => {
    return fetch('/api/admin/chat/conversations')
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Conversation[]) => {
        const list = Array.isArray(d) ? d : [];
        setConversations(list);
        return list;
      })
      .catch(() => [] as Conversation[]);
  }, []);

  // Chargement initial + sélection via ?project=ID / ?folder=ID
  useEffect(() => {
    load().then((list) => {
      const pid = searchParams.get('project');
      const fid = searchParams.get('folder');
      if (pid) setSelected(list.find((c) => c.kind === 'project' && c.threadId === pid) || null);
      else if (fid) setSelected(list.find((c) => c.kind === 'folder' && c.threadId === fid) || null);
      setLoading(false);
    });
  }, [load, searchParams]);

  // Rafraîchissement périodique de la liste (nouveaux messages, derniers aperçus)
  useEffect(() => {
    const id = setInterval(() => load(), 15000);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  // Grouper par client, dans l'ordre du dernier message
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, { name: string; email: string | null; convos: Conversation[] }>();
    for (const c of conversations) {
      if (!map.has(c.clientId)) {
        map.set(c.clientId, { name: c.clientName || c.clientEmail || 'Client', email: c.clientEmail, convos: [] });
        order.push(c.clientId);
      }
      map.get(c.clientId)!.convos.push(c);
    }
    return order.map((id) => ({ id, ...map.get(id)! }));
  }, [conversations]);

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  const handleRead = useCallback(() => {
    // Le fil ouvert vient d'être marqué lu : on remet son compteur à zéro et on rafraîchit
    if (selected) {
      setConversations((prev) => prev.map((c) =>
        c.kind === selected.kind && c.threadId === selected.threadId ? { ...c, unread: 0 } : c));
    }
    load();
  }, [selected, load]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-noir">Messagerie</h1>
        {totalUnread > 0 && (
          <span className="min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{totalUnread}</span>
        )}
      </div>

      <div className="flex gap-4 h-[calc(100vh-11rem)] min-h-[420px]">
        {/* Liste des conversations groupées par client */}
        <aside className={`w-full md:w-[340px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 overflow-y-auto ${selected ? 'hidden md:block' : ''}`}>
          {loading ? (
            <p className="text-sm text-noir/40 text-center py-10">Chargement…</p>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 px-6">
              <span className="text-3xl">💬</span>
              <p className="text-sm text-noir/55 mt-2">Aucune conversation pour l&apos;instant. Les clients vous écrivent depuis leur espace projet.</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.id} className="border-b border-gray-50 last:border-0">
                <div className="px-4 pt-3 pb-1.5 flex items-center justify-between gap-2 sticky top-0 bg-white/95 backdrop-blur-sm">
                  <Link href={`/admin/clients/${g.id}`} className="text-sm font-bold text-noir hover:text-vert-foret truncate">{g.name}</Link>
                  <span className="text-[11px] text-noir/35 truncate flex-shrink-0">{g.email}</span>
                </div>
                {g.convos.map((c) => {
                  const isSel = selected?.kind === c.kind && selected?.threadId === c.threadId;
                  const preview = c.lastBody || (c.lastAtt > 0 ? `📎 ${c.lastAtt} document${c.lastAtt > 1 ? 's' : ''}` : '');
                  return (
                    <button
                      key={`${c.kind}-${c.threadId}`}
                      onClick={() => setSelected(c)}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors ${isSel ? 'bg-vert-foret/8' : 'hover:bg-gray-50'}`}
                    >
                      <span className="text-base mt-0.5">{c.kind === 'folder' ? '📂' : '🛠️'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-noir truncate">{c.label}</p>
                          <span className="text-[11px] text-noir/40 flex-shrink-0">{relative(c.lastAt)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={`text-xs truncate ${c.unread > 0 ? 'text-noir font-medium' : 'text-noir/50'}`}>
                            {c.lastRole === 'admin' && <span className="text-noir/40">Vous : </span>}{preview}
                          </p>
                          {c.unread > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">{c.unread}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </aside>

        {/* Conversation sélectionnée */}
        <section className={`flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col ${selected ? '' : 'hidden md:flex'}`}>
          {selected ? (
            <>
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
                <button onClick={() => setSelected(null)} className="md:hidden text-noir/50" aria-label="Retour">←</button>
                <span className="text-lg">{selected.kind === 'folder' ? '📂' : '🛠️'}</span>
                <div className="min-w-0">
                  <p className="font-bold text-noir truncate">{selected.label}</p>
                  <p className="text-xs text-noir/50 truncate">
                    {selected.clientName || selected.clientEmail}
                    {selected.kind === 'project' && selected.projectStatus && (
                      <> · <span className={`px-1.5 py-0.5 rounded-full ${PROJECT_STATUS_COLORS[selected.projectStatus]}`}>{PROJECT_STATUS_LABELS[selected.projectStatus]}</span></>
                    )}
                    {selected.kind === 'folder' && ' · Dossier de chantier'}
                  </p>
                </div>
                {selected.kind === 'project' && (
                  <Link href={`/admin/projets`} className="ml-auto text-xs text-vert-foret hover:underline flex-shrink-0">Voir le suivi</Link>
                )}
              </div>
              <div className="flex-1 min-h-0 p-4">
                <ChatPanel
                  key={`${selected.kind}-${selected.threadId}`}
                  projectId={selected.kind === 'project' ? selected.threadId : undefined}
                  folderId={selected.kind === 'folder' ? selected.threadId : undefined}
                  viewerRole="admin"
                  onRead={handleRead}
                  heightClass="h-full"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <p className="text-sm text-noir/40">Sélectionnez une conversation pour répondre au client.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
