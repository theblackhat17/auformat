import Link from 'next/link';
import { getSettings } from '@/lib/content';

export async function Footer() {
  const settings = await getSettings();

  const companyName = settings?.companyName || 'Au Format';
  const slogan = settings?.slogan || 'Franchissons ensemble, le pas vers le bois';
  const address = settings?.address && settings?.city ? `${settings.address}, ${settings.zipcode} ${settings.city}` : 'Region lilloise';
  const phone = settings?.phone || '06 00 00 00 00';
  const email = settings?.email || 'contact@auformat.fr';
  const hoursWeekdays = settings?.hoursWeekdays || '8h00 - 18h00';
  const hoursSaturday = settings?.hoursSaturday || 'Sur RDV';
  const hoursSunday = settings?.hoursSunday || 'Ferme';

  return (
    <footer className="bg-noir text-white/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Company */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">{companyName}</h3>
            <p className="text-sm leading-relaxed text-white/60">
              {slogan}. Menuiserie et agencement sur mesure pour particuliers et professionnels.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-bois-clair mt-0.5">&#x1F4CD;</span>
                <span>{address}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-bois-clair mt-0.5">&#x1F4DE;</span>
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-bois-clair transition-colors">{phone}</a>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-bois-clair mt-0.5">&#x2709;&#xFE0F;</span>
                <a href={`mailto:${email}`} className="hover:text-bois-clair transition-colors">{email}</a>
              </li>
            </ul>
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
              <li><Link href="/configurateur" className="hover:text-bois-clair transition-colors">Configurateur</Link></li>
              <li><Link href="/realisations" className="hover:text-bois-clair transition-colors">Realisations</Link></li>
              <li><Link href="/processus" className="hover:text-bois-clair transition-colors">Notre processus</Link></li>
              <li><Link href="/contact" className="hover:text-bois-clair transition-colors">Demander un devis</Link></li>
              <li><Link href="/about" className="hover:text-bois-clair transition-colors">A propos</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
          <p>&copy; {new Date().getFullYear()} {companyName}. Tous droits reserves.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white/60 transition-colors">Mentions legales</Link>
            <Link href="#" className="hover:text-white/60 transition-colors">Politique de confidentialite</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
