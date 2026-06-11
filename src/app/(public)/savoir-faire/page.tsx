export const revalidate = 300;

import type { Metadata } from 'next';
import Link from 'next/link';
import { getPageContent, getServices } from '@/lib/content';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/motion/Reveal';
import { AnimatedCounter } from '@/components/motion/AnimatedCounter';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/savoir-faire', {
    title: 'Savoir-faire - Expertise menuiserie et ébénisterie',
    description: 'Découvrez le savoir-faire d\'Au Format : menuiserie traditionnelle, ébénisterie, usinage numérique CNC. L\'alliance de l\'artisanat et des technologies modernes.',
    keywords: ['savoir-faire menuiserie', 'ébénisterie artisanale', 'menuiserie CNC', 'artisan menuisier Nord'],
  });
}

export default async function HomemadePage() {
  const [sections, dbServices] = await Promise.all([
    getPageContent('homemade'),
    getServices(),
  ]);

  const getSection = (key: string) => sections.find((s) => s.sectionKey === key)?.content || {};

  const hero = getSection('hero') as Record<string, string>;
  const stats = getSection('stats') as { items?: { value: string; label: string }[] };
  const metiers = getSection('metiers') as { title?: string; items?: { icon: string; title: string; desc: string }[] };
  const competences = getSection('competences') as { title?: string; items?: { title: string; desc: string }[] };

  // Les blocs « savoir-faire » de la page d'accueil, ici en version complète
  // (l'accueil n'affiche que les titres) ; repli sur les anciens métiers si vide.
  const savoirFaireBlocks = dbServices.length > 0
    ? dbServices.map((s) => ({ title: s.title, desc: s.shortDescription || '', href: `/services/${s.slug}` }))
    : (metiers.items || []).map((m) => ({ title: m.title, desc: m.desc, href: null as string | null }));

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Accueil', url: SITE_URL }, { name: 'Savoir-faire', url: `${SITE_URL}/savoir-faire` }])} />

      <PageHero
        kicker={hero.subtitle_top || 'Notre expertise'}
        title={hero.title || 'Savoir-faire'}
        intro={hero.description || "L'alliance du savoir-faire artisanal et des technologies modernes."}
      />

      {/* Chiffres — compteurs animés */}
      {stats.items && (
        <section className="bg-beige py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
              {stats.items.map((s, i) => (
                <Reveal key={s.label} delay={i * 80} className="text-center lg:text-left lg:border-l lg:border-noir/10 lg:pl-8 first:border-l-0 first:pl-0">
                  <p className="font-display text-4xl lg:text-5xl text-vert-foret">
                    <AnimatedCounter value={s.value} />
                  </p>
                  <p className="text-[0.9375rem] text-noir/70 mt-2">{s.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Savoir-faire — les blocs de l'accueil, en version complète */}
      {savoirFaireBlocks.length > 0 && (
        <section className="py-24 lg:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir mb-14">
                Nos savoir-faire
              </h2>
            </Reveal>
            <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
              {savoirFaireBlocks.map((block, i) => (
                <Reveal key={block.title} delay={(i % 2) * 100} className="border-t border-noir/10 pt-7">
                  <h3 className="font-display text-2xl text-noir mb-3">{block.title}</h3>
                  <p className="text-[0.9375rem] text-noir/70 leading-relaxed max-w-[60ch]">{block.desc}</p>
                  {block.href && (
                    <Link href={block.href} className="link-arrow mt-4 text-sm">
                      En savoir plus
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Compétences techniques — liste précise, cochée au trait */}
      {competences.items && (
        <section className="py-20 lg:py-24 bg-beige">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir text-center mb-14">
                {competences.title || 'Nos compétences techniques'}
              </h2>
            </Reveal>
            <ul className="grid sm:grid-cols-2 gap-x-14 gap-y-7">
              {competences.items.map((e, i) => (
                <Reveal as="li" key={e.title} delay={Math.min(i * 50, 300)} className="flex gap-4">
                  <svg className="w-5 h-5 flex-shrink-0 mt-1 text-vert-foret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h3 className="text-[1.0625rem] font-semibold text-noir">{e.title}</h3>
                    <p className="text-[0.9375rem] text-noir/70 leading-relaxed mt-1">{e.desc}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 lg:py-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir mb-5">
              Un projet en tête&nbsp;?
            </h2>
            <p className="text-noir/70 text-lg leading-relaxed mb-9">
              Parlons-en autour d&apos;un plan, d&apos;un croquis ou d&apos;une simple idée.
            </p>
            <Link href="/contact" className="btn-primary">Demander un devis gratuit</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
