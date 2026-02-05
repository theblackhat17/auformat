import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { SITE_URL, buildPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/processus', {
    title: 'Notre processus - De la conception a l\'installation',
    description: 'Decouvrez les 6 etapes de votre projet de menuiserie sur mesure chez Au Format : premier contact, conception, devis gratuit, fabrication, installation et suivi.',
    keywords: ['processus menuiserie', 'etapes projet meuble sur mesure', 'fabrication meuble bois', 'devis gratuit menuiserie'],
  });
}

const STEPS = [
  { num: '01', title: 'Premier contact', desc: 'Echangeons sur votre projet, vos envies et vos contraintes. Visite sur site gratuite.', delay: '1-2 jours' },
  { num: '02', title: 'Conception & Plans', desc: 'Realisation de plans detailles et visualisation 3D de votre projet.', delay: '5-10 jours' },
  { num: '03', title: 'Devis detaille', desc: 'Un devis transparent et detaille, poste par poste. Sans surprise.', delay: '2-3 jours' },
  { num: '04', title: 'Fabrication en atelier', desc: 'Realisation de votre projet dans notre atelier avec des materiaux selectionnes.', delay: '2-6 semaines' },
  { num: '05', title: 'Installation sur site', desc: 'Pose soignee par notre equipe. Nous veillons a la proprete du chantier.', delay: '1-5 jours' },
  { num: '06', title: 'Livraison & Suivi', desc: 'Reception des travaux et garantie 2 ans. Nous restons disponibles.', delay: 'Suivi 2 ans' },
];

const FAQ = [
  { q: 'Le devis est-il gratuit ?', a: 'Oui, le devis est entierement gratuit et sans engagement. Nous nous deplacons sur site pour prendre les mesures et comprendre vos besoins.' },
  { q: 'Quel est le delai de reponse ?', a: 'Nous repondons a toutes les demandes sous 24h maximum en jour ouvre.' },
  { q: "Quelle est votre zone d'intervention ?", a: 'Nous intervenons dans le Nord et le Pas-de-Calais grace a nos deux ateliers : a Cysoing pres de Lille (metropole lilloise, 50 km autour) et a La Calotterie pres de Montreuil-sur-Mer et du Touquet-Paris-Plage (Cote d\'Opale, 50 km autour).' },
  { q: 'Peut-on visiter votre atelier ?', a: 'Absolument ! Nous recevons nos clients sur rendez-vous dans nos ateliers de Cysoing ou de La Calotterie pour vous montrer nos realisations en cours et nos materiaux.' },
  { q: 'Quels sont les modes de paiement acceptes ?', a: "Nous acceptons les virements bancaires, cheques et especes. Un echeancier en 3 fois est possible pour les projets importants." },
];

export default function ProcessusPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', url: SITE_URL },
        { name: 'Notre processus', url: `${SITE_URL}/processus` },
      ])} />
      <JsonLd data={faqJsonLd(FAQ.map((f) => ({ question: f.q, answer: f.a })))} />

      {/* Hero */}
      <section className="bg-noir text-white py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-bois-clair text-sm font-medium tracking-widest uppercase mb-3">Du projet a la realisation</p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Notre processus</h1>
          <p className="text-white/60 text-lg max-w-2xl">Un accompagnement sur mesure, de la premiere idee a l&apos;installation finale.</p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative flex gap-6 pb-12 last:pb-0">
                {/* Line */}
                {i < STEPS.length - 1 && (
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
          <h2 className="text-2xl font-bold text-noir text-center mb-12">Nos engagements</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '✓', title: 'Transparence', desc: 'Devis detaille sans frais caches. Le prix annonce est le prix final.' },
              { icon: '⏱', title: 'Respect des delais', desc: 'Nous nous engageons sur un planning precis et le respectons.' },
              { icon: '🛡️', title: 'Garantie 2 ans', desc: "Tous nos travaux sont garantis 2 ans, pieces et main d'oeuvre." },
            ].map((e) => (
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
          <h2 className="text-2xl font-bold text-noir text-center mb-12">Questions frequentes</h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details key={i} className="group bg-white rounded-xl border border-gray-100 shadow-sm">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-sm font-medium text-noir hover:text-vert-foret transition-colors">
                  {item.q}
                  <svg className="w-4 h-4 text-noir/30 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-4 text-sm text-noir/60 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
