import Link from 'next/link';
import Image from 'next/image';
import { NAV_LINKS } from '@/lib/constants';
import { UserDropdown } from './UserDropdown';
import { MobileMenu } from './MobileMenu';

export function Header() {
  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
      <nav className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-18 lg:h-22">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/img/logo_tmp.png"
              alt="Au Format - Menuiserie sur mesure Cysoing Lille Montreuil Le Touquet"
              width={200}
              height={65}
              className="h-12 lg:h-16 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-noir/80 hover:text-vert-foret transition-colors duration-200 relative after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[2px] after:bg-vert-foret after:transition-all after:duration-300 hover:after:w-full"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* User area + Mobile toggle */}
          <div className="flex items-center gap-4">
            <UserDropdown />
            <MobileMenu />
          </div>
        </div>
      </nav>
    </header>
  );
}
