'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_LINKS } from '@/lib/constants';
import { getDisplayName } from '@/lib/utils';

export function MobileMenu({ navLinks }: { navLinks?: { href: string; label: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, profile, logout } = useAuth();

  // Verrouille le scroll de la page tant que le menu est ouvert
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const links = navLinks || NAV_LINKS;
  const stagger = (index: number) => ({ '--rise-delay': `${60 + index * 40}ms` }) as CSSProperties;

  return (
    <div className="lg:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-beige/60 transition-colors"
        aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={isOpen}
      >
        <div className="w-5 h-4 flex flex-col justify-between" aria-hidden="true">
          <span className={`block h-0.5 w-full bg-noir transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block h-0.5 w-full bg-noir transition-opacity duration-300 ${isOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-full bg-noir transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </div>
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-noir/40 z-40 animate-fade-in" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="fixed top-18 right-0 w-80 max-w-[calc(100vw-2rem)] h-[calc(100dvh-4.5rem)] bg-white z-50 shadow-[0_24px_64px_-16px_rgba(43,43,43,0.35)] overflow-y-auto flex flex-col">
            {/* Navigation links — apparition en cascade */}
            <nav className="py-4 flex-1" aria-label="Navigation mobile">
              {links.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  style={stagger(i)}
                  className="animate-hero-rise block px-7 py-3 text-[1.0625rem] font-semibold text-noir/80 hover:bg-beige/60 hover:text-vert-foret transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth section */}
            {isAuthenticated && profile ? (
              <div className="border-t border-noir/8">
                <div className="px-7 pt-4 pb-2">
                  <p className="text-sm font-semibold text-noir">{getDisplayName(profile)}</p>
                  <p className="text-xs text-noir/55">{profile.email}</p>
                </div>
                <div className="pb-3">
                  <Link href="/profil" onClick={() => setIsOpen(false)} className="block px-7 py-2.5 text-sm text-noir/70 hover:bg-beige/60 transition-colors">
                    Mon profil
                  </Link>
                  <Link href="/mes-projets" onClick={() => setIsOpen(false)} className="block px-7 py-2.5 text-sm text-noir/70 hover:bg-beige/60 transition-colors">
                    Mes projets
                  </Link>
                  {profile?.role === 'admin' && (
                    <Link href="/admin" onClick={() => setIsOpen(false)} className="block px-7 py-2.5 text-sm text-vert-foret font-semibold hover:bg-beige/60 transition-colors">
                      Administration
                    </Link>
                  )}
                  <button
                    onClick={() => { setIsOpen(false); logout(); }}
                    className="block w-full text-left px-7 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors"
                  >
                    Se déconnecter
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 border-t border-noir/8">
                <Link href="/login" onClick={() => setIsOpen(false)} className="btn-primary w-full !py-2.5 text-sm text-center">
                  Connexion
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
