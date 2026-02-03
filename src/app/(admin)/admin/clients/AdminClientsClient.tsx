'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { ClientWithStats } from '@/lib/types';
import { formatPrice, timeAgo, getInitials } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';

export function AdminClientsClient() {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/clients').then((r) => r.json()).then(setClients).finally(() => setLoading(false));
  }, []);

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
          <h1 className="text-2xl font-bold text-noir">Clients</h1>
          <p className="text-sm text-noir/50 mt-1">{clients.length} clients &middot; {formatPrice(totalRevenue)} CA total</p>
        </div>
      </div>

      <div className="max-w-sm">
        <SearchInput placeholder="Rechercher un client..." onSearch={setSearch} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-noir/40 uppercase tracking-wider">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Contact</th>
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
                    <div className="w-8 h-8 rounded-full bg-vert-foret/10 text-vert-foret flex items-center justify-center text-xs font-bold flex-shrink-0">
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
                  <Link href={`/admin/clients/${client.id}`} className="text-xs font-medium text-vert-foret hover:underline">
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-noir/40">Aucun client trouve</div>
        )}
      </div>
    </div>
  );
}
