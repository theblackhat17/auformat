export const revalidate = 60;

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getServiceBySlug, getServices } from '@/lib/content';
import { buildPageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { SITE_URL, LOCATIONS } from '@/lib/seo';

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

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const content = service.content || {};
  const allServices = await getServices();
  const otherServices = allServices.filter((s) => s.slug !== slug).slice(0, 4);

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

      {/* Hero */}
      <section className="relative bg-noir text-white py-20 lg:py-28">
        {service.image && (
          <Image src={service.image} alt={service.title} fill className="object-cover opacity-30" sizes="100vw" priority />
        )}
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          {service.icon && <span className="text-5xl mb-4 block">{service.icon}</span>}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{service.title}</h1>
          {service.subtitle && <p className="text-xl text-white/80 max-w-2xl">{service.subtitle}</p>}
        </div>
      </section>

      {/* Introduction */}
      {content.intro && (
        <section className="py-16 lg:py-20">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <p className="text-lg text-noir/70 leading-relaxed">{content.intro}</p>
          </div>
        </section>
      )}

      {/* Features */}
      {content.features && content.features.length > 0 && (
        <section className="py-16 bg-beige/50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-noir mb-10 text-center">Pourquoi choisir Au Format ?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {content.features.map((f, i) => (
                <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-semibold text-noir mb-2">{f.title}</h3>
                  <p className="text-sm text-noir/70 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Body */}
      {content.body && (
        <section className="py-16 lg:py-20">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 prose prose-lg text-noir/70">
            {content.body.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-vert-foret text-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{content.cta_title || 'Votre projet commence ici'}</h2>
          <p className="text-white/80 mb-8">{content.cta_text || 'Contactez-nous pour un devis gratuit et personnalise.'}</p>
          <Link href="/contact" className="inline-block bg-white text-vert-foret font-semibold px-8 py-3.5 rounded-lg hover:bg-white/90 transition-colors shadow-lg">
            Demander un devis
          </Link>
        </div>
      </section>

      {/* Other services */}
      {otherServices.length > 0 && (
        <section className="py-16 bg-beige/30">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-noir mb-8 text-center">Nos autres services</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {otherServices.map((s) => (
                <Link key={s.slug} href={`/services/${s.slug}`}
                  className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 block">
                  <span className="text-3xl mb-4 block">{s.icon || '📦'}</span>
                  <h3 className="text-lg font-semibold text-noir mb-2">{s.title}</h3>
                  <p className="text-sm text-noir/70 leading-relaxed">{s.shortDescription?.slice(0, 100)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
