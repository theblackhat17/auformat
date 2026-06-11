export const revalidate = 60;

import type { Metadata } from 'next';
import Image from 'next/image';
import { getMateriauxGrouped, getCategories, getPageContent } from '@/lib/content';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/motion/Reveal';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/materiaux', {
    title: 'Nos matériaux — Essences de bois et panneaux',
    description: 'Découvrez notre sélection d\'essences de bois nobles, locaux et exotiques : chêne, noyer, hêtre, frêne. Matériaux de qualité pour vos meubles sur mesure.',
    keywords: ['essences de bois', 'bois massif meuble', 'chêne massif', 'noyer', 'hêtre', 'matériaux menuiserie'],
  });
}

function HardnessBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`${label} : ${value} sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`w-4 h-1.5 rounded-full ${i < value ? 'bg-bois-fonce' : 'bg-noir/10'}`} />
      ))}
    </div>
  );
}

export default async function MateriauxPage() {
  const [grouped, categories, sections] = await Promise.all([
    getMateriauxGrouped(),
    getCategories('material'),
    getPageContent('materiaux'),
  ]);

  const hero = (sections.find((s) => s.sectionKey === 'hero')?.content || {}) as Record<string, string>;

  const categoryTitles: Record<string, string> = {};
  for (const cat of categories) {
    categoryTitles[cat.slug] = cat.label;
  }

  const groupedCategories = Object.keys(grouped);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Accueil', url: SITE_URL }, { name: 'Matériaux', url: `${SITE_URL}/materiaux` }])} />

      <PageHero
        kicker={hero.subtitle_top || 'Nos essences'}
        title={hero.title || 'Matériaux'}
        intro={hero.description || 'Des essences nobles et durables, sélectionnées pour leur qualité et leur beauté.'}
      />

      {/* Category nav */}
      {groupedCategories.length > 1 && (
        <nav className="sticky top-18 lg:top-22 bg-white/95 backdrop-blur-sm border-b border-noir/8 z-30" aria-label="Catégories de matériaux">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex gap-7 overflow-x-auto py-3.5">
            {groupedCategories.map((cat) => (
              <a key={cat} href={`#${cat}`} className="text-sm font-semibold text-noir/65 hover:text-vert-foret whitespace-nowrap transition-colors">
                {categoryTitles[cat] || cat}
              </a>
            ))}
          </div>
        </nav>
      )}

      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-20 lg:space-y-24">
          {groupedCategories.map((cat) => (
            <div key={cat} id={cat} className="scroll-mt-36">
              <Reveal>
                <h2 className="font-display text-[clamp(1.625rem,2vw+0.5rem,2.25rem)] leading-[1.15] text-noir mb-10">
                  {categoryTitles[cat] || cat}
                </h2>
              </Reveal>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {grouped[cat].map((m, i) => (
                  <Reveal key={m.id} delay={Math.min((i % 3) * 80, 240)}>
                    <article className="bg-white rounded-xl overflow-hidden ring-1 ring-noir/8 card-lift h-full">
                      <div className="aspect-[3/2] bg-beige overflow-hidden relative">
                        {m.image && <Image src={m.image} alt={`Échantillon de ${m.name}`} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />}
                        {m.tag && <span className="absolute top-3 left-3 text-xs font-semibold bg-white/95 text-bois-fonce px-3 py-1 rounded-full">{m.tag}</span>}
                      </div>
                      <div className="p-6">
                        <h3 className="font-display text-xl text-noir">{m.name}</h3>
                        {m.latinName && <p className="text-sm text-noir/55 italic mt-0.5">{m.latinName}</p>}
                        <p className="text-[0.9375rem] text-noir/70 leading-relaxed mt-3 mb-5 line-clamp-2">{m.description}</p>
                        <dl className="space-y-2.5 text-sm text-noir/70">
                          <div className="flex justify-between items-center">
                            <dt>Dureté</dt>
                            <dd><HardnessBar value={m.hardness} label="Dureté" /></dd>
                          </div>
                          <div className="flex justify-between items-center">
                            <dt>Stabilité</dt>
                            <dd><HardnessBar value={m.stability} label="Stabilité" /></dd>
                          </div>
                          {m.origin && <div className="flex justify-between"><dt>Origine</dt><dd className="font-semibold text-noir/80">{m.origin}</dd></div>}
                          {m.color && <div className="flex justify-between"><dt>Couleur</dt><dd className="font-semibold text-noir/80">{m.color}</dd></div>}
                        </dl>
                        {m.usages && m.usages.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-noir/8">
                            {m.usages.map((u, j) => (
                              <span key={j} className="text-xs font-medium bg-beige text-bois-fonce px-2.5 py-1 rounded-full">{u.usage}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
