'use client';

import { useState, useMemo } from 'react';
import type { Avis } from '@/lib/types';
import { ratingStars, formatDate } from '@/lib/utils';

export function AvisClient({ avis }: { avis: Avis[] }) {
  const [filter, setFilter] = useState<string>('all');

  const stats = useMemo(() => {
    const total = avis.length;
    const avg = total > 0 ? avis.reduce((s, a) => s + a.rating, 0) / total : 0;
    const verified = avis.filter((a) => a.verified).length;
    return { total, avg: Math.round(avg * 10) / 10, verified };
  }, [avis]);

  const projectTypes = useMemo(() => Array.from(new Set(avis.map((a) => a.projectType))), [avis]);
  const filtered = filter === 'all' ? avis : avis.filter((a) => a.projectType === filter);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-beige/50 rounded-xl p-6 text-center">
          <p className="text-3xl font-bold text-vert-foret">{stats.avg}</p>
          <p className="text-sm text-noir/50 mt-1">Note moyenne</p>
          <p className="text-bois-clair text-sm mt-1">{ratingStars(stats.avg)}</p>
        </div>
        <div className="bg-beige/50 rounded-xl p-6 text-center">
          <p className="text-3xl font-bold text-vert-foret">{stats.total}</p>
          <p className="text-sm text-noir/50 mt-1">Avis clients</p>
        </div>
        <div className="bg-beige/50 rounded-xl p-6 text-center">
          <p className="text-3xl font-bold text-vert-foret">{stats.verified}</p>
          <p className="text-sm text-noir/50 mt-1">Avis vérifiés</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-vert-foret text-white' : 'bg-beige text-bois-fonce hover:bg-beige/80'}`}>
          Tous
        </button>
        {projectTypes.map((type) => (
          <button key={type} onClick={() => setFilter(type)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === type ? 'bg-vert-foret text-white' : 'bg-beige text-bois-fonce hover:bg-beige/80'}`}>
            {type}
          </button>
        ))}
      </div>

      {/* Reviews grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((a, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-bois-clair">{ratingStars(a.rating)}</span>
              {a.verified && <span className="text-xs text-vert-foret font-medium bg-vert-foret/10 px-2 py-0.5 rounded-full">Vérifié</span>}
            </div>
            <p className="text-sm text-noir/70 leading-relaxed mb-4 italic">&ldquo;{a.testimonial}&rdquo;</p>
            <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
              <div className="w-9 h-9 rounded-full bg-beige text-bois-fonce flex items-center justify-center text-xs font-bold">
                {a.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-noir">{a.name}</p>
                <p className="text-xs text-noir/40">{a.location} &middot; {a.projectType}</p>
              </div>
            </div>
            <p className="text-xs text-noir/30 mt-3">{formatDate(a.date)}</p>
          </div>
        ))}
      </div>
    </>
  );
}
