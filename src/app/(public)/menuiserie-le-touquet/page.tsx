export const revalidate = 300;

import type { Metadata } from 'next';
import Link from 'next/link';
import { getServices, getAvisStats, getPageContent } from '@/lib/content';
import { buildPageMetadata, SITE_URL, LOCATIONS, PHONE, EMAIL, HOURS } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, localBusinessCalotterieJsonLd } from '@/lib/jsonld';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/menuiserie-le-touquet', {
    title: 'Menuiserie sur mesure au Touquet et Montreuil-sur-Mer — Atelier Côte d\'Opale',
    description:
      'Au Format, menuisier ébéniste à La Calotterie près du Touquet-Paris-Plage et de Montreuil-sur-Mer. Meubles, dressings, cuisines et agencements sur mesure en bois massif. Devis gratuit sur la Côte d\'Opale.',
    keywords: [
      'menuiserie Le Touquet',
      'menuisier Montreuil-sur-Mer',
      'meuble sur mesure Côte d\'Opale',
      'ébéniste Pas-de-Calais',
      'menuiserie La Calotterie',
      'dressing sur mesure Le Touquet',
      'cuisine sur mesure Montreuil',
      'agencement Berck Étaples',
    ],
  });
}

const loc = LOCATIONS.calotterie;

const DEFAULT_INTRO = {
  title: 'Votre menuisier ébéniste sur la Côte d\'Opale',
  paragraphs: [
    `Notre second atelier, situé à La Calotterie aux portes de Montreuil-sur-Mer, dessert la Côte d'Opale et le littoral du Pas-de-Calais. À quelques minutes du Touquet-Paris-Plage, nous concevons et fabriquons du mobilier sur mesure adapté aux résidences principales comme aux maisons secondaires du bord de mer.`,
    `Du dressing d'une villa au Touquet à l'agencement complet d'un commerce à Boulogne-sur-Mer, chaque projet est réalisé avec le même soin artisanal. Nous nous déplaçons gratuitement pour la prise de mesures sur toute la Côte d'Opale et dans le Montreuillois.`,
  ],
};

const DEFAULT_WHY = [
  { icon: '🏖️', title: 'Ancrage local', desc: 'Atelier à La Calotterie, au cœur du Montreuillois. Connaissance du bâti local, des contraintes des maisons de bord de mer et des résidences de standing.' },
  { icon: '🪚', title: 'Artisanat authentique', desc: 'Fabrication intégrale en atelier, sans sous-traitance. Chaque pièce est signée par l\'artisan qui l\'a conçue, fabriquée et posée.' },
  { icon: '🏠', title: 'Résidences principales & secondaires', desc: 'Habitués des projets pour résidences secondaires : nous gérons les mesures, la fabrication et la pose même en votre absence.' },
  { icon: '📐', title: 'Adaptation au bâti ancien', desc: 'Expertise des murs courbes, plafonds bas et sols irréguliers propres aux maisons de caractère du littoral et de l\'arrière-pays.' },
];

const DEFAULT_AREAS = [
  'Le Touquet-Paris-Plage', 'Montreuil-sur-Mer', 'La Calotterie', 'Étaples',
  'Berck', 'Boulogne-sur-Mer', 'Le Portel', 'Hardelot', 'Merlimont',
  'Rang-du-Fliers', 'Cucq', 'Camiers', 'Hesdin', 'Fruges',
  'Saint-Omer', 'Desvres', 'Samer', 'Marquise', 'Wimereux', 'Audresselles',
];

