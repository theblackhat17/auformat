'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type ParallaxProps = {
  children: ReactNode;
  /** Amplitude du déplacement : 0.1 = 10 % du scroll. Rester ≤ 0.2 (« parallaxe légère »). */
  factor?: number;
  className?: string;
};

/**
 * Parallaxe légère pour les images de héros : l'enfant glisse doucement
 * pendant le scroll. Inactif sous prefers-reduced-motion.
 * L'enfant doit être légèrement surdimensionné (ex. scale-110) pour éviter les bords.
 */
export function Parallax({ children, factor = 0.12, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      el.style.transform = `translate3d(0, ${(-rect.top * factor).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [factor]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
