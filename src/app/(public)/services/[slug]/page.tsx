export const revalidate = 60;

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { getServiceBySlug, getServices, getRealisationsByService } from '@/lib/content';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { SITE_URL, LOCATIONS } from '@/lib/seo';
import { Reveal } from '@/components/motion/Reveal';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return {};

  return buildPageMetadata(`/services/${slug}`, {
    title: service.metaTitle || `${service.title} - Au Format`,
    description: service.metaDescription || service.shortDescription || `${service.title} sur mesure par Au Format, menuiserie artisanale.`,
    keywords: service.metaKeywords ? service.metaKeywords.split(',').map((k) => k.trim()) : [service.title, 'sur mesure', 'bois massif'],
  });
}

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((s) => ({ slug: s.slug }));
}

const rise = (delay: number) => ({ '--rise-delay': `${delay}ms` }) as CSSProperties;

const ArrowIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const content = service.content || {};
  const allServices = await getServices();
  const otherServices = allServices.filter((s) => s.slug !== slug).slice(0, 4);
  const realisations = await getRealisationsByService(slug, 6);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', url: SITE_URL },
        { name: service.title, url: `${SITE_URL}/services/${slug}` },
      ])} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Service',
        '@id': `${SITE_URL}/services/${slug}#service`,
        name: service.title,
        description: service.shortDescription || service.metaDescription || `${service.title} sur mesure par Au Format`,
        url: `${SITE_URL}/services/${slug}`,
        ...(service.image ? { image: service.image.startsWith('http') ? service.image : `${SITE_URL}${service.image}` } : {}),
        provider: { '@id': `${SITE_URL}/#organization` },
        areaServed: [
          ...LOCATIONS.cysoing.areaServed.slice(0, 3).map((name) => ({ '@type': 'City', name })),
          ...LOCATIONS.calotterie.areaServed.slice(0, 3).map((name) => ({ '@type': 'City', name })),
        ],
        serviceType: 'Menuiserie sur mesure',
      }} />

      {/* Hero — l'image du service en pleine présence */}
      <section className="relative bg-noir text-white py-24 lg:py-32 overflow-hidden">
        {service.image && (
          <>
            <Image src={service.image} alt={service.title} fill className="object-cover" sizes="100vw" priority />
            <div className="absolute inset-0 bg-gradient-to-r from-noir/85 via-noir/60 to-noir/30" />
          </>
        )}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <p className="animate-hero-rise flex items-center gap-3 text-bois-clair font-medium text-[0.9375rem] mb-5" style={rise(60)}>
            <span className="h-px w-10 bg-bois-clair" aria-hidden="true" />
            Nos services
          </p>
          <h1 className="animate-hero-rise font-display text-[clamp(2.25rem,3.5vw+1rem,3.5rem)] leading-[1.1] mb-5 max-w-3xl" style={rise(160)}>
            {service.title}
          </h1>
          {service.subtitle && (
            <p className="animate-hero-rise text-xl text-white/85 leading-relaxed max-w-2xl" style={rise(260)}>
              {service.subtitle}
            </p>
          )}
          <div className="animate-hero-rise mt-9" style={rise(360)}>
            <Link href="/contact" className="btn-on-dark">
              Demander un devis
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* Introduction — l'accroche en grand */}
      {content.intro && (
        <section className="py-20 lg:py-24">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <Reveal>
              <p className="font-display text-xl lg:text-2xl leading-[1.5] text-noir">{content.intro}</p>
            </Reveal>
          </div>
        </section>
      )}

      {/* Features — trois arguments au filet */}
      {content.features && content.features.length > 0 && (
        <section className="py-20 lg:py-24 bg-beige">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-[clamp(1.625rem,2vw+0.5rem,2.25rem)] leading-[1.15] text-noir mb-14 text-center">
                Pourquoi choisir Au Format&nbsp;?
              </h2>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-10 md:gap-0 md:divide-x md:divide-noir/10">
              {content.features.map((f, i) => (
                <Reveal key={i} delay={i * 100} className="md:px-10 first:md:pl-0 last:md:pr-0 text-center md:text-left">
                  <span className="font-display text-lg text-bois-fonce" aria-hidden="true">—</span>
                  <h3 className="font-display text-xl text-noir mt-2 mb-2.5">{f.title}</h3>
                  <p className="text-[0.9375rem] text-noir/70 leading-relaxed">{f.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Body */}
      {content.body && (
        <section className="py-20 lg:py-24">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 space-y-5 text-noir/75 leading-relaxed">
            {content.body.split('\n\n').map((paragraph, i) => (
              <Reveal as="div" key={i} delay={Math.min(i * 60, 180)}>
                <p>{paragraph}</p>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Réalisations associées — galerie automatique via les tags */}
      {realisations.length > 0 && (
        <section className="py-20 lg:py-24 bg-beige">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-[clamp(1.625rem,2vw+0.5rem,2.25rem)] leading-[1.15] text-noir mb-3 text-center">
                Nos réalisations · {service.title}
              </h2>
              <p className="text-center text-noir/65 mb-12 max-w-2xl mx-auto">Quelques projets de ce type sortis de notre atelier.</p>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {realisations.map((r, i) => (
                <Reveal as="div" key={r.id} delay={i * 80}>
                  <Link href={`/realisations/${r.slug}`} className="group block rounded-2xl overflow-hidden bg-white ring-1 ring-noir/8 hover:ring-vert-foret/40 transition-all duration-300">
                    <div className="relative aspect-[4/3] overflow-hidden bg-beige">
                      {r.image && (
                        <Image src={r.image} alt={r.title} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-lg text-noir group-hover:text-vert-foret transition-colors duration-300">{r.title}</h3>
                      {(r.location || r.description) && (
                        <p className="text-[0.9375rem] text-noir/65 leading-relaxed mt-1.5 line-clamp-2">{r.location || r.description}</p>
                      )}
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/realisations" className="inline-flex items-center gap-2 px-6 py-3 border border-noir/20 rounded-full text-noir font-medium hover:bg-noir hover:text-white transition-colors duration-200">
                Voir toutes nos réalisations
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 lg:py-24 bg-vert-foret text-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="font-display text-[clamp(1.625rem,2vw+0.5rem,2.25rem)] leading-[1.15] mb-5">{content.cta_title || 'Votre projet commence ici'}</h2>
            <p className="text-white/85 text-lg mb-9">{content.cta_text || 'Contactez-nous pour un devis gratuit et personnalisé.'}</p>
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-vert-foret font-semibold rounded-full hover:bg-beige transition-colors duration-200">
              Demander un devis
              <ArrowIcon />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Other services — liste éditoriale */}
      {otherServices.length > 0 && (
        <section className="py-20 lg:py-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-[clamp(1.625rem,2vw+0.5rem,2.25rem)] leading-[1.15] text-noir mb-10 text-center">
                Nos autres services
              </h2>
            </Reveal>
            <ul className="border-t border-noir/10">
              {otherServices.map((s, i) => (
                <Reveal as="li" key={s.slug} delay={i * 60}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="group flex items-center justify-between gap-6 py-6 border-b border-noir/10 transition-colors duration-300 hover:bg-beige/40 -mx-4 px-4 rounded-lg"
                  >
                    <div>
                      <h3 className="font-display text-xl text-noir group-hover:text-vert-foret transition-colors duration-300">{s.title}</h3>
                      {s.shortDescription && (
                        <p className="text-[0.9375rem] text-noir/70 leading-relaxed mt-1.5 max-w-xl">{s.shortDescription.slice(0, 120)}</p>
                      )}
                    </div>
                    <span className="flex-shrink-0 w-10 h-10 rounded-full border border-noir/15 flex items-center justify-center text-noir/60 transition-all duration-300 group-hover:bg-vert-foret group-hover:border-vert-foret group-hover:text-white">
                      <ArrowIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
