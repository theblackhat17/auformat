export const revalidate = 60;

import type { Metadata } from 'next';
import { getRealisations, getCategories, getPageContent } from '@/lib/content';
import { RealisationsClient } from './RealisationsClient';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { PageHero } from '@/components/layout/PageHero';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/realisations', {
    title: 'Nos réalisations — Portfolio menuiserie sur mesure',
    description: 'Parcourez nos réalisations de menuiserie sur mesure : cuisines, dressings, bibliothèques, meubles TV, agencements commerciaux. Projets réalisés à Lille, Cysoing, Le Touquet.',
    keywords: ['réalisations menuiserie', 'portfolio meuble sur mesure', 'cuisine sur mesure Lille', 'dressing sur mesure Nord'],
  });
}

export default async function RealisationsPage() {
  const [realisations, categories, sections] = await Promise.all([
    getRealisations(),
    getCategories('realisation'),
    getPageContent('realisations'),
  ]);

  const hero = (sections.find((s) => s.sectionKey === 'hero')?.content || {}) as Record<string, string>;

  const categoryLabels: Record<string, string> = {};
  for (const cat of categories) {
    categoryLabels[cat.slug] = cat.icon ? `${cat.icon} ${cat.label}` : cat.label;
  }

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Accueil', url: SITE_URL }, { name: 'Réalisations', url: `${SITE_URL}/realisations` }])} />
      <PageHero
        kicker={hero.subtitle_top || 'Notre portfolio'}
        title={hero.title || 'Nos réalisations'}
        intro={hero.description || 'Découvrez nos créations sur mesure pour particuliers et professionnels.'}
      />
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <RealisationsClient realisations={realisations} categoryLabels={categoryLabels} />
        </div>
      </section>
    </>
  );
}
