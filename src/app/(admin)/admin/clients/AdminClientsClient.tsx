'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { ClientWithStats } from '@/lib/types';
import { formatPrice, timeAgo, getInitials } from '@/lib/utils';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

type ClientWithRole = ClientWithStats & { role: 'client' | 'admin' };

const EMPTY_CREATE = { email: '', fullName: '', companyName: '', phone: '', address: '', sendInvite: true };

export function AdminClientsClient() {
  const [clients, setClients] = useState<ClientWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'alpha' | 'alpha-desc'>('recent');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  async function handleCreate() {
    const email = createForm.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Adresse e-mail invalide');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la création');
        return;
      }
      toast.success(
        data.emailed
          ? `Client créé — e-mail d'accès envoyé à ${email}`
          : data.created ? 'Client créé' : 'Client déjà existant, infos mises à jour'
      );
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      fetchClients();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setCreating(false);
    }
  }

  const fetchClients = useCallback(() => {
    fetch('/api/admin/clients').then((r) => r.json()).then(setClients).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const toggleRole = async (client: ClientWithRole) => {
    const newRole = client.role === 'admin' ? 'client' : 'admin';
    const label = newRole === 'admin' ? 'promouvoir admin' : 'retirer les droits admin de';
    if (!confirm(`Voulez-vous ${label} ${client.fullName || client.email} ?`)) return;

    setTogglingId(client.id);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erreur');
        return;
      }
      setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, role: newRole } : c));
    } catch {
      alert('Erreur reseau');
    } finally {
      setTogglingId(null);
    }
  };

  const deleteClient = async (client: ClientWithRole) => {
    if (!confirm(`Supprimer definitivement ${client.fullName || client.email} et toutes ses donnees (projets, devis, sessions) ?`)) return;
    if (!confirm('Cette action est irreversible. Confirmer la suppression ?')) return;

    setDeletingId(client.id);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erreur');
        return;
      }
      setClients((prev) => prev.filter((c) => c.id !== client.id));
    } catch {
      alert('Erreur reseau');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    let list = clients;
    if (search) {
      const q = search.toLowerCase();
      list = clients.filter((c) =>
        (c.fullName || '').toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.companyName || '').toLowerCase().includes(q)
      );
    }
    if (sort === 'recent') return list; // ordre de l'API : admins d'abord, puis plus récents
    const name = (c: ClientWithRole) => (c.fullName || c.email).trim();
    const sorted = [...list].sort((a, b) => name(a).localeCompare(name(b), 'fr', { sensitivity: 'base' }));
    return sort === 'alpha' ? sorted : sorted.reverse();
  }, [clients, search, sort]);

  const totalRevenue = clients.reduce((s, c) => s + (c.totalRevenue || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-noir">Utilisateurs</h1>
          <p className="text-sm text-noir/50 mt-1">{clients.length} utilisateurs &middot; {formatPrice(totalRevenue)} CA total</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Nouveau client</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <SearchInput placeholder="Rechercher un utilisateur..." onSearch={setSearch} />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="px-3 py-2 bg-white border border-noir/20 rounded-lg text-sm focus:outline-none focus:border-vert-foret"
          aria-label="Trier les utilisateurs"
        >
          <option value="recent">Tri : plus récents</option>
          <option value="alpha">Tri : nom A → Z</option>
          <option value="alpha-desc">Tri : nom Z → A</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-noir/40 uppercase tracking-wider">
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-center">Role</th>
              <th className="px-4 py-3 text-center">Projets</th>
              <th className="px-4 py-3 text-center">Devis</th>
              <th className="px-4 py-3 text-right">CA</th>
              <th className="px-4 py-3">Dernière visite</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      client.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-vert-foret/10 text-vert-foret'
                    }`}>
                      {getInitials(client.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-noir truncate">{client.fullName || '—'}</p>
                      {client.companyName && <p className="text-xs text-noir/40 truncate">{client.companyName}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-noir/70 truncate">{client.email}</p>
                  {client.phone && <p className="text-xs text-noir/40">{client.phone}</p>}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleRole(client)}
                    disabled={togglingId === client.id}
                    className="inline-flex items-center gap-1 disabled:opacity-50"
                    title={client.role === 'admin' ? 'Retirer admin' : 'Promouvoir admin'}
                  >
                    <Badge variant={client.role === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}>
                      {client.role === 'admin' ? 'Admin' : 'Client'}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="bg-blue-50 text-blue-700">{client.totalProjects}</Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="bg-amber-50 text-amber-700">{client.totalQuotes}</Badge>
                </td>
                <td className="px-4 py-3 text-right font-medium text-noir">
                  {client.totalRevenue > 0 ? formatPrice(client.totalRevenue) : '—'}
                </td>
                <td className="px-4 py-3 text-noir/40 text-xs">
                  {client.lastSeen ? timeAgo(client.lastSeen) : 'Jamais'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/clients/${client.id}`} className="text-xs font-medium text-vert-foret hover:underline">
                      Detail
                    </Link>
                    <button
                      onClick={() => deleteClient(client)}
                      disabled={deletingId === client.id}
                      className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                    >
                      {deletingId === client.id ? '...' : 'Supprimer'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-noir/40">Aucun utilisateur trouve</div>
        )}
      </div>

      {/* Création d'un client (sans projet) */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouveau client"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} isLoading={creating}>Créer le client</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Adresse e-mail *" type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} placeholder="client@exemple.fr" />
          <Input label="Nom complet" value={createForm.fullName} onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))} />
          <Input label="Société" value={createForm.companyName} onChange={(e) => setCreateForm((p) => ({ ...p, companyName: e.target.value }))} />
          <Input label="Téléphone" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} />
          <Input label="Adresse" value={createForm.address} onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))} />
          <label className="flex items-center gap-2.5 text-sm text-noir/80 cursor-pointer">
            <input
              type="checkbox"
              checked={createForm.sendInvite}
              onChange={(e) => setCreateForm((p) => ({ ...p, sendInvite: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-vert-foret focus:ring-vert-foret"
            />
            Envoyer l&apos;e-mail d&apos;accès (le client définit son mot de passe)
          </label>
        </div>
      </Modal>
    </div>
  );
}
