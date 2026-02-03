'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatPrice, timeAgo } from '@/lib/utils';
import { ACTION_TYPE_ICONS } from '@/lib/constants';
import type { DashboardStats, ActivityLog } from '@/lib/types';

export function AdminDashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    fetch('/api/admin/dashboard').then((r) => r.json()).then(setStats);
    fetch('/api/activity-logs').then((r) => r.json()).then((logs) => setActivity(logs.slice(0, 8)));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-noir">Tableau de bord</h1>
        <p className="text-sm text-noir/50 mt-1">Vue d&apos;ensemble de votre activite</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Clients', value: stats?.totalClients ?? '—', color: 'border-t-blue-500' },
          { label: 'Devis en attente', value: stats?.pendingQuotes ?? '—', color: 'border-t-amber-500' },
          { label: 'CA mensuel', value: stats ? formatPrice(stats.monthlyRevenue) : '—', color: 'border-t-green-500' },
          { label: 'Projets actifs', value: stats?.activeProjects ?? '—', color: 'border-t-purple-500' },
          { label: 'Commandes', value: stats?.totalOrders ?? '—', color: 'border-t-bois-clair' },
        ].map((card) => (
          <Card key={card.label} className={`border-t-4 ${card.color}`} padding="sm">
            <p className="text-xs text-noir/40 uppercase tracking-wider">{card.label}</p>
            <p className="text-2xl font-bold text-noir mt-1">{card.value}</p>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardTitle className="mb-4">Activite recente</CardTitle>
        {activity.length === 0 ? (
          <p className="text-sm text-noir/40 py-4">Aucune activite recente</p>
        ) : (
          <div className="space-y-3">
            {activity.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                <span className="text-lg flex-shrink-0">{ACTION_TYPE_ICONS[log.actionType] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-noir/70">
                    <span className="font-medium text-noir">{log.fullName || log.email || 'Systeme'}</span>
                    {' — '}
                    {(log.details as Record<string, string>)?.description || log.actionType}
                  </p>
                  <p className="text-xs text-noir/30 mt-0.5">{timeAgo(log.createdAt)}</p>
                </div>
                {!log.success && <span className="text-xs text-red-500 font-medium">Erreur</span>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
