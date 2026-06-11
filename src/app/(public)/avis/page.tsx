export const revalidate = 60;

import type { Metadata } from 'next';
import { getAvis, getAvisStats, getPageContent } from '@/lib/content';
import { AvisClient } from './AvisClient';
import { buildPageMetadata, SITE_URL, SITE_NAME } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { PageHero } from '@/components/layout/PageHero';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/avis', {
    title: 'Avis clients menuiserie Lille et Le Touquet',
    description: 'Lisez les avis de nos clients sur nos réalisations de menuiserie sur mesure. Satisfaction client et travail de qualité à Cysoing, Lille et Le Touquet.',
    keywords: ['avis menuiserie Lille', 'temoignages clients meuble sur mesure', 'avis Au Format'],
  });
}

export default async function AvisPage() {
  const [avis, avisStats, sections] = await Promise.all([getAvis(), getAvisStats(), getPageContent('avis')]);

  const hero = (sections.find((s) => s.sectionKey === 'hero')?.content || {}) as Record<string, string>;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Accueil', url: SITE_URL }, { name: 'Avis clients', url: `${SITE_URL}/avis` }])} />
      {avisStats && avisStats.reviewCount > 0 && (
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          '@id': `${SITE_URL}/#organization`,
          name: SITE_NAME,
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: avisStats.ratingValue,
            bestRating: 5,
            worstRating: 1,
            reviewCount: avisStats.reviewCount,
          },
        }} />
      )}
      <PageHero
        kicker={hero.subtitle_top || 'Témoignages'}
        title={hero.title || 'Avis clients'}
        intro={hero.description || 'La satisfaction de nos clients est notre meilleure carte de visite.'}
      />
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <AvisClient avis={avis} />
        </div>
      </section>
    </>
  );
}
