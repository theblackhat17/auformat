'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ClientWithStats, Project, Quote, UserSession } from '@/lib/types';
import { formatDate, formatPrice, timeAgo, getInitials, getDisplayName } from '@/lib/utils';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/lib/constants';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export function ClientDetailClient({ clientId }: { clientId: string }) {
  const [data, setData] = useState<{ client: ClientWithStats; projects: Project[]; quotes: Quote[]; sessions: UserSession[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', companyName: '', phone: '', address: '', discountRate: 0 });

  useEffect(() => {
    fetch(`/api/admin/clients/${clientId}`).then((r) => r.json()).then((d) => {
      setData(d);
      if (d.client) {
        setEditForm({
          fullName: d.client.fullName || '',
          companyName: d.client.companyName || '',
          phone: d.client.phone || '',
          address: d.client.address || '',
          discountRate: d.client.discountRate || 0,
        });
      }
    }).finally(() => setLoading(false));
  }, [clientId]);

  async function handleSaveEdit() {
    const res = await fetch(`/api/profiles/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditModal(false);
      // Reload
      const d = await fetch(`/api/admin/clients/${clientId}`).then((r) => r.json());
      setData(d);
    }
  }

  if (loading || !data) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  const { client, projects, quotes, sessions } = data;
  const tabs = ['overview', 'projects', 'quotes', 'history'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-vert-foret text-white flex items-center justify-center text-xl font-bold">
            {getInitials(client.fullName)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-noir">{client.fullName || client.email}</h1>
            {client.companyName && <p className="text-sm text-noir/50">{client.companyName}</p>}
            <p className="text-xs text-noir/30 mt-1">Client depuis {formatDate(client.createdAt)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditModal(true)}>Modifier</Button>
          <Link href={`/admin/devis?client=${clientId}`}><Button size="sm">Nouveau devis</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm"><p className="text-xs text-noir/40">Projets</p><p className="text-2xl font-bold text-noir">{client.totalProjects}</p></Card>
        <Card padding="sm"><p className="text-xs text-noir/40">Devis</p><p className="text-2xl font-bold text-noir">{client.totalQuotes}</p></Card>
        <Card padding="sm"><p className="text-xs text-noir/40">CA Total</p><p className="text-2xl font-bold text-vert-foret">{formatPrice(client.totalRevenue)}</p></Card>
        <Card padding="sm"><p className="text-xs text-noir/40">Connexions</p><p className="text-2xl font-bold text-noir">{client.totalLogins}</p></Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-0">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-vert-foret text-vert-foret' : 'border-transparent text-noir/40 hover:text-noir/70'}`}>
            {tab === 'overview' ? 'Apercu' : tab === 'projects' ? 'Projets' : tab === 'quotes' ? 'Devis' : 'Historique'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <Card>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-noir/40 text-xs block">Email</span>{client.email}</div>
            <div><span className="text-noir/40 text-xs block">Telephone</span>{client.phone || '—'}</div>
            <div><span className="text-noir/40 text-xs block">Adresse</span>{client.address || '—'}</div>
            <div><span className="text-noir/40 text-xs block">Remise</span>{client.discountRate > 0 ? `${client.discountRate}%` : 'Aucune'}</div>
            <div><span className="text-noir/40 text-xs block">Derniere connexion</span>{client.lastLogin ? timeAgo(client.lastLogin) : 'Jamais'}</div>
          </div>
        </Card>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-3">
          {projects.length === 0 ? <p className="text-sm text-noir/40 py-8 text-center">Aucun projet</p> : projects.map((p) => (
            <Card key={p.id} padding="sm" className="flex items-center justify-between">
              <div>
                <p className="font-medium text-noir">{p.name}</p>
                <p className="text-xs text-noir/40">{formatDate(p.createdAt)}</p>
              </div>
              <Badge variant={PROJECT_STATUS_COLORS[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="space-y-3">
          {quotes.length === 0 ? <p className="text-sm text-noir/40 py-8 text-center">Aucun devis</p> : quotes.map((q) => (
            <Card key={q.id} padding="sm" className="flex items-center justify-between">
              <div>
                <p className="font-medium text-noir">{q.title} <span className="text-xs text-noir/30 font-mono">{q.quoteNumber}</span></p>
                <p className="text-xs text-noir/40">{formatDate(q.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-noir">{formatPrice(q.totalTtc)}</span>
                <Badge variant={QUOTE_STATUS_COLORS[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-2">
          {sessions.length === 0 ? <p className="text-sm text-noir/40 py-8 text-center">Aucune session</p> : sessions.map((s) => (
            <Card key={s.id} padding="sm" className="flex items-center justify-between text-sm">
              <div>
                <p className="text-noir/70">{formatDate(s.loggedInAt)}</p>
                <p className="text-xs text-noir/30">{s.ipAddress} &middot; {(s.userAgent || '').slice(0, 50)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Modifier le client" footer={
        <>
          <Button variant="ghost" onClick={() => setEditModal(false)}>Annuler</Button>
          <Button onClick={handleSaveEdit}>Enregistrer</Button>
        </>
      }>
        <div className="space-y-4">
          <Input label="Nom complet" value={editForm.fullName} onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))} />
          <Input label="Societe" value={editForm.companyName} onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))} />
          <Input label="Telephone" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
          <Input label="Adresse" value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
          <Input label="Remise (%)" type="number" min={0} max={100} value={String(editForm.discountRate)} onChange={(e) => setEditForm((p) => ({ ...p, discountRate: Number(e.target.value) }))} />
        </div>
      </Modal>
    </div>
  );
}
