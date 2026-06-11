import Link from 'next/link';
import { getSettings, getPageContent } from '@/lib/content';

const DEFAULT_ADDRESSES = [
  { title: 'Atelier Cysoing', line1: '88 Imp. de la Briqueterie', line2: '59830 Cysoing', note: 'Près de Lille, Nord (59)' },
  { title: "Atelier Côte d'Opale", line1: '1056 Rue de Montreuil', line2: '62170 La Calotterie', note: 'Près du Touquet, Pas-de-Calais (62)' },
];

const DEFAULT_LINKS = [
  { label: 'Configurateur en ligne', href: '/configurateur' },
  { label: 'Nos réalisations', href: '/realisations' },
  { label: 'Essences de bois', href: '/materiaux' },
  { label: 'Notre processus', href: '/processus' },
  { label: 'Savoir-faire', href: '/savoir-faire' },
  { label: 'Le blog', href: '/blog' },
  { label: 'Avis clients', href: '/avis' },
  { label: 'Demander un devis', href: '/contact' },
  { label: 'À propos', href: '/about' },
];

const DEFAULT_SEO_TEXT = 'Au Format conçoit et fabrique du mobilier sur mesure depuis ses deux ateliers : à Cysoing près de Lille (Nord) et à La Calotterie près de Montreuil-sur-Mer (Pas-de-Calais). Nous accompagnons particuliers et professionnels dans leurs projets de menuiserie, ébénisterie et agencement intérieur, de la conception à la pose. Devis gratuit, intervention dans toute la région Hauts-de-France.';

const DEFAULT_SOCIALS = [
  { platform: 'instagram', url: 'https://www.instagram.com/auformat/' },
  { platform: 'facebook', url: 'https://www.facebook.com/profile.php?id=100087409924806' },
];

function SocialIcon({ platform }: { platform: string }) {
  if (platform === 'instagram') {
    return <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
  }
  if (platform === 'facebook') {
    return <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
  }
  return null;
}

export async function Footer() {
  const [settings, footerSections] = await Promise.all([
    getSettings(),
    getPageContent('footer'),
  ]);

  const companyName = settings?.companyName || 'Au Format';
  const slogan = settings?.slogan || 'Franchissons ensemble, le pas vers le bois';
  const phone = settings?.phone || '07 88 91 60 68';
  const email = settings?.email || 'contact@auformat.fr';
  const hoursWeekdays = settings?.hoursWeekdays || '8h - 18h';
  const hoursSaturday = settings?.hoursSaturday || 'Fermé';
  const hoursSunday = settings?.hoursSunday || 'Fermé';

  const getFooterSection = (key: string) => footerSections.find((s) => s.sectionKey === key)?.content;

  const addressesData = getFooterSection('addresses') as { items?: { title: string; line1: string; line2: string; note: string }[] } | undefined;
  const linksData = getFooterSection('links') as { items?: { label: string; href: string }[] } | undefined;
  const seoData = getFooterSection('seo_text') as { text?: string } | undefined;
  const socialsData = getFooterSection('socials') as { items?: { platform: string; url: string }[] } | undefined;

  const configurateurEnabled = settings?.configurateurEnabled ?? false;
  const addresses = addressesData?.items?.length ? addressesData.items : DEFAULT_ADDRESSES;
  const allLinks = linksData?.items?.length ? linksData.items : DEFAULT_LINKS;
  const links = configurateurEnabled ? allLinks : allLinks.filter((l) => l.href !== '/configurateur');
  const seoText = seoData?.text || DEFAULT_SEO_TEXT;
  const socials = socialsData?.items?.length ? socialsData.items : DEFAULT_SOCIALS;

  return (
    <footer className="bg-noir text-white/80">
      {/* Moment de marque : le slogan comme signature */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 lg:pt-20 pb-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 border-b border-white/10 pb-12">
          <p className="font-display text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.15] text-white max-w-2xl">
            {slogan.includes(',') ? (
              <>
                {slogan.split(',')[0]},<br />
                <span className="text-bois-clair">{slogan.split(',').slice(1).join(',').trim()}</span>
              </>
            ) : (
              slogan
            )}
          </p>
          <Link href="/contact" className="btn-on-dark flex-shrink-0 self-start lg:self-auto">
            Parlons de votre projet
          </Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-12 lg:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Company */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold text-white mb-4">{companyName}</h3>
            <p className="text-sm leading-relaxed text-white/80">
              Menuiserie et agencement sur mesure pour particuliers et professionnels.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3 mt-4">
              {socials.map((social) => (
                <a key={social.platform} href={social.url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-bois-clair transition-colors" aria-label={`${social.platform} Au Format`}>
                  <SocialIcon platform={social.platform} />
                </a>
              ))}
            </div>
          </div>

          {/* Addresses */}
          {addresses.map((addr) => (
            <div key={addr.title}>
              <h4 className="text-[0.9375rem] font-semibold text-white mb-4">{addr.title}</h4>
              <address className="not-italic space-y-2 text-sm text-white/80">
                <p>{addr.line1}</p>
                <p>{addr.line2}</p>
                <p className="text-white/60 text-xs">{addr.note}</p>
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="block hover:text-bois-clair transition-colors">{phone}</a>
                <a href={`mailto:${email}`} className="block hover:text-bois-clair transition-colors">{email}</a>
              </address>
            </div>
          ))}

          {/* Hours */}
          <div>
            <h4 className="text-[0.9375rem] font-semibold text-white mb-4">Horaires</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-white/80">Lun - Ven</span>
                <span>{hoursWeekdays}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/80">Samedi</span>
                <span>{hoursSaturday}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/80">Dimanche</span>
                <span>{hoursSunday}</span>
              </li>
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-[0.9375rem] font-semibold text-white mb-4">Liens rapides</h4>
            <ul className="space-y-2 text-sm">
              {links.map((link) => (
                <li key={link.href}><Link href={link.href} className="hover:text-bois-clair transition-colors">{link.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        {/* SEO text block */}
        <div className="mt-10 pt-8 border-t border-white/10">
          <p className="text-xs text-white/50 leading-relaxed max-w-5xl">
            {seoText}
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} {companyName}. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/mentions-legales" className="hover:text-white/80 transition-colors">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="hover:text-white/80 transition-colors">Confidentialité</Link>
            <Link href="/cgv" className="hover:text-white/80 transition-colors">CGV</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
