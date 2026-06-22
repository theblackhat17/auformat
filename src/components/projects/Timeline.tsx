'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ProjectUpdate } from '@/lib/types';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/constants';

/** « il y a 3 jours », « à l'instant »… */
function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

/** Timeline de fabrication : rail vertical, cartes par étape, photos d'atelier. */
export function Timeline({ updates, emptyLabel }: { updates: ProjectUpdate[]; emptyLabel?: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (updates.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-beige/40 rounded-2xl">
        <span className="text-3xl">🪚</span>
        <p className="text-sm text-noir/55 mt-2 leading-relaxed max-w-xs mx-auto">
          {emptyLabel || 'Aucune étape publiée pour l\'instant — les nouvelles de l\'atelier (photos, avancement) apparaîtront ici.'}
        </p>
      </div>
    );
  }

  const sorted = [...updates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="relative pl-7">
      {/* Rail */}
      <span className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-vert-foret/50 via-vert-foret/25 to-vert-foret/5" aria-hidden="true" />

      <div className="space-y-4">
        {sorted.map((u, i) => (
          <div key={u.id} className="relative">
            {/* Nœud */}
            <span
              className={`absolute -left-[27px] top-2 w-4 h-4 rounded-full ring-4 ring-white shadow-sm ${i === 0 ? 'bg-vert-foret' : 'bg-vert-foret/40'}`}
              aria-hidden="true"
            />
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 flex-wrap">
                {u.status && (
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${PROJECT_STATUS_COLORS[u.status] || 'bg-gray-100 text-gray-700'}`}>
                    {PROJECT_STATUS_LABELS[u.status] || u.status}
                  </span>
                )}
                <span className="text-xs text-noir/45" title={fullDate(u.createdAt)}>{relative(u.createdAt)}</span>
              </div>
              {u.note && <p className="text-sm text-noir/75 mt-2 whitespace-pre-wrap leading-relaxed">{u.note}</p>}
              {u.photos?.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {u.photos.map((p) => (
                    <button
                      key={p}
                      onClick={() => setLightbox(p)}
                      className="relative aspect-square rounded-lg overflow-hidden ring-1 ring-noir/10 hover:ring-2 hover:ring-vert-foret transition-all group"
                      aria-label="Agrandir la photo"
                    >
                      <Image src={p} alt="Photo d'atelier" fill sizes="120px" className="object-cover group-hover:scale-105 transition-transform" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[130] bg-noir/85 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative w-full max-w-3xl h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <Image src={lightbox} alt="Photo d'atelier" fill sizes="100vw" className="object-contain" />
          </div>
          <button onClick={() => setLightbox(null)} aria-label="Fermer" className="absolute top-4 right-4 text-white text-3xl leading-none">×</button>
        </div>
      )}
    </div>
  );
}