export default async function MenuiserieLeTouquetPage() {
  const [services, avisStats, sections] = await Promise.all([
    getServices(),
    getAvisStats(),
    getPageContent('menuiserie-le-touquet'),
  ]);

  const getSection = (key: string) => sections.find((s) => s.sectionKey === key)?.content;

  const intro = (getSection('intro') as { title?: string; paragraphs?: string[] }) || DEFAULT_INTRO;
  const why = (getSection('why') as { items?: { icon: string; title: string; desc: string }[] })?.items || DEFAULT_WHY;
  const areas = (getSection('areas') as { items?: string[] })?.items || DEFAULT_AREAS;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', url: SITE_URL },
        { name: 'Menuiserie Le Touquet', url: `${SITE_URL}/menuiserie-le-touquet` },
      ])} />
      <JsonLd data={localBusinessCalotterieJsonLd(avisStats)} />

      {/* Hero */}
      <section className="bg-noir text-white py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-bois-clair text-sm font-medium tracking-widest uppercase mb-3">Atelier La Calotterie — Côte d&apos;Opale</p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Menuiserie sur mesure au Touquet et Montreuil-sur-Mer</h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Mobilier sur mesure en bois massif pour particuliers et professionnels de la Côte d&apos;Opale et du Pas-de-Calais.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-noir mb-6">{intro.title || DEFAULT_INTRO.title}</h2>
          <div className="prose prose-lg text-noir/70 space-y-4">
            {(intro.paragraphs || DEFAULT_INTRO.paragraphs).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      {services.length > 0 && (
        <section className="py-20 bg-beige/50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-noir text-center mb-10">Nos services sur la Côte d&apos;Opale</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((s) => (
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

      {/* Why choose us */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-noir text-center mb-12">Pourquoi choisir Au Format sur la Côte d&apos;Opale ?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {why.map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
                <span className="text-4xl mb-4 block">{item.icon}</span>
                <h3 className="text-xl font-semibold text-noir mb-3">{item.title}</h3>
                <p className="text-sm text-noir/70 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="py-20 bg-beige/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-noir mb-6">Notre atelier à La Calotterie</h2>
              <div className="space-y-4 text-noir/70">
                <p>
                  <strong className="text-noir">Adresse :</strong> {loc.streetAddress}, {loc.postalCode} {loc.city}
                </p>
                <p>
                  <strong className="text-noir">Téléphone :</strong>{' '}
                  <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="text-vert-foret hover:underline">{PHONE}</a>
                </p>
                <p>
                  <strong className="text-noir">Email :</strong>{' '}
                  <a href={`mailto:${EMAIL}`} className="text-vert-foret hover:underline">{EMAIL}</a>
                </p>
                <p>
                  <strong className="text-noir">Horaires :</strong> Lun-Ven {HOURS.weekdays} — Sur rendez-vous
                </p>
              </div>
              <div className="mt-6">
                <Link href="/contact" className="inline-flex items-center px-8 py-3.5 bg-vert-foret text-white font-semibold rounded-lg hover:bg-vert-foret-dark transition-colors shadow-lg shadow-vert-foret/20">
                  Demander un devis gratuit
                </Link>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-md aspect-[4/3]">
              <iframe
                title="Atelier Au Format La Calotterie"
                src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2535!2d${loc.lng}!3d${loc.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTDCsDI3JzQ2LjEiTiAxwrA0NSc0MS4wIkU!5e0!3m2!1sfr!2sfr`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Zone d'intervention */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-noir text-center mb-8">Zone d&apos;intervention sur la Côte d&apos;Opale</h2>
          <p className="text-noir/70 text-center mb-8">
            Nous intervenons dans un rayon de 50 km autour de notre atelier de La Calotterie, couvrant le littoral de la Côte d&apos;Opale, le Montreuillois et le Boulonnais.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {areas.map((city) => (
              <span key={city} className="text-sm bg-beige text-noir/70 px-3 py-1.5 rounded-full">{city}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Other location */}
      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-noir/70 text-sm">
            Vous êtes dans la métropole lilloise ?{' '}
            <Link href="/menuiserie-lille" className="text-vert-foret font-semibold hover:underline">
              Découvrez notre atelier à Cysoing, près de Lille →
            </Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-vert-foret py-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Un projet sur la Côte d&apos;Opale ?</h2>
          <p className="text-white/80 mb-8 text-lg">Contactez-nous pour un devis gratuit et sans engagement. Déplacement offert du Touquet à Boulogne-sur-Mer.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="inline-flex items-center px-8 py-3.5 bg-white text-vert-foret font-semibold rounded-lg hover:bg-beige transition-colors shadow-lg">
              Demander un devis gratuit
            </Link>
            <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="inline-flex items-center px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
              Appeler : {PHONE}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
