'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/lib/constants';
import type { Quote, QuoteItem } from '@/lib/types';

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret';

export function AdminDevisEditClient({ quoteId }: { quoteId: string }) {
  const toast = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/quotes/${quoteId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((q: Quote) => {
        setQuote(q);
        setItems(q.items || []);
        setTitle(q.title || '');
        setValidUntil(q.validUntil ? q.validUntil.slice(0, 10) : '');
        setAdminNotes(q.adminNotes || '');
      })
      .catch(() => toast.error('Devis introuvable'))
      .finally(() => setLoading(false));
  }, [quoteId, toast]);

  const totals = useMemo(() => {
    const ht = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
    const tva = ht * ((quote?.taxRate ?? 20) / 100);
    return { ht, tva, ttc: ht + tva };
  }, [items, quote?.taxRate]);

  const editable = quote && ['draft', 'sent', 'viewed', 'expired'].includes(quote.status);

  const patchItem = (i: number, patch: Partial<QuoteItem>) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  async function save(): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, adminNotes, validUntil: validUntil || null, items }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erreur de sauvegarde'); return false; }
      setQuote(data);
      setItems(data.items || []);
      toast.success('Devis enregistré');
      return true;
    } catch {
      toast.error('Erreur de sauvegarde');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function sendToClient() {
    if (!window.confirm(`Envoyer le devis ${quote?.quoteNumber} au client avec le PDF en pièce jointe ?`)) return;
    // On sauvegarde d'abord pour que le PDF parte avec les dernières modifications
    const ok = await save();
    if (!ok) return;
    setSending(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erreur d'envoi"); return; }
      setQuote(data);
      toast.success('Devis envoyé au client (PDF joint)');
    } catch {
      toast.error("Erreur d'envoi");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!quote) {
    return <div className="p-8 text-sm text-noir/60">Devis introuvable. <Link href="/admin/devis" className="text-vert-foret hover:underline">Retour à la liste</Link></div>;
  }

  const config = quote.configData as { univers?: string; modules?: unknown[] } | null;

  return (
    <div className="p-6 max-w-5xl">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Link href="/admin/devis" className="text-xs text-noir/50 hover:text-noir">← Tous les devis</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-3">
            Devis {quote.quoteNumber}
            <Badge variant={QUOTE_STATUS_COLORS[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
          </h1>
          <p className="text-sm text-noir/60 mt-1">
            {quote.clientName || '—'} · {quote.clientEmail || '—'}{quote.clientPhone ? ` · ${quote.clientPhone}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/quotes/${quoteId}/pdf`} target="_blank" rel="noopener" className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-full text-gray-700 hover:bg-gray-50 transition-colors">
            Télécharger le PDF
          </a>
          {editable && (
            <>
              <Button variant="outline" onClick={save} isLoading={saving}>Enregistrer</Button>
              <Button onClick={sendToClient} isLoading={sending}>
                {quote.status === 'draft' ? 'Envoyer au client' : 'Renvoyer au client'}
              </Button>
            </>
          )}
        </div>
      </div>

      {!editable && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Ce devis a été {quote.status === 'accepted' ? 'accepté' : 'refusé'} par le client : il n&apos;est plus modifiable. Créez un nouveau devis si nécessaire.
        </div>
      )}

      {quote.revisionRequestedAt && (quote.status === 'sent' || quote.status === 'viewed') && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <p className="font-semibold mb-1">
            ✏️ Le client a demandé une modification le {new Date(quote.revisionRequestedAt).toLocaleDateString('fr-FR')} :
          </p>
          <p className="whitespace-pre-wrap">{quote.revisionMessage}</p>
          <p className="text-xs text-blue-700/80 mt-2">Ajustez les lignes ci-dessous puis renvoyez le devis au client.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Objet */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-medium text-gray-500 mb-1">Objet du devis</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} className={inputCls} />
          </div>

          {/* Lignes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Lignes du devis</h2>
              {editable && (
                <button onClick={() => setItems((p) => [...p, { description: '', quantity: 1, unitPrice: 0, total: 0 }])} className="text-xs font-medium text-vert-foret hover:underline">
                  + Ajouter une ligne
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_70px_100px_90px_28px] gap-2 text-[11px] text-gray-400 uppercase tracking-wider px-1">
                <span>Désignation</span><span className="text-center">Qté</span><span className="text-right">PU HT</span><span className="text-right">Total HT</span><span />
              </div>
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_100px_90px_28px] gap-2 items-center">
                  <input value={it.description} disabled={!editable} onChange={(e) => patchItem(i, { description: e.target.value })} className={inputCls} placeholder="Désignation" />
                  <input type="number" min={1} value={it.quantity} disabled={!editable} onChange={(e) => patchItem(i, { quantity: Number(e.target.value) })} className={`${inputCls} text-center`} />
                  <input type="number" min={0} step="0.01" value={it.unitPrice} disabled={!editable} onChange={(e) => patchItem(i, { unitPrice: Number(e.target.value) })} className={`${inputCls} text-right`} />
                  <span className="text-sm text-right tabular-nums text-gray-700">{eur((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}</span>
                  {editable && items.length > 1 ? (
                    <button onClick={() => setItems((p) => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600" aria-label="Supprimer la ligne">✕</button>
                  ) : <span />}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm space-y-1 text-right">
                <p className="text-gray-500">Total HT : <span className="tabular-nums text-gray-800">{eur(totals.ht)}</span></p>
                <p className="text-gray-500">TVA {Math.round(quote.taxRate ?? 20)} % : <span className="tabular-nums text-gray-800">{eur(totals.tva)}</span></p>
                <p className="font-bold text-base text-vert-foret">Total TTC : <span className="tabular-nums">{eur(totals.ttc)}</span></p>
              </div>
            </div>
          </div>

          {/* Notes internes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes internes (jamais visibles par le client)</label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} disabled={!editable} rows={3} className={inputCls} />
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Validité</h2>
            <label className="block text-xs font-medium text-gray-500 mb-1">Valable jusqu&apos;au</label>
            <input type="date" value={validUntil} disabled={!editable} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} />
            <p className="text-xs text-gray-400 mt-2">Vide = 30 jours après émission (mention par défaut du PDF).</p>
          </div>

          {quote.description && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Demande du client</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{quote.description}</p>
            </div>
          )}

          {config?.modules && Array.isArray(config.modules) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Configuration d&apos;origine</h2>
              <p className="text-sm text-gray-600">{config.modules.length} modules ({config.univers}) — composition issue du configurateur.</p>
              <p className="text-xs text-gray-400 mt-1">Le JSON complet est conservé dans le devis (config_data).</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5 text-xs text-gray-500 space-y-1.5">
            <p>Créé le {new Date(quote.createdAt).toLocaleDateString('fr-FR')}</p>
            {quote.sentAt && <p>Envoyé le {new Date(quote.sentAt).toLocaleDateString('fr-FR')}</p>}
            {quote.acceptedAt && <p className="text-green-700 font-medium">Accepté le {new Date(quote.acceptedAt).toLocaleDateString('fr-FR')}</p>}
            {quote.refusedAt && <p className="text-red-700 font-medium">Refusé le {new Date(quote.refusedAt).toLocaleDateString('fr-FR')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
