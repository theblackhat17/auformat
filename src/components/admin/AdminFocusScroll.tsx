'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Après une navigation depuis la recherche admin (`?focus=<clé>`), fait défiler jusqu'à
 * l'élément `[data-focus="<clé>"]`, le met brièvement en surbrillance, ouvre les blocs
 * repliables (<details>) et prévient les composants React via un évènement `admin-focus`
 * (pour déplier un accordéon, ouvrir un module…).
 */
export function AdminFocusScroll() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus');

  useEffect(() => {
    if (!focus) return;
    let tries = 0;
    const attempt = () => {
      const el = document.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]`);
      // Prévient les composants (déplier un module, un onglet…)
      window.dispatchEvent(new CustomEvent('admin-focus', { detail: focus }));
      if (!el) {
        if (tries++ < 20) setTimeout(attempt, 100); // attend le rendu (onglet, données…)
        return;
      }
      // Ouvre les <details> parents si repliés
      let node: HTMLElement | null = el;
      while (node) {
        if (node instanceof HTMLDetailsElement) node.open = true;
        node = node.parentElement;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash de surbrillance
      try {
        el.animate(
          [
            { boxShadow: '0 0 0 3px rgba(44,95,45,0.55)' },
            { boxShadow: '0 0 0 3px rgba(44,95,45,0)' },
          ],
          { duration: 1800, easing: 'ease-out' }
        );
      } catch { /* Web Animations indisponible : on ignore */ }
    };
    const t = setTimeout(attempt, 250);
    return () => clearTimeout(t);
  }, [focus, pathname]);

  return null;
}
