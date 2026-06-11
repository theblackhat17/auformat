import Link from 'next/link';
import type { Service } from '@/lib/types';
import { PHONE, EMAIL, HOURS } from '@/lib/seo';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/motion/Reveal';

const ArrowIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export type LocalAtelierProps = {
  heroKicker: string;
  heroTitle: string;
  heroIntro: string;
  intro: { title?: string; paragraphs?: string[] };
  introDefaults: { title: string; paragraphs: string[] };
  services: Service[];
  servicesTitle: string;
  whyTitle: string;
  why: { icon: string; title: string; desc: string }[];
  atelier: { title: string; address: string };
  mapTitle: string;
  mapSrc: string;
  areasTitle: string;
  areasIntro: string;
  areas: string[];
  otherLocation: { question: string; href: string; label: string };
  cta: { title: string; text: string };
};

/** Corps commun des pages locales (Lille / Côte d'Opale), au design system Au Format. */
export function LocalAtelierSections({
  heroKicker, heroTitle, heroIntro,
  intro, introDefaults,
  services, servicesTitle,
  whyTitle, why,
  atelier, mapTitle, mapSrc,
  areasTitle, areasIntro, areas,
  otherLocation, cta,
}: LocalAtelierProps) {
  const introParagraphs = intro.paragraphs || introDefaults.paragraphs;
  const [leadParagraph, ...restParagraphs] = introParagraphs;

  return (
    <>
      <PageHero kicker={heroKicker} title={heroTitle} intro={heroIntro} />

      {/* Intro — l'accroche en grand */}
      <section className="py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <Reveal>
            <h2 className="font-display text-[clamp(1.625rem,2vw+0.5rem,2.25rem)] leading-[1.15] text-noir mb-7">
              {intro.title || introDefaults.title}
            </h2>
            <p className="font-display text-xl leading-[1.5] text-noir mb-6">{leadParagraph}</p>
            <div className="space-y-5 text-noir/75 leading-relaxed max-w-[70ch]">
              {restParagraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Services — liste éditoriale */}
      {services.length > 0 && (
        <section className="py-20 lg:py-24 bg-beige">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <Reveal>
              <h2 className="font-display text-[clamp(1.625rem,2vw+0.5rem,2.25rem)] leading-[1.15] text-noir text-center mb-12">
                {servicesTitle}
              </h2>
            </Reveal>
            <ul className="grid md:grid-cols-2 gap-x-12 border-t border-noir/10 md:border-t-0">
              {services.map((s, i) => (
                <Reveal as="li" key={s.slug} delay={Math.min(i * 60, 240)} className="md:border-t md:border-noir/10 first:md:border-t md:[&:nth-child(2)]:border-t">
                  <Link
                    href={`/services/${s.slug}`}
                    className="group flex items-center justify-between gap-5 py-5 border-b border-noir/10 md:border-b-0 transition-colors duration-300 hover:text-vert-foret"
                  >
                    <div>
                      <h3 className="font-display text-lg text-noir group-hover:text-vert-foret transition-colors duration-300">{s.title}</h3>
                      {s.shortDescription && <p className="text-sm text-noir/65 leading-relaxed mt-1 max-w-md">{s.shortDescription.slice(0, 90)}</p>}
                    </div>
                    <ArrowIcon className="w-4 h-4 flex-shrink-0 text-noir/45 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-vert-foret" />
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Pourquoi nous — quatre arguments au filet */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <h2 className="font-display text-[clamp(1.625rem,2vw+0.5rem,2.25rem)] leading-[1.15] text-noir text-center mb-14">
              {whyTitle}
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
            {why.map((item, i) => (
              <Reveal key={item.title} delay={(i % 2) * 100} className="border-t border-noir/10 pt-6">
                <h3 className="font-display text-xl text-noir mb-2.5">{item.title}</h3>
                <p className="text-[0.9375rem] text-noir/70 leading-relaxed max-w-[60ch]">{item.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Atelier + carte */}
      <section className="py-20 lg:py-24 bg-beige">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <h2 className="font-display text-[clamp(1.625rem,2vw+0.5rem,2.25rem)] leading-[1.15] text-noir mb-7">{atelier.title}</h2>
              <dl className="space-y-3.5 text-noir/75">
                <div className="flex gap-2">
                  <dt className="font-semibold text-noir">Adresse&nbsp;:</dt>
                  <dd>{atelier.address}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-semibold text-noir">Téléphone&nbsp;:</dt>
                  <dd><a href={`tel:${PHONE.replace(/\s/g, '')}`} className="text-vert-foret hover:underline">{PHONE}</a></dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-semibold text-noir">Email&nbsp;:</dt>
                  <dd><a href={`mailto:${EMAIL}`} className="text-vert-foret hover:underline">{EMAIL}</a></dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-semibold text-noir">Horaires&nbsp;:</dt>
                  <dd>Lun-Ven {HOURS.weekdays} — Sur rendez-vous</dd>
                </div>
              </dl>
              <div className="mt-8">
                <Link href="/contact" className="btn-primary">
                  Demander un devis gratuit
                  <ArrowIcon />
                </Link>
              </div>
            </Reveal>
            <Reveal variant="clip" delay={120}>
              <div className="rounded-xl overflow-hidden ring-1 ring-noir/10 aspect-[4/3]">
                <iframe
                  title={mapTitle}
                  src={mapSrc}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Zone d'intervention */}
      <section className="py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <Reveal>
            <h2 className="font-display text-[clamp(1.625rem,2vw+0.5rem,2.25rem)] leading-[1.15] text-noir text-center mb-6">{areasTitle}</h2>
            <p className="text-noir/70 text-center leading-relaxed mb-10 max-w-2xl mx-auto">{areasIntro}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {areas.map((city) => (
                <span key={city} className="text-sm font-medium bg-beige text-bois-fonce px-3.5 py-1.5 rounded-full">{city}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Other location */}
      <section className="py-10">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-noir/70">
            {otherLocation.question}{' '}
            <Link href={otherLocation.href} className="link-arrow !text-[0.9375rem]">
              {otherLocation.label}
              <ArrowIcon />
            </Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-vert-foret py-20 lg:py-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-white mb-5">{cta.title}</h2>
            <p className="text-white/85 mb-9 text-lg leading-relaxed">{cta.text}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-vert-foret font-semibold rounded-full hover:bg-beige transition-colors duration-200">
                Demander un devis gratuit
                <ArrowIcon />
              </Link>
              <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="btn-ghost-dark">
                Appeler&nbsp;: {PHONE}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
