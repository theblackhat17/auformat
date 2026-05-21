import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getArticles, getCategories } from '@/lib/content';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ cat?: string }>;
}

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

export default async function BlogIndexPage({ searchParams }: Props) {
  const { cat } = await searchParams;
  const [articles, categories] = await Promise.all([
    getArticles(),
    getCategories('blog'),
  ]);

  const filtered = cat
    ? articles.filter((a) => a.categorySlug === cat)
    : articles;

  const featured = filtered[0];
  const rest = filtered.slice(1);
  const activeCategoryLabel = cat
    ? categories.find((c) => c.slug === cat)?.label
    : null;

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
        <section className="relative pt-28 lg:pt-36 pb-16 lg:pb-24 bg-beige/40 overflow-hidden">
          {/* Decorative vertical text */}
          <div className="absolute top-32 right-6 lg:right-10 hidden lg:block pointer-events-none">
            <span
              className="text-[10px] tracking-[0.4em] text-noir/30 uppercase font-medium"
              style={{ writingMode: 'vertical-rl' }}
            >
              Au Format · Le Journal · MMXXVI
            </span>
          </div>

          {/* Subtle grain texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            }}
          />

          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
            {/* Editorial label */}
            <div className="flex items-center gap-3 mb-8 lg:mb-12">
              <span className="h-px w-12 bg-bois-clair" />
              <span className="text-[10px] tracking-[0.4em] text-bois-fonce uppercase font-medium">
                Journal · N° 01
              </span>
              <span className="h-px flex-1 bg-noir/10" />
            </div>

            {/* Big editorial title */}
            <h1
              className="text-5xl md:text-7xl lg:text-[8rem] font-light text-noir leading-[0.92] tracking-[-0.02em] mb-8"

            >
              Le{' '}
              <em
                className="italic font-normal text-vert-foret"

              >
                Journal
              </em>
            </h1>

            <div className="grid lg:grid-cols-12 gap-6 items-end">
              <p
                className="lg:col-span-7 text-lg md:text-xl text-noir/65 leading-relaxed font-light max-w-2xl"

              >
                Conseils, inspirations &amp; savoir-faire d&apos;un atelier passionné par le bois, le geste juste et les pièces qui traversent les générations.
              </p>
              <div className="lg:col-span-5 lg:text-right">
                <span
                  className="text-[10px] tracking-[0.3em] text-noir/40 uppercase font-medium"
                >
                  {articles.length} article{articles.length > 1 ? 's' : ''}
                  {activeCategoryLabel && (
                    <> · <span className="text-bois-fonce">{activeCategoryLabel}</span></>
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Category filter — sticky under header */}
        {categories.length > 0 && (
          <section className="border-y border-noir/10 bg-white/85 backdrop-blur-md sticky top-[72px] lg:top-[88px] z-30">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="flex items-center gap-1 overflow-x-auto py-3.5 scrollbar-hide">
                <Link
                  href="/blog"
                  className={`px-4 py-2 transition-all whitespace-nowrap text-sm relative ${
                    !cat ? 'text-noir' : 'text-noir/45 hover:text-noir'
                  }`}

                >
                  Toutes les catégories
                  {!cat && (
                    <span className="absolute -bottom-3.5 left-4 right-4 h-px bg-bois-clair" />
                  )}
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/blog?cat=${c.slug}`}
                    className={`px-4 py-2 transition-all whitespace-nowrap text-sm relative ${
                      cat === c.slug ? 'text-noir' : 'text-noir/45 hover:text-noir'
                    }`}

                  >
                    {c.icon && <span className="mr-2 opacity-70">{c.icon}</span>}
                    {c.label}
                    {cat === c.slug && (
                      <span className="absolute -bottom-3.5 left-4 right-4 h-px bg-bois-clair" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <section className="max-w-3xl mx-auto px-6 lg:px-8 py-32 lg:py-40 text-center">
            <p
              className="text-4xl md:text-5xl text-noir/30 italic mb-6 font-light"

            >
              Le journal est en préparation.
            </p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="h-px w-12 bg-bois-clair" />
              <span className="text-[10px] tracking-[0.3em] text-bois-fonce uppercase">À paraître</span>
              <span className="h-px w-12 bg-bois-clair" />
            </div>
            <p className="text-noir/55 font-light text-lg">
              {cat
                ? 'Aucun article dans cette catégorie pour le moment.'
                : 'Revenez bientôt pour découvrir nos premiers articles.'}
            </p>
            {cat && (
              <Link
                href="/blog"
                className="inline-block mt-8 text-sm text-vert-foret border-b border-bois-clair pb-1 hover:border-vert-foret transition-colors"

              >
                Voir tous les articles
              </Link>
            )}
          </section>
        )}

        {/* Featured article */}
        {featured && (
          <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 lg:pt-24 pb-12 lg:pb-16">
            <div className="flex items-baseline gap-4 mb-10 lg:mb-14">
              <span className="h-px w-12 bg-bois-clair" />
              <span className="text-[10px] tracking-[0.4em] text-bois-fonce uppercase font-medium">
                À la une
              </span>
              <span className="h-px flex-1 bg-noir/10" />
            </div>

            <Link
              href={`/blog/${featured.slug}`}
              className="group grid lg:grid-cols-12 gap-8 lg:gap-16 items-center"
            >
              <div className="lg:col-span-7 relative aspect-[5/4] lg:aspect-[5/4] overflow-hidden bg-beige order-1 lg:order-2">
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

                <h2
                  className="text-3xl md:text-4xl lg:text-5xl font-light text-noir leading-[1.05] tracking-[-0.01em] mb-6 group-hover:text-vert-foret transition-colors duration-500"

                >
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p
                    className="text-lg text-noir/65 leading-[1.65] mb-8 font-light"

                  >
                    {featured.excerpt}
                  </p>
                )}

                <div className="flex items-center gap-4 text-[11px] tracking-[0.2em] text-noir/45 uppercase mb-8">
                  <span>{formatDateLong(featured.publishedAt || featured.createdAt)}</span>
                  <span className="h-px w-6 bg-noir/20" />
                  <span>{featured.readingTime} min de lecture</span>
                </div>

                <div className="inline-flex items-center gap-3 text-sm text-noir border-b border-bois-clair pb-1 group-hover:border-vert-foret group-hover:text-vert-foret transition-colors">
                  <span>Lire l&apos;article</span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Article grid */}
        {rest.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-24 lg:pb-32">
            <div className="flex items-baseline gap-4 mb-10 lg:mb-14">
              <span className="h-px w-12 bg-bois-clair" />
              <span className="text-[10px] tracking-[0.4em] text-bois-fonce uppercase font-medium">
                Tous les articles
              </span>
              <span className="h-px flex-1 bg-noir/10" />
            </div>

            <div className="grid md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-16 lg:gap-y-24">
              {rest.map((article, idx) => (
                <Link
                  key={article.id}
                  href={`/blog/${article.slug}`}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-beige mb-6 lg:mb-8">
                    {article.coverImage ? (
                      <Image
                        src={article.coverImage}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.05]"
                        sizes="(min-width: 768px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-bois-clair/20 via-beige to-bois-fonce/15" />
                    )}
                    <div className="absolute top-5 left-5">
                      <span className="text-[10px] tracking-[0.4em] text-noir uppercase font-medium bg-white/95 backdrop-blur px-3 py-1.5">
                        N° {String(idx + 2).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {article.categoryLabel && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[10px] tracking-[0.3em] text-bois-fonce uppercase font-medium inline-flex items-center gap-2">
                        {article.categoryIcon && <span className="opacity-80">{article.categoryIcon}</span>}
                        <span>{article.categoryLabel}</span>
                      </span>
                    </div>
                  )}

                  <h3
                    className="text-2xl md:text-[1.75rem] font-light text-noir leading-[1.15] tracking-[-0.005em] mb-4 group-hover:text-vert-foret transition-colors duration-500"

                  >
                    {article.title}
                  </h3>

                  {article.excerpt && (
                    <p
                      className="text-base text-noir/60 leading-[1.65] line-clamp-3 mb-6 font-light flex-1"

                    >
                      {article.excerpt}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-noir/10">
                    <div className="flex items-center gap-3 text-[10px] tracking-[0.25em] text-noir/45 uppercase">
                      <span>{formatDateLong(article.publishedAt || article.createdAt)}</span>
                      <span className="h-px w-4 bg-noir/20" />
                      <span>{article.readingTime} min</span>
                    </div>
                    <span className="text-noir/30 group-hover:text-vert-foret group-hover:translate-x-1 transition-all duration-300 text-sm">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Editorial footer note */}
        {filtered.length > 0 && (
          <section className="border-t border-noir/10 py-16 lg:py-20">
            <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="h-px w-12 bg-bois-clair" />
                <span className="text-[10px] tracking-[0.4em] text-bois-fonce uppercase">Atelier</span>
                <span className="h-px w-12 bg-bois-clair" />
              </div>
              <p
                className="text-2xl md:text-3xl text-noir font-light italic leading-snug mb-8"

              >
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

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
