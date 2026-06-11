import Link from 'next/link';
import Image from 'next/image';
import { NAV_LINKS } from '@/lib/constants';
import { getSettings } from '@/lib/content';
import { UserDropdown } from './UserDropdown';
import { MobileMenu } from './MobileMenu';
import { DesktopNav } from './DesktopNav';
import { HeaderChrome } from './HeaderChrome';

const ATELIER_HREFS = ['/menuiserie-lille', '/menuiserie-le-touquet'];

export async function Header() {
  const settings = await getSettings();
  const configurateurEnabled = settings?.configurateurEnabled ?? false;
  const navLinks = configurateurEnabled
    ? NAV_LINKS
    : NAV_LINKS.filter((l) => l.href !== '/configurateur');

  // Desktop : ateliers regroupés en menu déroulant, « Contact » devient le CTA bouton.
  const ateliers = navLinks.filter((l) => ATELIER_HREFS.includes(l.href));
  const desktopLinks = navLinks.filter((l) => !ATELIER_HREFS.includes(l.href) && l.href !== '/contact');

  return (
    <HeaderChrome>
      <nav className="max-w-7xl mx-auto px-6 lg:px-8" aria-label="Navigation principale">
        <div className="flex justify-between items-center h-18 lg:h-22 gap-4 xl:gap-6">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0" aria-label="Au Format — accueil">
            <Image
              src="/img/logo_tmp.png"
              alt="Au Format - Menuiserie sur mesure Cysoing Lille Montreuil Le Touquet"
              width={200}
              height={65}
              className="h-12 lg:h-14 xl:h-16 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <DesktopNav links={desktopLinks} ateliers={ateliers} />

          {/* CTA + User area + Mobile toggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/contact" className="btn-primary hidden lg:inline-flex !px-5 xl:!px-6 !py-2.5 text-sm whitespace-nowrap">
              <span className="xl:hidden">Devis</span>
              <span className="hidden xl:inline">Demander un devis</span>
            </Link>
            <UserDropdown />
            <MobileMenu navLinks={navLinks} />
          </div>
        </div>
      </nav>
    </HeaderChrome>
  );
}
