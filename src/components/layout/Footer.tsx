import Link from 'next/link';
import { getSettings } from '@/lib/content';

export async function Footer() {
  const settings = await getSettings();

  const companyName = settings?.companyName || 'Au Format';
  const slogan = settings?.slogan || 'Franchissons ensemble, le pas vers le bois';
  const phone = settings?.phone || '07 88 91 60 68';
  const email = settings?.email || 'contact@auformat.fr';
  const hoursWeekdays = settings?.hoursWeekdays || '8h - 18h';
  const hoursSaturday = settings?.hoursSaturday || 'Fermé';
  const hoursSunday = settings?.hoursSunday || 'Fermé';
  const instagram = settings?.instagram || 'https://www.instagram.com/auformat/';

  return (
    <footer className="bg-noir text-white/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Company */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold text-white mb-4">{companyName}</h3>
            <p className="text-sm leading-relaxed text-white/60">
              {slogan}. Menuiserie et agencement sur mesure pour particuliers et professionnels.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3 mt-4">
              <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-bois-clair transition-colors" aria-label="Instagram Au Format">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=100087409924806" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-bois-clair transition-colors" aria-label="Facebook Au Format">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            </div>
          </div>

          {/* Atelier Cysoing */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Atelier Cysoing</h4>
            <address className="not-italic space-y-2 text-sm text-white/60">
              <p>88 Imp. de la Briqueterie</p>
              <p>59830 Cysoing</p>
              <p className="text-white/40 text-xs">Près de Lille, Nord (59)</p>
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="block hover:text-bois-clair transition-colors">{phone}</a>
              <a href={`mailto:${email}`} className="block hover:text-bois-clair transition-colors">{email}</a>
            </address>
          </div>

          {/* Atelier Cote d'Opale */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Atelier Côte d&apos;Opale</h4>
            <address className="not-italic space-y-2 text-sm text-white/60">
              <p>1056 Rue de Montreuil</p>
              <p>62170 La Calotterie</p>
              <p className="text-white/40 text-xs">Près du Touquet, Pas-de-Calais (62)</p>
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="block hover:text-bois-clair transition-colors">{phone}</a>
              <a href={`mailto:${email}`} className="block hover:text-bois-clair transition-colors">{email}</a>
            </address>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Horaires</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-white/60">Lun - Ven</span>
                <span>{hoursWeekdays}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/60">Samedi</span>
                <span>{hoursSaturday}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-white/60">Dimanche</span>
                <span>{hoursSunday}</span>
              </li>
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Liens rapides</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/configurateur" className="hover:text-bois-clair transition-colors">Configurateur en ligne</Link></li>
              <li><Link href="/realisations" className="hover:text-bois-clair transition-colors">Nos réalisations</Link></li>
              <li><Link href="/materiaux" className="hover:text-bois-clair transition-colors">Essences de bois</Link></li>
              <li><Link href="/processus" className="hover:text-bois-clair transition-colors">Notre processus</Link></li>
              <li><Link href="/homemade" className="hover:text-bois-clair transition-colors">Savoir-faire</Link></li>
              <li><Link href="/avis" className="hover:text-bois-clair transition-colors">Avis clients</Link></li>
              <li><Link href="/contact" className="hover:text-bois-clair transition-colors">Demander un devis</Link></li>
              <li><Link href="/about" className="hover:text-bois-clair transition-colors">À propos</Link></li>
            </ul>
          </div>
        </div>

        {/* SEO text block */}
        <div className="mt-10 pt-8 border-t border-white/10">
          <p className="text-xs text-white/20 leading-relaxed max-w-5xl">
            Au Format, menuiserie et agencement sur mesure dans le Nord et le Pas-de-Calais. Fabrication artisanale de meubles, dressings, bibliothèques, cuisines, bureaux, plans de travail, étagères et escaliers en bois massif. Nos ateliers à Cysoing près de Lille et à La Calotterie près de Montreuil-sur-Mer et du Touquet-Paris-Plage réalisent vos projets sur mesure pour particuliers et professionnels. Ébénisterie, agencement intérieur, menuiserie traditionnelle et numérique. Essences de bois nobles : chêne, noyer, hêtre, frêne. Devis gratuit dans la métropole lilloise, la Côte d&apos;Opale et les Hauts-de-France.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <p>&copy; {new Date().getFullYear()} {companyName}. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white/60 transition-colors">Mentions légales</Link>
            <Link href="#" className="hover:text-white/60 transition-colors">Politique de confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
