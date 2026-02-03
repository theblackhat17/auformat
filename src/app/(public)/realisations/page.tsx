import type { Metadata } from 'next';
import { getRealisations, getCategories } from '@/lib/content';
import { RealisationsClient } from './RealisationsClient';

export const metadata: Metadata = { title: 'Realisations' };

export default async function RealisationsPage() {
  const [realisations, categories] = await Promise.all([
    getRealisations(),
    getCategories('realisation'),
  ]);

  const categoryLabels: Record<string, string> = {};
  for (const cat of categories) {
    categoryLabels[cat.slug] = cat.icon ? `${cat.icon} ${cat.label}` : cat.label;
  }

  return (
    <>
      <section className="bg-noir text-white py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-bois-clair text-sm font-medium tracking-widest uppercase mb-3">Notre portfolio</p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Nos realisations</h1>
          <p className="text-white/60 text-lg max-w-2xl">Decouvrez nos creations sur mesure pour particuliers et professionnels.</p>
        </div>
      </section>
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <RealisationsClient realisations={realisations} categoryLabels={categoryLabels} />
        </div>
      </section>
    </>
  );
}
