import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { SITE_URL, buildPageMetadata } from '@/lib/seo';
import { getPageContent } from '@/lib/content';

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

      {/* Hero */}
      <section className="bg-noir text-white py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-bois-clair text-sm font-medium tracking-widest uppercase mb-3">{hero?.subtitle_top || 'Du projet à la réalisation'}</p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">{hero?.title || 'Notre processus'}</h1>
          <p className="text-white/60 text-lg max-w-2xl">{hero?.description || "Un accompagnement sur mesure, de la première idée à l'installation finale."}</p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex gap-6 pb-12 last:pb-0">
                {/* Line */}
                {i < steps.length - 1 && (
                  <div className="absolute left-[23px] top-12 w-0.5 h-[calc(100%-48px)] bg-beige" />
                )}
                {/* Number circle */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-vert-foret text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-vert-foret/20">
                  {step.num}
                </div>
                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-noir">{step.title}</h3>
                    <span className="text-xs font-medium text-bois-fonce bg-beige px-2.5 py-0.5 rounded-full">{step.delay}</span>
                  </div>
                  <p className="text-sm text-noir/60 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engagements */}
      <section className="py-20 bg-beige/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-noir text-center mb-12">{engagements.title || 'Nos engagements'}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {(engagements.items || DEFAULT_ENGAGEMENTS).map((e) => (
              <div key={e.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm text-center">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-vert-foret/10 text-vert-foret text-xl mb-4">{e.icon}</span>
                <h3 className="text-lg font-semibold text-noir mb-2">{e.title}</h3>
                <p className="text-sm text-noir/50">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-noir text-center mb-12">{faq.title || 'Questions fréquentes'}</h2>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <details key={i} className="group bg-white rounded-xl border border-gray-100 shadow-sm">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-sm font-medium text-noir hover:text-vert-foret transition-colors">
                  {item.question}
                  <svg className="w-4 h-4 text-noir/30 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-sm text-noir/60 leading-relaxed">{item.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
