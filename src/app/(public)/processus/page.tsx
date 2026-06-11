export const revalidate = 300;

import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { SITE_URL, buildPageMetadata } from '@/lib/seo';
import { getPageContent } from '@/lib/content';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/motion/Reveal';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/processus', {
    title: 'Notre processus - De la conception à l\'installation',
    description: 'Découvrez les 6 étapes de votre projet de menuiserie sur mesure chez Au Format : premier contact, conception, devis gratuit, fabrication, installation et suivi.',
    keywords: ['processus menuiserie', 'étapes projet meuble sur mesure', 'fabrication meuble bois', 'devis gratuit menuiserie'],
  });
}

const DEFAULT_STEPS = [
  { num: '01', title: 'Premier contact', desc: 'Échangeons sur votre projet, vos envies et vos contraintes. Visite sur site gratuite.', delay: '1-2 jours' },
  { num: '02', title: 'Conception & Plans', desc: 'Réalisation de plans détaillés et visualisation 3D de votre projet.', delay: '5-10 jours' },
  { num: '03', title: 'Devis détaillé', desc: 'Un devis transparent et détaillé, poste par poste. Sans surprise.', delay: '2-3 jours' },
  { num: '04', title: 'Fabrication en atelier', desc: 'Réalisation de votre projet dans notre atelier avec des matériaux sélectionnés.', delay: '2-6 semaines' },
  { num: '05', title: 'Installation sur site', desc: 'Pose soignée par notre équipe. Nous veillons à la propreté du chantier.', delay: '1-5 jours' },
  { num: '06', title: 'Livraison & Suivi', desc: 'Réception des travaux et garantie 2 ans. Nous restons disponibles.', delay: 'Suivi 2 ans' },
];

const DEFAULT_ENGAGEMENTS = [
  { icon: '✓', title: 'Transparence', desc: 'Devis détaillé sans frais cachés. Le prix annoncé est le prix final.' },
  { icon: '⏱', title: 'Respect des délais', desc: 'Nous nous engageons sur un planning précis et le respectons.' },
  { icon: '🛡️', title: 'Garantie 2 ans', desc: "Tous nos travaux sont garantis 2 ans, pièces et main d'oeuvre." },
];

const DEFAULT_FAQ = [
  { question: 'Le devis est-il gratuit ?', answer: 'Oui, le devis est entièrement gratuit et sans engagement. Nous nous déplaçons sur site pour prendre les mesures et comprendre vos besoins.' },
  { question: 'Quel est le délai de réponse ?', answer: 'Nous répondons à toutes les demandes sous 24h maximum en jour ouvré.' },
  { question: "Quelle est votre zone d'intervention ?", answer: "Nous intervenons dans le Nord et le Pas-de-Calais grâce à nos deux ateliers : à Cysoing près de Lille (métropole lilloise, 50 km autour) et à La Calotterie près de Montreuil-sur-Mer et du Touquet-Paris-Plage (Côte d'Opale, 50 km autour)." },
  { question: 'Peut-on visiter votre atelier ?', answer: 'Absolument ! Nous recevons nos clients sur rendez-vous dans nos ateliers de Cysoing ou de La Calotterie pour vous montrer nos réalisations en cours et nos matériaux.' },
  { question: 'Quels sont les modes de paiement acceptés ?', answer: "Nous acceptons les virements bancaires, chèques et espèces. Un échéancier en 3 fois est possible pour les projets importants." },
];

