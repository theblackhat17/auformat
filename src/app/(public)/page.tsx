export const revalidate = 60;

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getRealisations, getAvis, getAvisStats, getPageContent, getSettings, getServices } from '@/lib/content';
import { ratingStars } from '@/lib/utils';
import { JsonLd } from '@/components/seo/JsonLd';
import { localBusinessCysoingJsonLd, localBusinessCalotterieJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { Reveal } from '@/components/motion/Reveal';
import { AnimatedCounter } from '@/components/motion/AnimatedCounter';
import { Parallax } from '@/components/motion/Parallax';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/', {
    title: 'Au Format - Menuiserie sur mesure à Cysoing et La Calotterie',
    description: 'Au Format, menuiserie et ébénisterie sur mesure dans le Nord et le Pas-de-Calais. Meubles, dressings, cuisines, agencements. Ateliers à Cysoing (Lille) et La Calotterie (Le Touquet).',
    keywords: ['menuiserie sur mesure', 'Au Format', 'menuiserie Lille', 'menuiserie Cysoing', 'menuiserie Le Touquet', 'ébénisterie Nord', 'meuble sur mesure'],
  });
}

const ArrowIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default async function HomePage() {
  const [realisations, avis, avisStats, sections, siteSettings, dbServices] = await Promise.all([
    getRealisations(),
    getAvis(),
    getAvisStats(),
    getPageContent('homepage'),
    getSettings(),
    getServices(),
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

  const [featuredAvis, ...otherAvis] = topAvis;
  const [featuredRea, ...otherReas] = topRealisations;

  const serviceRows = (dbServices.length > 0 ? dbServices : services.items || []).map((service) => {
    const isDb = 'slug' in service;
    return {
      href: isDb ? `/services/${(service as { slug: string }).slug}` : '/realisations',
      title: (service as { title: string }).title,
      desc: isDb
        ? (service as { shortDescription: string | null }).shortDescription
        : (service as { desc: string }).desc,
    };
  });

  return (
    <>
      <JsonLd data={localBusinessCysoingJsonLd(avisStats)} />
      <JsonLd data={localBusinessCalotterieJsonLd(avisStats)} />
      {dbServices.length > 0 && (
        <JsonLd data={serviceJsonLd(dbServices.map((s) => ({
          name: s.title,
          description: s.shortDescription || s.title,
          url: `${SITE_URL}/services/${s.slug}`,
        })))} />
      )}

      {/* Hero — entrée orchestrée, parallaxe légère sur l'image */}
      <section className="relative min-h-[88vh] flex items-center bg-noir overflow-hidden">
        {siteSettings?.heroBackground ? (
          <>
            <Parallax className="absolute inset-0" factor={0.1}>
              <Image
                src={siteSettings.heroBackground}
                alt="Atelier Au Format — menuiserie sur mesure en bois massif"
                fill
                priority
                className="object-cover scale-110"
                sizes="100vw"
              />
            </Parallax>
            <div className="absolute inset-0 bg-gradient-to-r from-noir/80 via-noir/55 to-noir/25" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-noir via-noir/95 to-bois-fonce/30" />
        )}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 w-full">
          <div className="max-w-2xl">
            <p className="animate-hero-rise mb-4" style={{ ['--rise-delay' as string]: '80ms' }}>
              <span className="inline-block bg-beige text-noir font-semibold uppercase tracking-[0.25em] text-lg md:text-xl px-3 py-1">
                {hero.subtitle_top || 'Au Format'}
              </span>
            </p>
            <h1 className="animate-hero-rise font-display text-[clamp(2.5rem,4.5vw+1rem,4.25rem)] leading-[1.02] text-white mb-7" style={{ ['--rise-delay' as string]: '180ms' }}>
              {hero.title_line1 || 'Franchissons ensemble,'}<br />
              {hero.title_line2 || 'le pas vers le bois'}
            </h1>
            <p className="animate-hero-rise text-lg text-white/85 leading-relaxed mb-10 max-w-xl" style={{ ['--rise-delay' as string]: '300ms' }}>
              {hero.description || 'Conception et fabrication de meubles sur mesure, dressings, cuisines et agencements pour particuliers et professionnels dans la région lilloise.'}
            </p>
            <div className="animate-hero-rise flex flex-wrap gap-4" style={{ ['--rise-delay' as string]: '420ms' }}>
              <Link href={hero.cta_primary_link || '/contact'} className="btn-on-dark">
                {hero.cta_primary || 'Demander un devis'}
                <ArrowIcon className="w-4 h-4" />
              </Link>
              {(siteSettings?.configurateurEnabled || (hero.cta_secondary_link && hero.cta_secondary_link !== '/configurateur')) && (
                <Link href={hero.cta_secondary_link || '/configurateur'} className="btn-ghost-dark">
                  {hero.cta_secondary || 'Configurateur 3D'}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Chiffres — compteurs animés au passage */}
      {stats.items && (
        <section className="bg-beige py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
              {stats.items.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 80} className="text-center lg:text-left lg:border-l lg:border-noir/10 lg:pl-8 first:border-l-0 first:pl-0">
                  <p className="font-display text-4xl lg:text-5xl text-vert-foret">
                    <AnimatedCounter value={stat.value} />
                  </p>
                  <p className="text-[0.9375rem] text-noir/70 mt-2">{stat.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Savoir-faire — liste éditoriale, le titre accompagne la lecture */}
      {serviceRows.length > 0 && (
        <section className="py-24 lg:py-32">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-32">
                  <Reveal>
                    <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir mb-5">
                      {services.title || 'Nos savoir-faire'}
                    </h2>
                    {services.subtitle && <p className="text-noir/70 leading-relaxed mb-8">{services.subtitle}</p>}
                    <Link href="/savoir-faire" className="btn-secondary">
                      Voir plus
                      <ArrowIcon className="w-4 h-4" />
                    </Link>
                  </Reveal>
                </div>
              </div>
              <div className="lg:col-span-8">
                <ul className="border-t border-noir/10">
                  {serviceRows.map((service, i) => (
                    <Reveal as="li" key={service.title} delay={i * 60}>
                      <Link
                        href={service.href}
                        className="group flex items-center justify-between gap-6 py-6 border-b border-noir/10 transition-colors duration-300 hover:bg-beige/40 -mx-4 px-4 rounded-lg"
                      >
                        <h3 className="font-display text-xl lg:text-2xl text-noir group-hover:text-vert-foret transition-colors duration-300">
                          {service.title}
                        </h3>
                        <span className="flex-shrink-0 w-11 h-11 rounded-full border border-noir/15 flex items-center justify-center text-noir/60 transition-all duration-300 group-hover:bg-vert-foret group-hover:border-vert-foret group-hover:text-white">
                          <ArrowIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    </Reveal>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Réalisations — galerie asymétrique, les images en héros */}
      {topRealisations.length > 0 && (
        <section className="py-24 lg:py-32 bg-beige">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-12">
              <div>
                <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir mb-3">
                  {realisationsPreview.title || 'Nos dernières réalisations'}
                </h2>
                <p className="text-noir/70">{realisationsPreview.subtitle || 'Découvrez nos créations récentes'}</p>
              </div>
              <Link href="/realisations" className="link-arrow hidden md:inline-flex">
                {realisationsPreview.link_text || 'Voir tout'}
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </Reveal>
            <div className="grid lg:grid-cols-12 gap-5">
              {featuredRea && (
                <Reveal variant="clip" className="lg:col-span-7">
                  <Link href="/realisations" className="group relative block aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[480px] rounded-xl overflow-hidden">
                    {featuredRea.image && (
                      <Image
                        src={featuredRea.image}
                        alt={featuredRea.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-noir/75 via-noir/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-7">
                      <p className="text-bois-clair text-sm font-semibold mb-2">{featuredRea.categoryLabel || featuredRea.category}</p>
                      <h3 className="font-display text-2xl text-white">{featuredRea.title}</h3>
                    </div>
                  </Link>
                </Reveal>
              )}
              <div className="lg:col-span-5 grid gap-5">
                {otherReas.map((r, i) => (
                  <Reveal variant="clip" key={r.id} delay={120 + i * 120}>
                    <Link href="/realisations" className="group relative block aspect-[16/10] rounded-xl overflow-hidden">
                      {r.image && (
                        <Image
                          src={r.image}
                          alt={r.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 42vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-noir/75 via-noir/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <p className="text-bois-clair text-sm font-semibold mb-1.5">{r.categoryLabel || r.category}</p>
                        <h3 className="font-display text-xl text-white">{r.title}</h3>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
            <div className="text-center mt-10 md:hidden">
              <Link href="/realisations" className="link-arrow">
                Voir toutes nos réalisations
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Avis — une parole vedette plutôt que trois cartes identiques */}
      {topAvis.length > 0 && (
        <section className="py-24 lg:py-32">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-14">
              <div>
                <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir mb-3">
                  {testimonials.title || 'Ce que disent nos clients'}
                </h2>
                <p className="text-noir/70 max-w-xl">{testimonials.subtitle || 'La satisfaction de nos clients est notre meilleure récompense'}</p>
              </div>
              <Link href="/avis" className="link-arrow hidden md:inline-flex">
                Voir tout
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </Reveal>

            {featuredAvis && (
              <Reveal className="max-w-3xl mx-auto text-center">
                <p className="text-bois-fonce text-lg tracking-[0.2em]" aria-label={`Note : ${featuredAvis.rating} sur 5`}>
                  {ratingStars(featuredAvis.rating)}
                </p>
                <blockquote className="font-display text-2xl lg:text-[1.75rem] leading-[1.4] text-noir mt-6">
                  «&nbsp;{featuredAvis.testimonial}&nbsp;»
                </blockquote>
                <footer className="mt-7 flex items-center justify-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-vert-foret/10 text-vert-foret flex items-center justify-center text-sm font-bold" aria-hidden="true">
                    {featuredAvis.name.charAt(0)}
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-semibold text-noir">{featuredAvis.name}</span>
                    <span className="block text-xs text-noir/55">{featuredAvis.location} &middot; {featuredAvis.clientType}</span>
                  </span>
                  {featuredAvis.verified && (
                    <span className="text-xs text-vert-foret font-semibold bg-vert-foret/10 px-2.5 py-1 rounded-full">Vérifié</span>
                  )}
                </footer>
              </Reveal>
            )}

            {otherAvis.length > 0 && (
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-10 max-w-4xl mx-auto mt-16 pt-12 border-t border-noir/10">
                {otherAvis.map((a, i) => (
                  <Reveal key={a.id} delay={i * 100}>
                    <p className="text-bois-fonce text-sm tracking-[0.2em]" aria-label={`Note : ${a.rating} sur 5`}>{ratingStars(a.rating)}</p>
                    <blockquote className="text-[0.9375rem] text-noir/80 leading-relaxed mt-3">
                      «&nbsp;{a.testimonial}&nbsp;»
                    </blockquote>
                    <footer className="mt-4 text-sm">
                      <span className="font-semibold text-noir">{a.name}</span>
                      <span className="text-noir/55"> &middot; {a.location}</span>
                    </footer>
                  </Reveal>
                ))}
              </div>
            )}

            <Reveal className="text-center mt-14 md:hidden">
              <Link href="/avis" className="link-arrow">
                Voir tous les avis
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-vert-foret py-24 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-white mb-5">
              {cta.title || 'Votre projet commence ici'}
            </h2>
            <p className="text-white/85 mb-10 text-lg leading-relaxed">
              {cta.subtitle || 'Contactez-nous pour discuter de votre projet. Devis gratuit et sans engagement.'}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href={cta.cta_primary_link || '/contact'} className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-vert-foret font-semibold rounded-full hover:bg-beige transition-colors duration-200">
                {cta.cta_primary || 'Demander un devis gratuit'}
                <ArrowIcon className="w-4 h-4" />
              </Link>
              <Link href={cta.cta_secondary_link || '/processus'} className="btn-ghost-dark">
                {cta.cta_secondary || 'Configurer vous même votre projet'}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
