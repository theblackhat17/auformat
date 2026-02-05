'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Quote, Profile, QuoteItem } from '@/lib/types';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/lib/constants';
import { formatDate, formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function AdminDevisClient() {
  const [quotes, setQuotes] = useState<(Quote & { clientName?: string; clientEmail?: string })[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    userId: '',
    title: '',
    description: '',
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    adminNotes: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }] as QuoteItem[],
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/quotes').then((r) => r.json()),
      fetch('/api/profiles').then((r) => r.json()),
    ]).then(([q, c]) => { setQuotes(q); setClients(c); }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return quotes;
    return quotes.filter((q) => q.status === activeTab);
  }, [quotes, activeTab]);

  const subtotal = form.items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const tax = Math.round(subtotal * 0.2 * 100) / 100;
  const total = subtotal + tax;

  function addItem() {
    setForm((p) => ({ ...p, items: [...p.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }] }));
  }

  function removeItem(index: number) {
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
  }

  function updateItem(index: number, field: string, value: string | number) {
    setForm((p) => {
      const items = [...p.items];
      items[index] = { ...items[index], [field]: value };
      items[index].total = items[index].quantity * items[index].unitPrice;
      return { ...p, items };
    });
  }

  async function handleCreate() {
    if (!form.userId || !form.title || form.items.length === 0) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    setCreating(true);
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const newQuote = await res.json();
      setQuotes((prev) => [newQuote, ...prev]);
      setCreateModal(false);
      setForm({ userId: '', title: '', description: '', validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), adminNotes: '', items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }] });
      toast.success('Devis créé avec succès');
    } else {
      toast.error('Erreur lors de la création');
    }
    setCreating(false);
  }

  async function handleSend(id: string) {
    const res = await fetch(`/api/quotes/${id}/send`, { method: 'POST' });
    if (res.ok) {
      const updated = await res.json();
      setQuotes((prev) => prev.map((q) => q.id === id ? { ...q, ...updated } : q));
      toast.success('Devis envoyé');
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-noir">Devis</h1>
        <Button onClick={() => setCreateModal(true)}>Nouveau devis</Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {[{ key: 'all', label: 'Tous' }, { key: 'draft', label: 'Brouillons' }, { key: 'sent', label: 'Envoyés' }, { key: 'accepted', label: 'Acceptés' }, { key: 'refused', label: 'Refusés' }].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-vert-foret text-white' : 'bg-gray-100 text-noir/60 hover:bg-gray-200'}`}>
            {tab.label} ({tab.key === 'all' ? quotes.length : quotes.filter((q) => q.status === tab.key).length})
          </button>
        ))}
      </div>

      {/* Quotes table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead><tr className="bg-gray-50 text-left text-xs text-noir/40 uppercase tracking-wider">
            <th className="px-4 py-3">Devis</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3 text-right">Montant TTC</th><th className="px-4 py-3">Date</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((q) => (
              <tr key={q.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3"><p className="font-medium text-noir">{q.title}</p><p className="text-xs text-noir/30 font-mono">{q.quoteNumber}</p></td>
                <td className="px-4 py-3 text-noir/60">{q.clientName || q.clientEmail || '—'}</td>
                <td className="px-4 py-3"><Badge variant={QUOTE_STATUS_COLORS[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge></td>
                <td className="px-4 py-3 text-right font-medium">{formatPrice(q.totalTtc)}</td>
                <td className="px-4 py-3 text-noir/40 text-xs">{formatDate(q.createdAt)}</td>
                <td className="px-4 py-3">{q.status === 'draft' && <Button variant="outline" size="sm" onClick={() => handleSend(q.id)}>Envoyer</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-sm text-noir/40">Aucun devis</div>}
      </div>

      {/* Create modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Nouveau devis" size="xl" footer={
        <>
          <div className="flex-1 text-left"><p className="text-sm text-noir/50">Total TTC: <strong className="text-noir text-lg">{formatPrice(total)}</strong></p></div>
          <Button variant="ghost" onClick={() => setCreateModal(false)}>Annuler</Button>
          <Button onClick={handleCreate} isLoading={creating}>Créer le devis</Button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-noir/70 mb-1.5">Client *</label>
            <select value={form.userId} onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-vert-foret">
              <option value="">Sélectionnez un client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.fullName || c.email}{c.companyName ? ` (${c.companyName})` : ''}</option>)}
            </select>
          </div>
          <Input label="Titre du devis *" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Dressing chambre parentale" />
          <Input label="Valable jusqu'au" type="date" value={form.validUntil} onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))} />

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-noir/70">Lignes du devis</label>
              <button onClick={addItem} className="text-xs font-medium text-vert-foret hover:underline">+ Ajouter une ligne</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1"><input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-vert-foret" /></div>
                  <div className="w-20"><input type="number" min={1} placeholder="Qte" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-vert-foret" /></div>
                  <div className="w-28"><input type="number" min={0} step={0.01} placeholder="Prix HT" value={item.unitPrice || ''} onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-vert-foret" /></div>
                  <div className="w-24 text-right text-sm font-medium text-noir py-2">{formatPrice(item.quantity * item.unitPrice)}</div>
                  {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 p-2">✕</button>}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm text-right">
              <p className="text-noir/50">Sous-total HT: {formatPrice(subtotal)}</p>
              <p className="text-noir/50">TVA 20%: {formatPrice(tax)}</p>
              <p className="text-lg font-bold text-noir">Total TTC: {formatPrice(total)}</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
