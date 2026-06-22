'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { ChatMessage } from '@/lib/types';

/**
 * Fil de discussion client ↔ atelier, rattaché à un projet ou à un dossier.
 * Pièces jointes (photos, PDF), rafraîchissement par sondage léger toutes les 8 s.
 * Utilisé dans /mes-projets (client) et /admin/projets (atelier).
 */
export function ChatPanel({
  projectId,
  folderId,
  viewerRole,
  onRead,
  heightClass = 'h-[420px]',
}: {
  projectId?: string;
  folderId?: string;
  viewerRole: 'client' | 'admin';
  /** Appelé quand le fil est chargé : les non-lus viennent d'être marqués lus */
  onRead?: () => void;
  /** Hauteur du panneau (ex. 'h-full' dans la boîte de réception) */
  heightClass?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const threadQuery = projectId ? `projectId=${projectId}` : `folderId=${folderId}`;

  const load = useCallback(async (initial = false) => {
    try {
      const res = await fetch(`/api/chat?${threadQuery}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages((prev) => {
          // Scroll seulement quand quelque chose de nouveau arrive
          if (data.length !== prev.length) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: initial ? 'auto' : 'smooth' }), 50);
          }
          return data;
        });
        onRead?.();
      }
    } finally {
      if (initial) setLoading(false);
    }
  }, [threadQuery, onRead]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    load(true);
    const interval = setInterval(() => load(), 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadQuery]);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(list).slice(0, 5 - files.length)) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`« ${file.name} » dépasse 10 Mo`);
        continue;
      }
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/chat/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok && data.path) setFiles((prev) => [...prev, { name: data.name || file.name, url: data.path }]);
        else setError(data.error || `Échec de l'envoi de « ${file.name} »`);
      } catch {
        setError('Erreur réseau pendant l\'envoi du fichier');
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSend() {
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(projectId ? { projectId } : { folderId }),
          body: text.trim() || undefined,
          attachments: files,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'envoi');
        return;
      }
      setMessages((prev) => [...prev, data]);
      setText('');
      setFiles([]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      setError('Erreur réseau');
    } finally {
      setSending(false);
    }
  }

  const isImage = (url: string) => /\.(jpe?g|png|webp)$/i.test(url);

  return (
    <div className={`flex flex-col ${heightClass} min-h-0`}>
      {/* Fil */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {loading ? (
          <p className="text-sm text-noir/40 text-center py-8">Chargement…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-noir/50 text-center py-8 leading-relaxed">
            {viewerRole === 'client'
              ? 'Posez vos questions à l\'atelier : nous vous répondons ici et vous êtes prévenu par email.'
              : 'Aucun message pour l\'instant — écrivez au client, il sera prévenu par email.'}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === viewerRole;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${mine ? 'bg-vert-foret text-white rounded-br-sm' : 'bg-beige/70 text-noir rounded-bl-sm'}`}>
                  {!mine && (
                    <p className={`text-[10px] font-bold mb-0.5 ${mine ? 'text-white/70' : 'text-vert-foret'}`}>
                      {m.senderRole === 'admin' ? 'Atelier Au Format' : 'Client'}
                    </p>
                  )}
                  {m.body && <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>}
                  {m.attachments?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {m.attachments.map((a, i) =>
                        isImage(a.url) ? (
                          <a key={i} href={a.url} target="_blank" rel="noopener" className="relative w-24 h-24 rounded-lg overflow-hidden ring-1 ring-black/10 block">
                            <Image src={a.url} alt={a.name} fill sizes="96px" className="object-cover" />
                          </a>
                        ) : (
                          <a key={i} href={a.url} target="_blank" rel="noopener" className={`flex items-center gap-1.5 text-xs underline ${mine ? 'text-white/90' : 'text-vert-foret'}`}>
                            📄 {a.name}
                          </a>
                        )
                      )}
                    </div>
                  )}
                  <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-noir/40'}`}>
                    {new Date(m.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    {mine && m.readAt && ' · Lu'}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pièces jointes en attente */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {files.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-beige/70 rounded-full px-2.5 py-1">
              📎 <span className="max-w-[140px] truncate">{f.name}</span>
              <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} aria-label={`Retirer ${f.name}`} className="text-noir/50 hover:text-red-600 font-bold">×</button>
            </span>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-600 pt-1.5">{error}</p>}

      {/* Saisie */}
      <div className="flex items-end gap-2 pt-2 border-t border-noir/8 mt-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || files.length >= 5}
          title="Joindre une photo ou un PDF"
          aria-label="Joindre un fichier"
          className="w-9 h-9 flex-shrink-0 rounded-full border border-noir/15 text-noir/60 hover:border-vert-foret hover:text-vert-foret flex items-center justify-center disabled:opacity-40 transition-colors"
        >
          {uploading ? '…' : '📎'}
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,.pdf" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Votre message…"
          aria-label="Votre message"
          className="flex-1 px-3.5 py-2 bg-white border border-noir/20 rounded-xl text-sm resize-none focus:outline-none focus:border-vert-foret max-h-28"
        />
        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && files.length === 0)}
          className="px-4 py-2 bg-vert-foret text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity flex-shrink-0"
        >
          {sending ? '…' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}
