import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getArticles, getBlogCategoriesWithCount, getPageContent } from '@/lib/content';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import type { Article } from '@/lib/types';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/blog', {
    title: 'Le Blog - Conseils & Inspirations | Au Format',
    description: 'Conseils, inspirations et savoir-faire de notre menuiserie : choix du bois, entretien, tendances. Articles d\'artisan menuisier dans le Nord et le Pas-de-Calais.',
    keywords: ['blog menuiserie', 'conseils bois', 'inspirations menuiserie', 'savoir-faire bois', 'menuiserie Nord'],
  });
}

function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function BlogIndexPage() {
  const [articles, categories, sections] = await Promise.all([
    getArticles(),
    getBlogCategoriesWithCount(),
    getPageContent('blog'),
  ]);

  const hero = (sections.find((s) => s.sectionKey === 'hero')?.content || {}) as Record<string, string>;

  const featured = articles[0];
  const latest = articles.slice(1, 7);

  // Group articles by category slug for the per-category sections
  const byCategory: Record<string, Article[]> = {};
  for (const a of articles) {
    if (!a.categorySlug) continue;
    if (!byCategory[a.categorySlug]) byCategory[a.categorySlug] = [];
    byCategory[a.categorySlug].push(a);
  }

  return (
    <>
      <JsonLd data={[
        breadcrumbJsonLd([
          { name: 'Accueil', url: SITE_URL },
          { name: 'Blog', url: `${SITE_URL}/blog` },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'Blog',
          '@id': `${SITE_URL}/blog#blog`,
          name: 'Le Blog Au Format',
          description: 'Conseils, inspirations et savoir-faire de notre menuiserie',
          url: `${SITE_URL}/blog`,
          publisher: { '@id': `${SITE_URL}/#organization` },
          ...(articles.length > 0 ? {
            blogPost: articles.slice(0, 10).map((a) => ({
              '@type': 'BlogPosting',
              headline: a.title,
              url: `${SITE_URL}/blog/${a.slug}`,
              datePublished: a.publishedAt || a.createdAt,
              ...(a.excerpt ? { description: a.excerpt } : {}),
            })),
          } : {}),
        },
      ]} />

      <div className="bg-white">
        {/* Editorial header */}
        <section className="relative pt-28 lg:pt-36 pb-16 lg:pb-20 bg-beige/40 overflow-hidden">
          <div className="absolute top-32 right-6 lg:right-10 hidden lg:block pointer-events-none">
            <span
              className="text-[10px] tracking-[0.4em] text-noir/30 uppercase font-medium"
              style={{ writingMode: 'vertical-rl' }}
            >
              Au Format · Le Journal · MMXXVI
            </span>
          </div>

          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            }}
          />

          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
            <div className="flex items-center gap-3 mb-8 lg:mb-12">
              <span className="h-px w-12 bg-bois-clair" />
              <span className="text-[10px] tracking-[0.4em] text-bois-fonce uppercase font-medium">
                {hero.kicker || 'Journal · N° 01'}
              </span>
              <span className="h-px flex-1 bg-noir/10" />
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-[5.5rem] text-noir leading-[0.95] tracking-[-0.01em] mb-8">
              {hero.title_prefix || 'Le'} <em className="italic text-vert-foret">{hero.title_accent || 'Journal'}</em>
            </h1>

            <div className="grid lg:grid-cols-12 gap-6 items-end">
              <p className="lg:col-span-7 text-lg md:text-xl text-noir/65 leading-relaxed font-light max-w-2xl">
                {hero.description || "Conseils, inspirations & savoir-faire d'un atelier passionné par le bois, le geste juste et les pièces qui traversent les générations."}
              </p>
              <div className="lg:col-span-5 lg:text-right">
                <span className="text-[10px] tracking-[0.3em] text-noir/40 uppercase font-medium">
                  {articles.length} article{articles.length > 1 ? 's' : ''} publié{articles.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Category tiles */}
        {categories.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-14 lg:pt-20 pb-10 lg:pb-14">
            <div className="flex items-baseline gap-4 mb-7 lg:mb-9">
              <span className="h-px w-10 bg-bois-fonce" />
              <span className="text-xs md:text-[13px] tracking-[0.28em] text-noir uppercase font-bold">
                Explorez par thème
              </span>
              <span className="h-px flex-1 bg-noir/15" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 md:gap-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/blog/categorie/${c.slug}`}
                  className="group relative bg-beige/50 hover:bg-beige transition-all duration-300 border border-noir/5 hover:border-bois-clair/50 flex items-center gap-3 px-3.5 py-3"
                >
                  <span className="text-2xl leading-none transition-transform duration-300 group-hover:scale-110">
                    {c.icon || '·'}
                  </span>

                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[13px] md:text-sm font-semibold text-noir tracking-[-0.005em] leading-tight truncate">
                      {c.label}
                    </span>
                    <span className="text-[10px] tracking-[0.2em] text-noir/55 uppercase font-medium mt-0.5">
                      {c.articleCount} article{c.articleCount > 1 ? 's' : ''}
                    </span>
                  </span>

                  <span className="text-noir/30 group-hover:text-vert-foret group-hover:translate-x-0.5 transition-all duration-300 text-xs">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {articles.length === 0 && (
          <section className="max-w-3xl mx-auto px-6 lg:px-8 py-24 lg:py-32 text-center">
            <p className="text-4xl md:text-5xl text-noir/30 italic mb-6 font-light">
              Le journal est en préparation.
            </p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="h-px w-12 bg-bois-clair" />
              <span className="text-[10px] tracking-[0.3em] text-bois-fonce uppercase">À paraître</span>
              <span className="h-px w-12 bg-bois-clair" />
            </div>
            <p className="text-noir/55 font-light text-lg">
              Revenez bientôt pour découvrir nos premiers articles.
            </p>
          </section>
        )}

        {/* Featured article */}
        {featured && (
          <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-8 lg:pt-12 pb-16 lg:pb-24">
            <div className="flex items-baseline gap-4 mb-10 lg:mb-14">
              <span className="h-px w-10 bg-bois-fonce" />
              <span className="text-xs md:text-[13px] tracking-[0.28em] text-noir uppercase font-bold">
                À la une
              </span>
              <span className="h-px flex-1 bg-noir/15" />
            </div>

            <Link
              href={`/blog/${featured.slug}`}
              className="group grid lg:grid-cols-12 gap-8 lg:gap-16 items-center"
            >
              <div className="lg:col-span-7 relative aspect-[5/4] overflow-hidden bg-beige order-1 lg:order-2">
                {featured.coverImage ? (
                  <Image
                    src={featured.coverImage}
                    alt={featured.title}
                    fill
                    className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.04]"
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-bois-clair/30 via-beige to-bois-fonce/20" />
                )}
                <div className="absolute top-5 left-5">
                  <span className="text-[10px] tracking-[0.4em] text-noir uppercase font-medium bg-white/95 backdrop-blur px-3.5 py-2">
                    N° 01
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 order-2 lg:order-1">
                {featured.categoryLabel && (
                  <div className="mb-5 flex items-center gap-3">
                    <span className="h-px w-6 bg-bois-clair" />
                    <span className="text-[11px] tracking-[0.3em] text-bois-fonce uppercase font-medium inline-flex items-center gap-2">
                      {featured.categoryIcon && <span className="opacity-80">{featured.categoryIcon}</span>}
                      <span>{featured.categoryLabel}</span>
                    </span>
                  </div>
                )}

                <h2 className="font-display text-3xl md:text-4xl lg:text-[2.75rem] text-noir leading-[1.1] mb-6 group-hover:text-vert-foret transition-colors duration-500">
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p className="text-lg text-noir/65 leading-[1.65] mb-8 font-light">
                    {featured.excerpt}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 mb-8">
                  <span className="inline-flex items-center gap-2 text-sm text-noir/70 bg-beige/60 px-3 py-1.5">
                    <svg className="w-3.5 h-3.5 text-bois-fonce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDateLong(featured.publishedAt || featured.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm text-noir/70 bg-beige/60 px-3 py-1.5">
                    <svg className="w-3.5 h-3.5 text-bois-fonce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {featured.readingTime} min de lecture
                  </span>
                </div>

                <div className="inline-flex items-center gap-3 text-sm text-noir border-b border-bois-clair pb-1 group-hover:border-vert-foret group-hover:text-vert-foret transition-colors">
                  <span>Lire l&apos;article</span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Latest articles grid */}
        {latest.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-20 lg:pb-28">
            <div className="flex items-baseline gap-4 mb-10 lg:mb-14">
              <span className="h-px w-10 bg-bois-fonce" />
              <span className="text-xs md:text-[13px] tracking-[0.28em] text-noir uppercase font-bold">
                Derniers articles
              </span>
              <span className="h-px flex-1 bg-noir/15" />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-14 lg:gap-y-20">
              {latest.map((article, idx) => (
                <Link
                  key={article.id}
                  href={`/blog/${article.slug}`}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-beige mb-5 lg:mb-6">
                    {article.coverImage ? (
                      <Image
                        src={article.coverImage}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.05]"
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-bois-clair/20 via-beige to-bois-fonce/15" />
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="text-[10px] tracking-[0.35em] text-noir uppercase font-medium bg-white/95 backdrop-blur px-3 py-1.5">
                        N° {String(idx + 2).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {article.categoryLabel && (
                    <div className="mb-3">
                      <span className="text-[10px] tracking-[0.3em] text-bois-fonce uppercase font-medium inline-flex items-center gap-2">
                        {article.categoryIcon && <span className="opacity-80">{article.categoryIcon}</span>}
                        <span>{article.categoryLabel}</span>
                      </span>
                    </div>
                  )}

                  <h3 className="font-display text-xl lg:text-[1.375rem] text-noir leading-[1.2] mb-3 group-hover:text-vert-foret transition-colors duration-500">
                    {article.title}
                  </h3>

                  {article.excerpt && (
                    <p className="text-[15px] text-noir/60 leading-[1.6] line-clamp-2 mb-5 font-light flex-1">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-noir/10">
                    <div className="flex items-center gap-3 text-[13px] text-noir/55">
                      <span>{formatDateLong(article.publishedAt || article.createdAt)}</span>
                      <span className="h-px w-3 bg-noir/20" />
                      <span>{article.readingTime} min</span>
                    </div>
                    <span className="text-noir/30 group-hover:text-vert-foret group-hover:translate-x-1 transition-all duration-300 text-sm">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Per-category sections */}
        {categories.length > 0 && (
          <div className="bg-beige/30 border-t border-noir/5">
            {categories.map((c) => {
              const items = (byCategory[c.slug] || []).slice(0, 3);
              if (items.length === 0) return null;

              return (
                <section key={c.id} className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24 border-b border-noir/5 last:border-b-0">
                  <div className="flex flex-wrap items-end justify-between gap-4 mb-10 lg:mb-14">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl md:text-4xl">{c.icon}</span>
                      <div>
                        <h2 className="text-2xl md:text-3xl font-semibold text-noir tracking-[-0.015em]">
                          {c.label}
                        </h2>
                        <p className="text-[11px] tracking-[0.25em] text-noir/65 uppercase font-semibold mt-1">
                          {c.articleCount} article{c.articleCount > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/blog/categorie/${c.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-noir border-b-2 border-bois-clair pb-0.5 hover:border-vert-foret hover:text-vert-foret transition-colors group"
                    >
                      <span>Voir tout</span>
                      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </Link>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-10 gap-y-10">
                    {items.map((article) => (
                      <Link
                        key={article.id}
                        href={`/blog/${article.slug}`}
                        className="group flex gap-4 sm:flex-col sm:gap-0"
                      >
                        <div className="relative w-28 h-28 sm:w-full sm:h-auto sm:aspect-[4/3] shrink-0 overflow-hidden bg-white sm:mb-5">
                          {article.coverImage ? (
                            <Image
                              src={article.coverImage}
                              alt={article.title}
                              fill
                              className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.05]"
                              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 112px"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-bois-clair/20 via-beige to-bois-fonce/15" />
                          )}
                        </div>

                        <div className="flex flex-col flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-light text-noir leading-[1.25] tracking-[-0.005em] mb-2 group-hover:text-vert-foret transition-colors duration-500 line-clamp-2">
                            {article.title}
                          </h3>
                          {article.excerpt && (
                            <p className="hidden sm:block text-sm text-noir/55 leading-[1.5] line-clamp-2 font-light mb-3">
                              {article.excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[12px] text-noir/50 mt-auto">
                            <span>{formatDateLong(article.publishedAt || article.createdAt)}</span>
                            <span className="h-px w-3 bg-noir/20" />
                            <span>{article.readingTime} min</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Editorial footer note */}
        {articles.length > 0 && (
          <section className="border-t border-noir/10 py-16 lg:py-20 bg-white">
            <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="h-px w-12 bg-bois-clair" />
                <span className="text-[10px] tracking-[0.4em] text-bois-fonce uppercase">Atelier</span>
                <span className="h-px w-12 bg-bois-clair" />
              </div>
              <p className="text-2xl md:text-3xl text-noir font-light italic leading-snug mb-8">
                Un projet de menuiserie sur mesure&nbsp;?
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 text-sm text-noir border-b border-bois-clair pb-1 hover:border-vert-foret hover:text-vert-foret transition-colors"
              >
                <span>Discutons-en</span>
                <span>→</span>
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
