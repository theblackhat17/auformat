'use client';

import { useEffect, useRef, useState } from 'react';

type AnimatedCounterProps = {
  /** Valeur affichée, ex. "250+", "15 ans", "98 %" — la partie numérique est animée. */
  value: string;
  className?: string;
  durationMs?: number;
};

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Compteur qui monte jusqu'à sa valeur quand il entre dans le viewport.
 * SSR et reduced-motion affichent directement la valeur finale.
 */
export function AnimatedCounter({ value, className, durationMs = 1400 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const match = value.match(/^([^0-9]*)([0-9][0-9\s.,]*)(.*)$/);
    if (!match) return;
    const [, prefix, numRaw, suffix] = match;
    const target = parseFloat(numRaw.replace(/\s/g, '').replace(',', '.'));
    if (!isFinite(target)) return;
    const decimals = /[.,]\d/.test(numRaw.trim()) ? 1 : 0;

    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / durationMs, 1);
          const current = target * easeOutQuart(t);
          setDisplay(`${prefix}${current.toFixed(decimals).replace('.', ',')}${suffix}`);
          if (t < 1) frame = requestAnimationFrame(tick);
          else setDisplay(value);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display}
    </span>
  );
}