/* Icônes d'engagement : trait 1.5, mappées depuis l'emoji stocké en base (jamais d'emoji à l'écran) */
function EngagementIcon({ icon }: { icon: string }) {
  const cls = 'w-6 h-6';
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (icon.includes('⏱') || icon.includes('🕐')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    );
  }
  if (icon.includes('🛡')) {
    return (
      <svg className={cls} viewBox="0 0 24 24" {...common}>
        <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" {...common}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default async function ProcessusPage() {
  const sections = await getPageContent('processus');

  const heroSection = sections.find((s) => s.sectionKey === 'hero');
  const stepsSection = sections.find((s) => s.sectionKey === 'steps');
  const engagementsSection = sections.find((s) => s.sectionKey === 'engagements');
  const faqSection = sections.find((s) => s.sectionKey === 'faq');

  const hero = heroSection?.content as { subtitle_top?: string; title?: string; description?: string } | undefined;
  const steps = (stepsSection?.content as { items?: { num: string; title: string; desc: string; delay: string }[] })?.items || DEFAULT_STEPS;
  const engagements = (engagementsSection?.content as { title?: string; items?: { icon: string; title: string; desc: string }[] }) || { title: 'Nos engagements', items: DEFAULT_ENGAGEMENTS };
  const faq = (faqSection?.content as { title?: string; items?: { question: string; answer: string }[] }) || { title: 'Questions fréquentes', items: DEFAULT_FAQ };

  const faqItems = faq.items || DEFAULT_FAQ;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', url: SITE_URL },
        { name: 'Notre processus', url: `${SITE_URL}/processus` },
      ])} />
      <JsonLd data={faqJsonLd(faqItems.map((f) => ({ question: f.question, answer: f.answer })))} />

      <PageHero
        kicker={hero?.subtitle_top || 'Du projet à la réalisation'}
        title={hero?.title || 'Notre processus'}
        intro={hero?.description || "Un accompagnement sur mesure, de la première idée à l'installation finale."}
      />

      {/* Timeline — une vraie séquence : les numéros portent l'information */}
      <section className="py-24 lg:py-28">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <ol>
            {steps.map((step, i) => (
              <Reveal as="li" key={step.num} delay={i * 60} className="relative grid grid-cols-[auto_1fr] gap-x-7 lg:gap-x-10 pb-14 last:pb-0">
                {/* Fil conducteur */}
                {i < steps.length - 1 && (
                  <span className="absolute left-[27px] lg:left-[34px] top-16 bottom-2 w-px bg-noir/12" aria-hidden="true" />
                )}
                <span className="font-display text-[2rem] lg:text-[2.5rem] leading-none text-vert-foret w-14 lg:w-[4.25rem] pt-1" aria-hidden="true">
                  {step.num}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2.5">
                    <h3 className="font-display text-xl lg:text-2xl text-noir">{step.title}</h3>
                    <span className="text-xs font-semibold text-bois-fonce bg-beige px-3 py-1 rounded-full">{step.delay}</span>
                  </div>
                  <p className="text-[0.9375rem] text-noir/70 leading-relaxed max-w-xl">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Engagements — trois colonnes au filet, pas de cartes */}
      <section className="py-20 lg:py-24 bg-beige">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir text-center mb-14">
              {engagements.title || 'Nos engagements'}
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-10 md:gap-0 md:divide-x md:divide-noir/10">
            {(engagements.items || DEFAULT_ENGAGEMENTS).map((e, i) => (
              <Reveal key={e.title} delay={i * 100} className="md:px-10 first:md:pl-0 last:md:pr-0 text-center md:text-left">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-vert-foret text-white mb-5">
                  <EngagementIcon icon={e.icon} />
                </span>
                <h3 className="font-display text-xl text-noir mb-2.5">{e.title}</h3>
                <p className="text-[0.9375rem] text-noir/70 leading-relaxed">{e.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — liste au filet, réponse aérée */}
      <section className="py-24 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <Reveal>
            <h2 className="font-display text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)] leading-[1.15] text-noir text-center mb-14">
              {faq.title || 'Questions fréquentes'}
            </h2>
          </Reveal>
          <div className="border-t border-noir/10">
            {faqItems.map((item, i) => (
              <Reveal key={i} delay={Math.min(i * 60, 240)}>
                <details className="group border-b border-noir/10">
                  <summary className="flex items-center justify-between gap-6 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-[1.0625rem] font-semibold text-noir hover:text-vert-foret transition-colors">
                    {item.question}
                    <svg className="w-4 h-4 flex-shrink-0 text-noir/40 group-open:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="pb-6 text-[0.9375rem] text-noir/70 leading-relaxed max-w-[65ch]">{item.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mt-12">
            <p className="text-noir/70 mb-4">Une autre question&nbsp;?</p>
            <Link href="/contact" className="btn-primary">Contactez-nous</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
