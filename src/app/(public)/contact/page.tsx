export const revalidate = 300;

import type { Metadata } from 'next';
import { ContactForm } from './ContactForm';
import { getSettings, getAvisStats, getPageContent } from '@/lib/content';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, localBusinessCysoingJsonLd, localBusinessCalotterieJsonLd } from '@/lib/jsonld';
import { SITE_URL, buildPageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/motion/Reveal';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/contact', {
    title: 'Contact menuiserie Lille et Côte d\'Opale — Devis gratuit',
    description: 'Contactez Au Format pour un devis gratuit. Menuiserie sur mesure à Cysoing près de Lille et à La Calotterie près du Touquet-Paris-Plage. Tél : 07 88 91 60 68.',
    keywords: ['devis menuiserie gratuit', 'contact menuisier Lille', 'devis meuble sur mesure', 'menuiserie Cysoing contact'],
  });
}

const iconProps = {
  className: 'w-5 h-5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const PinIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
  </svg>
);

export default async function ContactPage() {
  const [settings, avisStats, sections] = await Promise.all([getSettings(), getAvisStats(), getPageContent('contact')]);

  const hero = (sections.find((s) => s.sectionKey === 'hero')?.content || {}) as Record<string, string>;

  const address = settings?.address && settings?.city ? `${settings.address}, ${settings.zipcode} ${settings.city}` : 'Region lilloise';
  const phone = settings?.phone || '06 00 00 00 00';
  const email = settings?.email || 'contact@auformat.fr';
  const hoursWeekdays = settings?.hoursWeekdays || 'Lun-Ven 8h-18h';

  const infos = [
    { icon: <PinIcon />, title: 'Atelier Cysoing', content: address, sub: 'Près de Lille (Nord) · Sur rendez-vous' },
    { icon: <PinIcon />, title: "Atelier Côte d'Opale", content: '1056 Rue de Montreuil, 62170 La Calotterie', sub: 'Près du Touquet (Pas-de-Calais) · Sur rendez-vous' },
    { icon: <PhoneIcon />, title: 'Téléphone', content: phone, sub: hoursWeekdays, href: `tel:${phone.replace(/\s/g, '')}` },
    { icon: <MailIcon />, title: 'Email', content: email, sub: 'Réponse sous 24h', href: `mailto:${email}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', url: SITE_URL },
        { name: 'Contact', url: `${SITE_URL}/contact` },
      ])} />
      <JsonLd data={localBusinessCysoingJsonLd(avisStats)} />
      <JsonLd data={localBusinessCalotterieJsonLd(avisStats)} />

      <PageHero
        kicker={hero.subtitle_top || 'Parlons de votre projet'}
        title={hero.title || 'Contactez-nous'}
        intro={hero.description || 'Devis gratuit et sans engagement. Réponse sous 24h.'}
      />

      {/* Content */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-14">
            {/* Form */}
            <Reveal className="lg:col-span-7">
              <h2 className="font-display text-2xl text-noir mb-8">Votre demande de devis</h2>
              <ContactForm />
            </Reveal>

            {/* Contact info — liste au filet */}
            <Reveal delay={120} className="lg:col-span-5">
              <div className="lg:pl-10 lg:border-l lg:border-noir/10">
                <h2 className="font-display text-2xl text-noir mb-6">Nos coordonnées</h2>
                <ul className="divide-y divide-noir/10">
                  {infos.map((info) => (
                    <li key={info.title} className="flex gap-4 py-5 first:pt-0">
                      <span className="flex-shrink-0 w-11 h-11 rounded-full bg-beige text-bois-fonce flex items-center justify-center">
                        {info.icon}
                      </span>
                      <div>
                        <p className="text-[0.9375rem] font-semibold text-noir">{info.title}</p>
                        {info.href ? (
                          <a href={info.href} className="text-[0.9375rem] text-noir/75 hover:text-vert-foret transition-colors">{info.content}</a>
                        ) : (
                          <p className="text-[0.9375rem] text-noir/75">{info.content}</p>
                        )}
                        <p className="text-sm text-noir/55 mt-0.5">{info.sub}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Quick actions */}
                <div className="mt-8 p-6 bg-beige rounded-xl">
                  <h3 className="font-display text-lg text-noir mb-4">Besoin d&apos;une réponse rapide&nbsp;?</h3>
                  <div className="flex flex-wrap gap-3">
                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn-secondary !py-2.5 !px-5 text-sm">
                      <PhoneIcon />
                      Appeler
                    </a>
                    <a
                      href={`https://wa.me/${phone.replace(/\s/g, '').replace(/^0/, '33')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary !py-2.5 !px-5 text-sm"
                    >
                      <ChatIcon />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
