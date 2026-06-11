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

  const chipClass = (active: boolean) =>
    `px-5 py-2 rounded-full text-sm font-medium border transition-colors duration-200 ${
      active ? 'bg-noir text-white border-noir' : 'bg-transparent text-noir border-noir/20 hover:border-noir'
    }`;

  return (
    <>
      {/* Synthèse — une seule ligne de chiffres, au filet */}
      <div className="flex flex-wrap items-center gap-x-12 gap-y-6 pb-10 mb-10 border-b border-noir/10">
        <div className="flex items-center gap-4">
          <p className="font-display text-5xl text-vert-foret" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {stats.avg.toLocaleString('fr-FR')}
          </p>
          <div>
            <p className="text-bois-fonce tracking-[0.15em]" aria-label={`Note moyenne : ${stats.avg} sur 5`}>{ratingStars(stats.avg)}</p>
            <p className="text-sm text-noir/60 mt-1">Note moyenne sur 5</p>
          </div>
        </div>
        <div>
          <p className="font-display text-3xl text-noir" style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.total}</p>
          <p className="text-sm text-noir/60 mt-0.5">Avis clients</p>
        </div>
        <div>
          <p className="font-display text-3xl text-noir" style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.verified}</p>
          <p className="text-sm text-noir/60 mt-0.5">Avis vérifiés</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 mb-10" role="group" aria-label="Filtrer les avis par type de projet">
        <button onClick={() => setFilter('all')} aria-pressed={filter === 'all'} className={chipClass(filter === 'all')}>
          Tous
        </button>
        {projectTypes.map((type) => (
          <button key={type} onClick={() => setFilter(type)} aria-pressed={filter === type} className={chipClass(filter === type)}>
            {type}
          </button>
        ))}
      </div>

      {/* Avis — colonnes libres, chaque parole garde sa longueur naturelle */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
        {filtered.map((a, i) => (
          <article
            key={`${filter}-${i}`}
            style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
            className="break-inside-avoid mb-6 bg-beige/60 rounded-xl p-7 animate-fade-in-up opacity-0"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-bois-fonce tracking-[0.15em]" aria-label={`Note : ${a.rating} sur 5`}>{ratingStars(a.rating)}</span>
              {a.verified && <span className="text-xs text-vert-foret font-semibold bg-vert-foret/10 px-2.5 py-1 rounded-full">Vérifié</span>}
            </div>
            <blockquote className="text-[0.9375rem] text-noir/85 leading-relaxed">
              «&nbsp;{a.testimonial}&nbsp;»
            </blockquote>
            <footer className="flex items-center gap-3 mt-5 pt-4 border-t border-noir/8">
              <span className="w-9 h-9 rounded-full bg-white text-bois-fonce flex items-center justify-center text-xs font-bold" aria-hidden="true">
                {a.name.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-semibold text-noir">{a.name}</p>
                <p className="text-xs text-noir/55">{a.location} &middot; {a.projectType}</p>
              </div>
              <time className="ml-auto text-xs text-noir/55" dateTime={a.date}>{formatDate(a.date)}</time>
            </footer>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="font-display text-xl text-noir/60">Aucun avis pour ce type de projet pour le moment.</p>
          <button onClick={() => setFilter('all')} className="link-arrow mt-4">Voir tous les avis</button>
        </div>
      )}
    </>
  );
}
