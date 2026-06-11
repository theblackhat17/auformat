export const revalidate = 300;

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getEquipe, getPageContent } from '@/lib/content';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/motion/Reveal';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/about', {
    title: 'À propos — Notre histoire et nos valeurs',
    description: 'Découvrez Au Format, menuiserie artisanale dans le Nord et le Pas-de-Calais. Notre équipe passionnée crée du mobilier sur mesure à Cysoing près de Lille et à La Calotterie près du Touquet.',
    keywords: ['menuiserie artisanale', 'ébéniste Nord', 'atelier menuiserie Cysoing', 'artisan bois Lille', 'équipe Au Format'],
  });
}

export default async function AboutPage() {
  const [equipe, sections] = await Promise.all([
    getEquipe(),
    getPageContent('about'),
  ]);

  const getSection = (key: string) => sections.find((s) => s.sectionKey === key)?.content || {};

  const hero = getSection('hero') as Record<string, string>;
  const history = getSection('history') as { title?: string; paragraphs?: string[] };
  const values = getSection('values') as { title?: string; items?: { icon: string; title: string; desc: string }[] };

  const historyParagraphs = history.paragraphs || [
    "Au Format est né d'une passion familiale pour le travail du bois. Depuis plus de 15 ans, nous concevons et fabriquons du mobilier sur mesure pour les particuliers et les professionnels de la région lilloise.",
    'Notre atelier est équipé de machines traditionnelles et numériques, nous permettant de combiner savoir-faire artisanal et précision moderne. Chaque projet est unique et mérite une attention particulière.',
    "Nous accompagnons nos clients de la conception à l'installation, en passant par le choix des matériaux et la fabrication en atelier. Notre engagement : un travail de qualité, dans les délais convenus.",
  ];
  const [leadParagraph, ...restParagraphs] = historyParagraphs;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Accueil', url: SITE_URL }, { name: 'À propos', url: `${SITE_URL}/about` }])} />

      <PageHero
        kicker={hero.subtitle_top || 'Notre histoire'}
        title={hero.title || "À propos d'Au Format"}
        intro={hero.description || 'Une passion pour le bois et le sur-mesure, transmise de génération en génération.'}
      />

      {/* Histoire — composition éditoriale, le premier paragraphe donne le ton */}
      <section className="py-24 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-4">
              <Reveal>
                <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir lg:sticky lg:top-32">
                  {history.title || 'Notre parcours'}
                </h2>
              </Reveal>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <Reveal delay={100}>
                <p className="font-display text-xl lg:text-2xl leading-[1.5] text-noir mb-8">{leadParagraph}</p>
                <div className="space-y-5 text-noir/75 leading-relaxed max-w-[68ch]">
                  {restParagraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Valeurs — colonnes au filet sur fond beige */}
      {values.items && (
        <section className="py-20 lg:py-24 bg-beige">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir text-center mb-14">
                {values.title || 'Nos valeurs'}
              </h2>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-10 md:gap-0 md:divide-x md:divide-noir/10">
              {values.items.slice(0, 6).map((v, i) => (
                <Reveal key={v.title} delay={i * 100} className="md:px-10 first:md:pl-0 last:md:pr-0 text-center md:text-left">
                  <span className="font-display text-lg text-bois-fonce" aria-hidden="true">—</span>
                  <h3 className="font-display text-xl text-noir mt-2 mb-2.5">{v.title}</h3>
                  <p className="text-[0.9375rem] text-noir/70 leading-relaxed">{v.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Equipe */}
      {equipe.length > 0 && (
        <section className="py-24 lg:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir text-center mb-14">
                Notre équipe
              </h2>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14 max-w-4xl mx-auto">
              {equipe.map((member, i) => (
                <Reveal key={member.id} delay={i * 80} className="text-center">
                  <div className="w-36 h-36 mx-auto rounded-full bg-beige ring-1 ring-noir/8 overflow-hidden mb-5 relative">
                    {member.photo ? (
                      <Image src={member.photo} alt={member.name} fill sizes="144px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-display text-4xl text-bois-fonce" aria-hidden="true">
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="font-display text-xl text-noir">{member.name}</h3>
                  <p className="text-sm font-semibold text-bois-fonce mt-1">{member.role}</p>
                  {member.description && <p className="text-sm text-noir/70 leading-relaxed mt-3 max-w-xs mx-auto">{member.description}</p>}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Passerelle vers le savoir-faire */}
      <section className="bg-noir py-20 lg:py-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-white mb-5">
              L&apos;atelier vous ouvre ses portes
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-9">
              Découvrez nos métiers, nos machines et la précision de notre travail.
            </p>
            <Link href="/savoir-faire" className="btn-on-dark">Découvrir notre savoir-faire</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
