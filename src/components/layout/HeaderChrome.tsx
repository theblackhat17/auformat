'use client';

import { useEffect, useState, type ReactNode } from 'react';

/** Enveloppe client du header : ombre uniquement une fois la page scrollée (« plat au repos »). */
export function HeaderChrome({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_1px_0_rgba(43,43,43,0.08),0_12px_32px_-24px_rgba(43,43,43,0.25)]' : 'shadow-none'
      }`}
    >
      {children}
    </header>
  );
}
