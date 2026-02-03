import type { Metadata } from 'next';
import { getAvis } from '@/lib/content';
import { AvisClient } from './AvisClient';

export const metadata: Metadata = { title: 'Avis clients' };

export default async function AvisPage() {
  const avis = await getAvis();

  return (
    <>
      <section className="bg-noir text-white py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-bois-clair text-sm font-medium tracking-widest uppercase mb-3">Temoignages</p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Avis clients</h1>
          <p className="text-white/60 text-lg max-w-2xl">La satisfaction de nos clients est notre meilleure carte de visite.</p>
        </div>
      </section>
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <AvisClient avis={avis} />
        </div>
      </section>
    </>
  );
}
