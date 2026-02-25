'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_LINKS } from '@/lib/constants';
import { getDisplayName } from '@/lib/utils';

export function MobileMenu({ navLinks }: { navLinks?: { href: string; label: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, profile, logout } = useAuth();

  return (
    <div className="lg:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-beige/50 transition-colors"
        aria-label="Menu"
      >
        <div className="w-5 h-4 flex flex-col justify-between">
          <span className={`block h-0.5 w-full bg-noir transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block h-0.5 w-full bg-noir transition-opacity duration-300 ${isOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-full bg-noir transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </div>
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed top-16 right-0 w-72 h-[calc(100vh-4rem)] bg-white z-50 shadow-xl overflow-y-auto animate-slide-down">
            {/* Auth section */}
            {isAuthenticated && profile ? (
              <div className="p-4 bg-beige/30 border-b border-gray-100">
                <p className="text-sm font-semibold text-noir">{getDisplayName(profile)}</p>
                <p className="text-xs text-noir/50">{profile.email}</p>
              </div>
            ) : (
              <div className="p-4 border-b border-gray-100 flex gap-2">
                <Link href="/login" onClick={() => setIsOpen(false)} className="flex-1 text-center text-sm font-medium py-2 px-3 border border-vert-foret text-vert-foret rounded-lg hover:bg-vert-foret hover:text-white transition-colors">
                  Connexion
                </Link>
                <Link href="/register" onClick={() => setIsOpen(false)} className="flex-1 text-center text-sm font-medium py-2 px-3 bg-vert-foret text-white rounded-lg hover:bg-vert-foret-dark transition-colors">
                  Inscription
                </Link>
              </div>
            )}

            {/* Navigation links */}
            <nav className="py-2">
              {(navLinks || NAV_LINKS).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-6 py-3 text-sm font-medium text-noir/70 hover:bg-beige/50 hover:text-vert-foret transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* User links */}
            {isAuthenticated && (
              <div className="border-t border-gray-100 py-2">
                <Link href="/profil" onClick={() => setIsOpen(false)} className="block px-6 py-3 text-sm text-noir/70 hover:bg-beige/50 transition-colors">
                  Mon profil
                </Link>
                <Link href="/mes-projets" onClick={() => setIsOpen(false)} className="block px-6 py-3 text-sm text-noir/70 hover:bg-beige/50 transition-colors">
                  Mes projets
                </Link>
                <Link href="/mes-devis" onClick={() => setIsOpen(false)} className="block px-6 py-3 text-sm text-noir/70 hover:bg-beige/50 transition-colors">
                  Mes devis
                </Link>
                {profile?.role === 'admin' && (
                  <Link href="/admin" onClick={() => setIsOpen(false)} className="block px-6 py-3 text-sm text-vert-foret font-medium hover:bg-beige/50 transition-colors">
                    Administration
                  </Link>
                )}
                <button
                  onClick={() => { setIsOpen(false); logout(); }}
                  className="block w-full text-left px-6 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Se deconnecter
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
