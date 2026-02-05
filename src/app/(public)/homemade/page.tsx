import type { Metadata } from 'next';
import { getPageContent } from '@/lib/content';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/homemade', {
    title: 'Savoir-faire - Expertise menuiserie et ébénisterie',
    description: 'Découvrez le savoir-faire d\'Au Format : menuiserie traditionnelle, ébénisterie, usinage numérique CNC. L\'alliance de l\'artisanat et des technologies modernes.',
    keywords: ['savoir-faire menuiserie', 'ébénisterie artisanale', 'menuiserie CNC', 'artisan menuisier Nord'],
  });
}

export default async function HomemadePage() {
  const sections = await getPageContent('homemade');

  const getSection = (key: string) => sections.find((s) => s.sectionKey === key)?.content || {};

  const hero = getSection('hero') as Record<string, string>;
  const stats = getSection('stats') as { items?: { value: string; label: string }[] };
  const metiers = getSection('metiers') as { title?: string; items?: { icon: string; title: string; desc: string }[] };
  const competences = getSection('competences') as { title?: string; items?: { title: string; desc: string }[] };

  return (
    <>
      <section className="bg-noir text-white py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-bois-clair text-sm font-medium tracking-widest uppercase mb-3">{hero.subtitle_top || 'Notre expertise'}</p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">{hero.title || 'Savoir-faire'}</h1>
          <p className="text-white/60 text-lg max-w-2xl">{hero.description || "L'alliance du savoir-faire artisanal et des technologies modernes."}</p>
        </div>
      </section>

      {/* Stats */}
      {stats.items && (
        <section className="bg-beige py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {stats.items.map((s) => (
                <div key={s.label}>
                  <p className="text-3xl lg:text-4xl font-bold text-vert-foret">{s.value}</p>
                  <p className="text-sm text-bois-fonce mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Metiers */}
      {metiers.items && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-noir text-center mb-12">{metiers.title || 'Nos métiers'}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {metiers.items.map((m) => (
                <div key={m.title} className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
                  <span className="text-4xl mb-4 block">{m.icon}</span>
                  <h3 className="text-xl font-semibold text-noir mb-3">{m.title}</h3>
                  <p className="text-sm text-noir/60 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Expertises */}
      {competences.items && (
        <section className="py-20 bg-beige/50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-noir text-center mb-12">{competences.title || 'Nos compétences techniques'}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {competences.items.map((e) => (
                <div key={e.title} className="bg-white rounded-lg p-5 border border-gray-100">
                  <h3 className="text-base font-semibold text-noir mb-1.5">{e.title}</h3>
                  <p className="text-sm text-noir/50">{e.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
