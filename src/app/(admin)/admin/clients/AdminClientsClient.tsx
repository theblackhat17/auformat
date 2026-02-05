'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { ClientWithStats } from '@/lib/types';
import { formatPrice, timeAgo, getInitials } from '@/lib/utils';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';

type ClientWithRole = ClientWithStats & { role: 'client' | 'admin' };

export function AdminClientsClient() {
  const [clients, setClients] = useState<ClientWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) =>
      (c.fullName || '').toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.companyName || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const totalRevenue = clients.reduce((s, c) => s + (c.totalRevenue || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-noir">Utilisateurs</h1>
          <p className="text-sm text-noir/50 mt-1">{clients.length} utilisateurs &middot; {formatPrice(totalRevenue)} CA total</p>
        </div>
      </div>

      <div className="max-w-sm">
        <SearchInput placeholder="Rechercher un utilisateur..." onSearch={setSearch} />
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
              <th className="px-4 py-3">Derniere connexion</th>
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
                  {client.lastLogin ? timeAgo(client.lastLogin) : 'Jamais'}
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
    </div>
  );
}
