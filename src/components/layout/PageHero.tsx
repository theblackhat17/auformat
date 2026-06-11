import type { CSSProperties, ReactNode } from 'react';

type PageHeroProps = {
  /** Petit label au-dessus du titre (filet + bois clair, jamais en uppercase tracked) */
  kicker?: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
};

const rise = (delay: number) => ({ '--rise-delay': `${delay}ms` }) as CSSProperties;

/** Héros sombre des pages internes : Young Serif, entrée orchestrée, veine de bois en filigrane. */
export function PageHero({ kicker, title, intro, children }: PageHeroProps) {
  return (
    <section className="relative bg-noir text-white py-24 lg:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-noir via-noir to-bois-fonce/25" aria-hidden="true" />
      <div
        className="absolute -right-24 top-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full border border-bois-clair/10 hidden lg:block"
        aria-hidden="true"
      />
      <div
        className="absolute -right-24 top-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-bois-clair/15 hidden lg:block"
        aria-hidden="true"
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {kicker && (
          <p className="animate-hero-rise flex items-center gap-3 text-bois-clair font-medium text-[0.9375rem] mb-5" style={rise(60)}>
            <span className="h-px w-10 bg-bois-clair" aria-hidden="true" />
            {kicker}
          </p>
        )}
        <h1 className="animate-hero-rise font-display text-[clamp(2.25rem,3.5vw+1rem,3.5rem)] leading-[1.1] mb-5" style={rise(160)}>
          {title}
        </h1>
        {intro && (
          <p className="animate-hero-rise text-lg text-white/85 leading-relaxed max-w-2xl" style={rise(260)}>
            {intro}
          </p>
        )}
        {children && (
          <div className="animate-hero-rise mt-8" style={rise(360)}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
