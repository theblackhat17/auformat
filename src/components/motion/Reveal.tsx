'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  /** 'rise' : fondu + translation vers le haut · 'clip' : découverte d'image par clip-path */
  variant?: 'rise' | 'clip';
  /** Décalage en ms (stagger de liste : index * 80) */
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li' | 'span' | 'figure';
};

/**
 * Apparition au scroll, conforme à « la Règle du Fil » :
 * - le contenu est visible par défaut (SSR, no-JS, crawlers, reduced-motion) ;
 * - l'état caché n'est posé qu'au montage, et seulement si l'élément est hors viewport,
 *   donc jamais de section blanche ni de flash au-dessus de la ligne de flottaison.
 */
export function Reveal({ children, variant = 'rise', delay = 0, className, as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = el.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewport) return;

    el.setAttribute('data-reveal-ready', '');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute('data-reveal-visible', '');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      data-reveal={variant}
      className={className}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
