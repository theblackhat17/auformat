'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Realisation } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';

interface Props {
  realisations: Realisation[];
  categoryLabels: Record<string, string>;
}

export function RealisationsClient({ realisations, categoryLabels }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<Realisation | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const galleryImages = selectedItem?.gallery ?? [];
  const lightboxOpen = lightboxIndex !== null && galleryImages.length > 0;

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage = useCallback(() => {
    setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : galleryImages.length - 1));
  }, [galleryImages.length]);
  const nextImage = useCallback(() => {
    setLightboxIndex((i) => (i !== null && i < galleryImages.length - 1 ? i + 1 : 0));
  }, [galleryImages.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') prevImage();
      else if (e.key === 'ArrowRight') nextImage();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, closeLightbox, prevImage, nextImage]);

  const categories = useMemo(() => {
    const cats = new Set(realisations.map((r) => r.category));
    return Array.from(cats);
  }, [realisations]);

  const filtered = activeCategory === 'all' ? realisations : realisations.filter((r) => r.category === activeCategory);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 mb-12" role="group" aria-label="Filtrer les réalisations par catégorie">
        <button
          onClick={() => setActiveCategory('all')}
          aria-pressed={activeCategory === 'all'}
          className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors duration-200 ${activeCategory === 'all' ? 'bg-noir text-white border-noir' : 'bg-transparent text-noir border-noir/20 hover:border-noir'}`}
        >
          Tous
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors duration-200 ${activeCategory === cat ? 'bg-noir text-white border-noir' : 'bg-transparent text-noir border-noir/20 hover:border-noir'}`}
          >
            {categoryLabels[cat] || cat}
          </button>
        ))}
      </div>

      {/* Galerie — rythme éditorial : 2 grandes, puis 3, en cycle */}
      <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-5">
        {filtered.map((r, i) => {
          const wide = i % 5 === 0 || i % 5 === 1;
          return (
            <button
              key={`${activeCategory}-${r.id}`}
              onClick={() => setSelectedItem(r)}
              style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
              className={`group relative text-left rounded-xl overflow-hidden animate-fade-in-up opacity-0 ${wide ? 'lg:col-span-3 aspect-[16/10]' : 'lg:col-span-2 aspect-[4/3]'}`}
              aria-label={`Voir le projet : ${r.title}`}
            >
              {r.image ? (
                <Image
                  src={r.image}
                  alt={r.title}
                  fill
                  sizes={wide ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 33vw'}
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              ) : (
                <span className="absolute inset-0 bg-beige" aria-hidden="true" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-noir/80 via-noir/15 to-transparent transition-opacity duration-300" aria-hidden="true" />
              <span className="absolute bottom-0 left-0 right-0 p-6 block">
                <span className="block text-bois-clair text-sm font-semibold mb-1.5">{categoryLabels[r.category] || r.category}</span>
                <span className="block font-display text-xl lg:text-[1.375rem] text-white leading-snug">{r.title}</span>
                {(r.duration || r.surface) && (
                  <span className="block mt-2 text-xs text-white/70">
                    {[r.duration && `Durée : ${r.duration}`, r.surface && `Surface : ${r.surface}`].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="font-display text-xl text-noir/60">Aucune réalisation dans cette catégorie pour le moment.</p>
          <button onClick={() => setActiveCategory('all')} className="link-arrow mt-4">
            Voir tous les projets
          </button>
        </div>
      )}

      {/* Detail modal */}
      <Modal isOpen={!!selectedItem} onClose={() => { setSelectedItem(null); setLightboxIndex(null); }} title={selectedItem?.title} size="lg">
        {selectedItem && (
          <div className="space-y-4">
            {selectedItem.image && (
              <div className="aspect-video bg-beige rounded-lg overflow-hidden relative">
                <Image src={selectedItem.image} alt={selectedItem.title} fill sizes="(max-width: 768px) 100vw, 800px" className="object-cover" />
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <span className="text-xs font-medium bg-beige text-noir/70 px-3 py-1 rounded-full">{categoryLabels[selectedItem.category] || selectedItem.category}</span>
              {selectedItem.duration && <span className="text-xs font-medium bg-gray-100 text-noir/60 px-3 py-1 rounded-full">Duree: {selectedItem.duration}</span>}
              {selectedItem.surface && <span className="text-xs font-medium bg-gray-100 text-noir/60 px-3 py-1 rounded-full">Surface: {selectedItem.surface}</span>}
              {(selectedItem.materialName || selectedItem.material) && <span className="text-xs font-medium bg-gray-100 text-noir/60 px-3 py-1 rounded-full">Materiau: {selectedItem.materialName || selectedItem.material}</span>}
              {selectedItem.location && <span className="text-xs font-medium bg-gray-100 text-noir/60 px-3 py-1 rounded-full">Lieu: {selectedItem.location}</span>}
            </div>
            <p className="text-sm text-noir/70 leading-relaxed">{selectedItem.description}</p>
            <Link href={`/realisations/${selectedItem.slug}`} className="link-arrow text-sm">
              Voir la page complète du projet
            </Link>
            {selectedItem.body && <p className="text-sm text-noir/60 leading-relaxed">{selectedItem.body}</p>}
            {selectedItem.features && selectedItem.features.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-noir mb-2">Caracteristiques</h4>
                <ul className="grid grid-cols-2 gap-1">
                  {selectedItem.features.map((f, i) => (
                    <li key={i} className="text-sm text-noir/60 flex items-center gap-2">
                      <span className="text-vert-foret">&#10003;</span> {f.feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedItem.gallery && selectedItem.gallery.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-noir mb-2">Galerie</h4>
                <div className="grid grid-cols-3 gap-2">
                  {selectedItem.gallery.map((g, i) => (
                    <div
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      className="aspect-square relative rounded-lg overflow-hidden cursor-pointer group/thumb"
                    >
                      <Image src={g.image} alt={`${selectedItem.title} ${i + 1}`} fill sizes="250px" className="object-cover transition-transform duration-300 group-hover/thumb:scale-110" />
                      <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors flex items-center justify-center">
                        <svg className="w-6 h-6 text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={closeLightbox}>
          <div className="absolute inset-0 bg-black/90" />

          {/* Close button */}
          <button
            onClick={closeLightbox}
            aria-label="Fermer la galerie"
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-10 text-white/70 text-sm font-medium">
            {lightboxIndex! + 1} / {galleryImages.length}
          </div>

          {/* Previous button */}
          {galleryImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              aria-label="Image précédente"
              className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div
            className="relative w-[90vw] h-[85vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={galleryImages[lightboxIndex!].image}
              alt={`${selectedItem?.title} ${lightboxIndex! + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
              priority
            />
          </div>

          {/* Next button */}
          {galleryImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              aria-label="Image suivante"
              className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  );
}
