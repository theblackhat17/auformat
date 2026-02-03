'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ActivityLog } from '@/lib/types';
import { ACTION_TYPE_LABELS, ACTION_TYPE_ICONS, TARGET_TYPE_LABELS } from '@/lib/constants';
import { formatDateTime, getInitials } from '@/lib/utils';
import { Card, CardTitle } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const LOGS_PER_PAGE = 50;

export function AdminLogsClient() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<{ logsToday: number; activeUsers: number; successRate: number; errorCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      fetch('/api/activity-logs').then((r) => r.json()),
      fetch('/api/activity-logs/stats').then((r) => r.json()),
    ]).then(([l, s]) => { setLogs(l); setStats(s); }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = logs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        (l.actionType || '').toLowerCase().includes(q) ||
        (l.fullName || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        ((l.details as Record<string, string>)?.description || '').toLowerCase().includes(q)
      );
    }
    if (actionFilter !== 'all') {
      result = result.filter((l) => l.actionType.startsWith(actionFilter) || l.actionType === actionFilter);
    }
    return result;
  }, [logs, search, actionFilter]);

  const totalPages = Math.ceil(filtered.length / LOGS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * LOGS_PER_PAGE, page * LOGS_PER_PAGE);

  async function handleExport() {
    const res = await fetch('/api/activity-logs/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-noir">Logs d&apos;activite</h1>
        <Button variant="outline" onClick={handleExport}>Exporter CSV</Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="sm"><p className="text-xs text-noir/40">Actions aujourd&apos;hui</p><p className="text-2xl font-bold text-noir">{stats.logsToday}</p></Card>
          <Card padding="sm"><p className="text-xs text-noir/40">Utilisateurs actifs</p><p className="text-2xl font-bold text-noir">{stats.activeUsers}</p></Card>
          <Card padding="sm"><p className="text-xs text-noir/40">Taux de succes</p><p className="text-2xl font-bold text-green-600">{stats.successRate}%</p></Card>
          <Card padding="sm"><p className="text-xs text-noir/40">Erreurs</p><p className="text-2xl font-bold text-red-600">{stats.errorCount}</p></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-64"><SearchInput placeholder="Rechercher..." onSearch={(q) => { setSearch(q); setPage(1); }} /></div>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-vert-foret">
          <option value="all">Toutes les actions</option>
          <option value="login">Connexion</option>
          <option value="logout">Deconnexion</option>
          <option value="create">Creations</option>
          <option value="update">Modifications</option>
          <option value="delete">Suppressions</option>
          <option value="error">Erreurs</option>
        </select>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left text-xs text-noir/40 uppercase tracking-wider">
            <th className="px-4 py-3">Date</th><th className="px-4 py-3">Utilisateur</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Details</th><th className="px-4 py-3">IP</th><th className="px-4 py-3">Statut</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-xs text-noir/50 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 text-noir/40 flex items-center justify-center text-[10px] font-bold">{getInitials(log.fullName)}</div>
                    <span className="text-noir/70 truncate max-w-[120px]">{log.fullName || log.email || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-sm">{ACTION_TYPE_ICONS[log.actionType] || '📌'}</span>
                    <span className="text-noir/70">{ACTION_TYPE_LABELS[log.actionType] || log.actionType}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-noir/50 truncate max-w-[200px]">{(log.details as Record<string, string>)?.description || '—'}</td>
                <td className="px-4 py-3 text-xs text-noir/30 font-mono">{log.ipAddress || '—'}</td>
                <td className="px-4 py-3">{log.success ? <Badge variant="success">OK</Badge> : <Badge variant="danger">Erreur</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {paginated.length === 0 && <div className="text-center py-10 text-sm text-noir/40">Aucun log</div>}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={LOGS_PER_PAGE} onPageChange={setPage} />
    </div>
  );
}
