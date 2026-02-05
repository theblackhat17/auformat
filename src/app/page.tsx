import type { Metadata } from 'next';
import Link from 'next/link';
import { getRealisations, getAvis, getPageContent } from '@/lib/content';
import { ratingStars } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { JsonLd } from '@/components/seo/JsonLd';
import { localBusinessCysoingJsonLd, localBusinessCalotterieJsonLd } from '@/lib/jsonld';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/', {
    title: 'Au Format - Menuiserie sur mesure a Cysoing et La Calotterie',
    description: 'Au Format, menuiserie et ebenisterie sur mesure dans le Nord et le Pas-de-Calais. Meubles, dressings, cuisines, agencements. Ateliers a Cysoing (Lille) et La Calotterie (Le Touquet).',
    keywords: ['menuiserie sur mesure', 'Au Format', 'menuiserie Lille', 'menuiserie Cysoing', 'menuiserie Le Touquet', 'ebenisterie Nord', 'meuble sur mesure'],
  });
}

export default async function HomePage() {
  const [realisations, avis, sections] = await Promise.all([
    getRealisations(),
    getAvis(),
    getPageContent('homepage'),
  ]);

  const topRealisations = realisations.slice(0, 3);
  const topAvis = avis.slice(0, 3);

  // Get content sections by key
  const getSection = (key: string) => sections.find((s) => s.sectionKey === key)?.content || {};

  const hero = getSection('hero') as Record<string, string>;
  const stats = getSection('stats') as { items?: { value: string; label: string }[] };
  const services = getSection('services') as { title?: string; subtitle?: string; items?: { icon: string; title: string; desc: string }[] };
  const realisationsPreview = getSection('realisations_preview') as { title?: string; subtitle?: string; link_text?: string };
  const testimonials = getSection('testimonials') as { title?: string; subtitle?: string };
  const cta = getSection('cta') as Record<string, string>;

  return (
    <>
      <JsonLd data={localBusinessCysoingJsonLd()} />
      <JsonLd data={localBusinessCalotterieJsonLd()} />
      <Header />
      <main className="pt-18 lg:pt-22">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex items-center bg-noir overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-noir via-noir/95 to-bois-fonce/30" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20">
            <div className="max-w-2xl">
              <p className="text-bois-clair font-medium tracking-widest uppercase text-sm mb-4">{hero.subtitle_top || 'Menuiserie sur mesure'}</p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                {hero.title_line1 || 'Franchissons ensemble,'}<br />
                <span className="text-bois-clair">{hero.title_line2 || 'le pas vers le bois'}</span>
              </h1>
              <p className="text-lg text-white/60 leading-relaxed mb-10 max-w-xl">
                {hero.description || 'Conception et fabrication de meubles sur mesure, dressings, cuisines et agencements pour particuliers et professionnels dans la region lilloise.'}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href={hero.cta_primary_link || '/contact'}
                  className="inline-flex items-center px-8 py-3.5 bg-vert-foret text-white font-semibold rounded-lg hover:bg-vert-foret-dark transition-all duration-200 shadow-lg shadow-vert-foret/20"
                >
                  {hero.cta_primary || 'Demander un devis'}
                </Link>
                <Link
                  href={hero.cta_secondary_link || '/configurateur'}
                  className="inline-flex items-center px-8 py-3.5 border-2 border-white/20 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-200"
                >
                  {hero.cta_secondary || 'Configurateur 3D'}
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-2/3 bg-gradient-to-l from-bois-fonce/10 to-transparent rounded-l-full hidden lg:block" />
        </section>

        {/* Stats section */}
        {stats.items && (
          <section className="bg-beige py-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                {stats.items.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-3xl lg:text-4xl font-bold text-vert-foret">{stat.value}</p>
                    <p className="text-sm text-bois-fonce mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Services */}
        {services.items && (
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="text-center mb-14">
                <h2 className="text-3xl font-bold text-noir mb-3">{services.title || 'Nos savoir-faire'}</h2>
                <p className="text-noir/50 max-w-xl mx-auto">{services.subtitle || ''}</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {services.items.map((service) => (
                  <div key={service.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <span className="text-3xl mb-4 block">{service.icon}</span>
                    <h3 className="text-lg font-semibold text-noir mb-2">{service.title}</h3>
                    <p className="text-sm text-noir/50 leading-relaxed">{service.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Realisations preview */}
        {topRealisations.length > 0 && (
          <section className="py-20 bg-beige/50">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-noir mb-2">{realisationsPreview.title || 'Nos dernieres realisations'}</h2>
                  <p className="text-noir/50">{realisationsPreview.subtitle || 'Decouvrez nos creations recentes'}</p>
                </div>
                <Link href="/realisations" className="text-sm font-medium text-vert-foret hover:underline hidden md:block">
                  {realisationsPreview.link_text || 'Voir tout'} &rarr;
                </Link>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {topRealisations.map((r) => (
                  <div key={r.id} className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="aspect-[4/3] bg-beige overflow-hidden">
                      {r.image && <img src={r.image} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />}
                    </div>
                    <div className="p-5">
                      <span className="text-xs font-medium text-bois-fonce uppercase tracking-wider">{r.categoryLabel || r.category}</span>
                      <h3 className="text-lg font-semibold text-noir mt-1 mb-2">{r.title}</h3>
                      <p className="text-sm text-noir/50 line-clamp-2">{r.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8 md:hidden">
                <Link href="/realisations" className="text-sm font-medium text-vert-foret hover:underline">Voir toutes nos realisations &rarr;</Link>
              </div>
            </div>
          </section>
        )}

        {/* Testimonials */}
        {topAvis.length > 0 && (
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-noir mb-3">{testimonials.title || 'Ce que disent nos clients'}</h2>
                <p className="text-noir/50">{testimonials.subtitle || 'La satisfaction de nos clients est notre meilleure recompense'}</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {topAvis.map((a) => (
                  <div key={a.id} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                    <div className="text-bois-clair text-lg mb-3">{ratingStars(a.rating)}</div>
                    <p className="text-sm text-noir/70 leading-relaxed mb-4 italic">&ldquo;{a.testimonial}&rdquo;</p>
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                      <div className="w-9 h-9 rounded-full bg-vert-foret/10 text-vert-foret flex items-center justify-center text-xs font-bold">
                        {a.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-noir">{a.name}</p>
                        <p className="text-xs text-noir/40">{a.location} &middot; {a.clientType}</p>
                      </div>
                      {a.verified && <span className="ml-auto text-xs text-vert-foret font-medium bg-vert-foret/10 px-2 py-0.5 rounded-full">Verifie</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="bg-vert-foret py-20">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">{cta.title || 'Votre projet commence ici'}</h2>
            <p className="text-white/70 mb-8 text-lg">{cta.subtitle || 'Contactez-nous pour discuter de votre projet. Devis gratuit et sans engagement.'}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href={cta.cta_primary_link || '/contact'} className="inline-flex items-center px-8 py-3.5 bg-white text-vert-foret font-semibold rounded-lg hover:bg-beige transition-colors shadow-lg">
                {cta.cta_primary || 'Demander un devis gratuit'}
              </Link>
              <Link href={cta.cta_secondary_link || '/processus'} className="inline-flex items-center px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
                {cta.cta_secondary || 'Decouvrir notre processus'}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
