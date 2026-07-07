import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getArticles, getBlogCategoriesWithCount, getPageContent } from '@/lib/content';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { Reveal } from '@/components/motion/Reveal';
import type { Article } from '@/lib/types';
import { assertPageEnabled } from '@/lib/page-visibility';

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
  await assertPageEnabled('/blog');
  const [articles, categories, sections] = await Promise.all([
    getArticles(),
    getBlogCategoriesWithCount(),
    getPageContent('blog'),
  ]);

  const hero = (sections.find((s) => s.sectionKey === 'hero')?.content || {}) as Record<string, string>;

  const featured = articles[0];
  const latest = articles.slice(1, 7);
  /** Seules les catégories qui ont au moins un article donnent envie de cliquer */
  const filledCategories = categories.filter((c) => c.articleCount > 0);

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
        {/* Masthead compact : le titre présente, l'article à la une vend */}
        <section className="pt-28 lg:pt-32 pb-8 lg:pb-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-noir leading-[1.02] tracking-[-0.01em]">
                {hero.title_prefix || 'Le'}{' '}
                <em className="italic text-vert-foret">{hero.title_accent || 'Journal'}</em>
              </h1>
              <p className="text-base md:text-lg text-noir/70 leading-relaxed max-w-md lg:text-right lg:pb-1.5">
                {hero.description || "Conseils, inspirations & savoir-faire d'un atelier passionné par le bois et le geste juste."}
              </p>
            </div>
          </div>
        </section>

        {/* Empty state */}
        {articles.length === 0 && (
          <section className="max-w-3xl mx-auto px-6 lg:px-8 py-24 lg:py-32 text-center">
            <p className="font-display text-4xl md:text-5xl text-noir/40 italic mb-6">
              Le journal est en préparation.
            </p>
            <p className="text-noir/60 text-lg">
              Revenez bientôt pour découvrir nos premiers articles.
            </p>
          </section>
        )}

        {/* À la une — l'article vedette EST le héros : image pleine largeur, cliquable */}
        {featured && (
          <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-14 lg:pb-20">
            <Link
              href={`/blog/${featured.slug}`}
              className="group relative block overflow-hidden rounded-2xl bg-noir shadow-[0_24px_60px_-24px_rgba(43,43,43,0.45)]"
            >
              <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/10]">
                {featured.coverImage ? (
                  <Image
                    src={featured.coverImage}
                    alt={featured.title}
                    fill
                    className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
                    sizes="(min-width: 1280px) 1216px, 100vw"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-vert-foret via-noir to-bois-fonce" />
                )}
                {/* Voile de lecture : le texte vit sur la photo */}
                <div className="absolute inset-0 bg-gradient-to-t from-noir/90 via-noir/35 to-noir/10" />
              </div>

              <div className="absolute top-5 left-5 lg:top-7 lg:left-7">
                <span className="inline-flex items-center gap-2 bg-bois-clair text-noir text-xs font-bold uppercase tracking-[0.14em] px-4 py-2 rounded-full shadow-sm">
                  À la une
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9 lg:p-12">
                <div className="max-w-3xl">
                  {featured.categoryLabel && (
                    <p className="text-bois-clair text-sm font-semibold mb-3 flex items-center gap-2">
                      {featured.categoryIcon && <span aria-hidden="true">{featured.categoryIcon}</span>}
                      {featured.categoryLabel}
                    </p>
                  )}
                  <h2 className="font-display text-3xl sm:text-4xl lg:text-[3.25rem] text-white leading-[1.05] mb-4 [text-wrap:balance]">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="hidden sm:block text-white/85 text-lg leading-relaxed line-clamp-2 max-w-2xl mb-6">
                      {featured.excerpt}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                    <span className="btn-on-dark !py-3 !px-7 text-sm">
                      Lire l&apos;article
                      <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
                    </span>
                    <span className="text-white/75 text-sm">
                      {formatDateLong(featured.publishedAt || featured.createdAt)} · {featured.readingTime} min de lecture
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Thèmes : pastilles pleines, uniquement celles qui ont des articles */}
        {filledCategories.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-16 lg:pb-24">
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-noir/60 mr-2">Explorer&nbsp;:</span>
                {filledCategories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/blog/categorie/${c.slug}`}
                    className="group inline-flex items-center gap-2.5 bg-beige/70 hover:bg-vert-foret border border-noir/10 hover:border-vert-foret rounded-full pl-4 pr-2.5 py-2 transition-colors duration-200"
                  >
                    {c.icon && <span className="text-lg leading-none" aria-hidden="true">{c.icon}</span>}
                    <span className="text-sm font-semibold text-noir group-hover:text-white transition-colors duration-200">
                      {c.label}
                    </span>
                    <span className="text-xs font-bold text-noir/70 bg-white group-hover:bg-white/20 group-hover:text-white rounded-full min-w-[1.5rem] h-6 inline-flex items-center justify-center px-1.5 transition-colors duration-200">
                      {c.articleCount}
                    </span>
                  </Link>
                ))}
              </div>
            </Reveal>
          </section>
        )}

        {/* Derniers articles : cartes avec matière et relief */}
        {latest.length > 0 && (
          <section className="max-w-7xl mx-auto px-6 lg:px-8 pb-20 lg:pb-28">
            <div className="flex items-end justify-between gap-6 mb-9 lg:mb-12">
              <h2 className="font-display text-3xl md:text-4xl text-noir leading-tight">
                Derniers articles
              </h2>
              <span className="text-sm text-noir/60 pb-1 shrink-0">
                {articles.length} article{articles.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {latest.map((article, idx) => (
                <Reveal key={article.id} delay={idx * 80} as="article">
                  <Link
                    href={`/blog/${article.slug}`}
                    className="group flex flex-col h-full bg-white rounded-xl overflow-hidden border border-noir/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="relative aspect-[3/2] overflow-hidden bg-beige">
                      {article.coverImage ? (
                        <Image
                          src={article.coverImage}
                          alt={article.title}
                          fill
                          className="object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.06]"
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-bois-clair/40 via-beige to-bois-fonce/25" />
                      )}
                      {article.categoryLabel && (
                        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur text-noir text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                          {article.categoryIcon && <span aria-hidden="true">{article.categoryIcon}</span>}
                          {article.categoryLabel}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 p-6">
                      <h3 className="font-display text-xl lg:text-2xl text-noir leading-[1.15] mb-3 group-hover:text-vert-foret transition-colors duration-300 [text-wrap:balance]">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-[15px] text-noir/70 leading-relaxed line-clamp-2 mb-6 flex-1">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[13px] text-noir/60">
                          {formatDateLong(article.publishedAt || article.createdAt)} · {article.readingTime} min
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-vert-foret">
                          Lire
                          <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* Sections par thème */}
        {filledCategories.length > 0 && articles.length > 3 && (
          <div className="bg-beige/40 border-t border-noir/5">
            {filledCategories.map((c) => {
              const items = (byCategory[c.slug] || []).slice(0, 3);
              if (items.length === 0) return null;

              return (
                <section key={c.id} className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20 border-b border-noir/5 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8 lg:mb-10">
                    <div className="flex items-center gap-4">
                      {c.icon && (
                        <span className="w-12 h-12 rounded-xl bg-white shadow-sm border border-noir/5 flex items-center justify-center text-2xl" aria-hidden="true">
                          {c.icon}
                        </span>
                      )}
                      <h2 className="font-display text-2xl md:text-3xl text-noir">
                        {c.label}
                      </h2>
                    </div>
                    <Link
                      href={`/blog/categorie/${c.slug}`}
                      className="group inline-flex items-center gap-2 text-sm font-semibold text-vert-foret hover:text-vert-foret-dark transition-colors"
                    >
                      Voir tout ({c.articleCount})
                      <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
                    </Link>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {items.map((article) => (
                      <Link
                        key={article.id}
                        href={`/blog/${article.slug}`}
                        className="group flex sm:flex-col gap-4 sm:gap-0 bg-white rounded-xl overflow-hidden border border-noir/10 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-4 sm:p-0"
                      >
                        <div className="relative w-24 h-24 sm:w-full sm:h-auto sm:aspect-[3/2] shrink-0 overflow-hidden rounded-lg sm:rounded-none bg-beige">
                          {article.coverImage ? (
                            <Image
                              src={article.coverImage}
                              alt={article.title}
                              fill
                              className="object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.05]"
                              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 96px"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-bois-clair/30 via-beige to-bois-fonce/20" />
                          )}
                        </div>

                        <div className="flex flex-col flex-1 min-w-0 sm:p-5">
                          <h3 className="font-display text-base sm:text-lg text-noir leading-[1.2] mb-2 group-hover:text-vert-foret transition-colors duration-300 line-clamp-2">
                            {article.title}
                          </h3>
                          <span className="text-[13px] text-noir/60 mt-auto">
                            {formatDateLong(article.publishedAt || article.createdAt)} · {article.readingTime} min
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Bandeau final : l'atelier tend la main */}
        {articles.length > 0 && (
          <section className="relative bg-noir overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-noir via-noir to-vert-foret-dark/60" aria-hidden="true" />
            <div className="relative max-w-4xl mx-auto px-6 lg:px-8 py-16 lg:py-24 text-center">
              <p className="font-display text-3xl md:text-4xl lg:text-5xl text-white leading-[1.1] mb-4 [text-wrap:balance]">
                Un projet de menuiserie <em className="italic text-bois-clair">sur mesure</em>&nbsp;?
              </p>
              <p className="text-white/75 text-lg leading-relaxed max-w-xl mx-auto mb-9">
                Dessinez votre meuble dans notre configurateur ou parlez-nous de votre projet — l&apos;atelier vous répond sous 48&nbsp;h.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/configurateur" className="btn-on-dark">
                  Configurer mon meuble
                </Link>
                <Link href="/contact" className="btn-ghost-dark">
                  Nous contacter
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
