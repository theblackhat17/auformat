export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { ContactForm } from './ContactForm';
import { getSettings } from '@/lib/content';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, localBusinessCysoingJsonLd, localBusinessCalotterieJsonLd } from '@/lib/jsonld';
import { SITE_URL, buildPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/contact', {
    title: 'Contact - Devis gratuit menuiserie sur mesure',
    description: 'Contactez Au Format pour un devis gratuit. Menuiserie sur mesure a Cysoing pres de Lille et a La Calotterie pres du Touquet-Paris-Plage. Tel : 07 88 91 60 68.',
    keywords: ['devis menuiserie gratuit', 'contact menuisier Lille', 'devis meuble sur mesure', 'menuiserie Cysoing contact'],
  });
}

export default async function ContactPage() {
  const settings = await getSettings();

  const address = settings?.address && settings?.city ? `${settings.address}, ${settings.zipcode} ${settings.city}` : 'Region lilloise';
  const phone = settings?.phone || '06 00 00 00 00';
  const email = settings?.email || 'contact@auformat.fr';
  const hoursWeekdays = settings?.hoursWeekdays || 'Lun-Ven 8h-18h';

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', url: SITE_URL },
        { name: 'Contact', url: `${SITE_URL}/contact` },
      ])} />
      <JsonLd data={localBusinessCysoingJsonLd()} />
      <JsonLd data={localBusinessCalotterieJsonLd()} />

      {/* Hero */}
      <section className="bg-noir text-white py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-bois-clair text-sm font-medium tracking-widest uppercase mb-3">Parlons de votre projet</p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Contactez-nous</h1>
          <p className="text-white/60 text-lg max-w-2xl">Devis gratuit et sans engagement. Reponse sous 24h.</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <ContactForm />
            </div>

            {/* Contact info */}
            <div className="space-y-6">
              {[
                { icon: '📍', title: 'Atelier Cysoing', content: address, sub: 'Pres de Lille (Nord) · Sur rendez-vous' },
                { icon: '📍', title: 'Atelier Cote d\'Opale', content: '1056 Rue de Montreuil, 62170 La Calotterie', sub: 'Pres du Touquet (Pas-de-Calais) · Sur rendez-vous' },
                { icon: '📞', title: 'Telephone', content: phone, sub: hoursWeekdays },
                { icon: '✉️', title: 'Email', content: email, sub: 'Reponse sous 24h' },
              ].map((info) => (
                <div key={info.title} className="flex gap-4 p-4 bg-beige/50 rounded-xl">
                  <span className="text-2xl flex-shrink-0">{info.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-noir">{info.title}</p>
                    <p className="text-sm text-noir/70">{info.content}</p>
                    <p className="text-xs text-noir/40 mt-0.5">{info.sub}</p>
                  </div>
                </div>
              ))}

              {/* Quick actions */}
              <div className="p-6 bg-vert-foret/5 rounded-xl border border-vert-foret/10">
                <h3 className="text-sm font-semibold text-noir mb-3">Besoin d&apos;une reponse rapide ?</h3>
                <div className="space-y-2">
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-sm text-vert-foret hover:underline">
                    📞 Appeler directement
                  </a>
                  <a href={`https://wa.me/${phone.replace(/\s/g, '').replace(/^0/, '33')}`} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-vert-foret hover:underline">
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
