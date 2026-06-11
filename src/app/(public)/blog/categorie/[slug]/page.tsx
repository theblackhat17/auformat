import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getArticlesByCategorySlug, getBlogCategoriesWithCount } from '@/lib/content';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function generateStaticParams() {
  const cats = await getBlogCategoriesWithCount();
  return cats.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cats = await getBlogCategoriesWithCount();
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return {};

  return buildPageMetadata(`/blog/categorie/${slug}`, {
    title: `${cat.label} - Articles & Conseils | Au Format`,
    description: `Tous nos articles dans la catégorie ${cat.label} : conseils, inspirations et savoir-faire de notre atelier de menuiserie.`,
    keywords: [`blog ${cat.label.toLowerCase()}`, 'menuiserie', 'conseils bois'],
  });
}

export default async function BlogCategoryPage({ params }: Props) {
  const { slug } = await params;
  const [articles, cats] = await Promise.all([
    getArticlesByCategorySlug(slug),
    getBlogCategoriesWithCount(),
  ]);

  const current = cats.find((c) => c.slug === slug);
  if (!current) notFound();

  const otherCats = cats.filter((c) => c.slug !== slug);

  return (
    <>
      <JsonLd data={[
        breadcrumbJsonLd([
          { name: 'Accueil', url: SITE_URL },
          { name: 'Blog', url: `${SITE_URL}/blog` },
          { name: current.label, url: `${SITE_URL}/blog/categorie/${slug}` },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': `${SITE_URL}/blog/categorie/${slug}#page`,
          name: `${current.label} - Le Journal Au Format`,
          url: `${SITE_URL}/blog/categorie/${slug}`,
          isPartOf: { '@id': `${SITE_URL}/blog#blog` },
          ...(articles.length > 0 ? {
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: articles.map((a, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE_URL}/blog/${a.slug}`,
                name: a.title,
              })),
            },
          } : {}),
        },
      ]} />

      <div className="bg-white">
        {/* Header */}
        <section className="relative pt-28 lg:pt-36 pb-12 lg:pb-16 bg-beige/40 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            }}
          />

          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.4em] text-bois-fonce uppercase font-medium mb-10 hover:text-vert-foret transition-colors group"
            >
              <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
              <span>Retour au journal</span>
            </Link>

            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-10 bg-bois-fonce" />
              <span className="text-xs md:text-[13px] tracking-[0.28em] text-noir uppercase font-bold">
                Catégorie
              </span>
            </div>

            <div className="flex items-end gap-4 md:gap-6 mb-6">
              {current.icon && (
                <span className="text-5xl md:text-7xl lg:text-8xl leading-none">{current.icon}</span>
              )}
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-noir leading-[1.02] tracking-[-0.01em]">
                {current.label}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs tracking-[0.25em] text-noir/75 uppercase font-bold">
              <span>
                {articles.length} article{articles.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </section>

        {/* Articles grid */}
        {articles.length === 0 ? (
          <section className="max-w-3xl mx-auto px-6 lg:px-8 py-24 lg:py-32 text-center">
            <p className="text-3xl md:text-4xl text-noir/30 italic mb-6 font-light">
              Aucun article dans cette catégorie pour le moment.
            </p>
            <Link
              href="/blog"
              className="inline-block mt-4 text-sm text-vert-foret border-b border-bois-clair pb-1 hover:border-vert-foret transition-colors"
            >
              Voir tous les articles
            </Link>
          </section>
        ) : (
          <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-14 lg:gap-y-20">
              {articles.map((article, idx) => (
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
                        N° {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  <h2 className="font-display text-xl lg:text-[1.375rem] text-noir leading-[1.2] mb-3 group-hover:text-vert-foret transition-colors duration-500">
                    {article.title}
                  </h2>

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

        {/* Other categories */}
        {otherCats.length > 0 && (
          <section className="border-t border-noir/10 bg-beige/30 py-16 lg:py-20">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="flex items-baseline gap-4 mb-8">
                <span className="h-px w-10 bg-bois-fonce" />
                <span className="text-xs md:text-[13px] tracking-[0.28em] text-noir uppercase font-bold">
                  Autres thèmes
                </span>
                <span className="h-px flex-1 bg-noir/15" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
                {otherCats.map((c) => (
                  <Link
                    key={c.id}
                    href={`/blog/categorie/${c.slug}`}
                    className="group bg-white hover:bg-beige/50 transition-all duration-300 border border-noir/5 hover:border-bois-clair/50 px-3.5 py-3 flex items-center gap-3"
                  >
                    <span className="text-2xl leading-none transition-transform duration-300 group-hover:scale-110">
                      {c.icon || '·'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] md:text-sm font-semibold text-noir tracking-[-0.005em] group-hover:text-vert-foret transition-colors truncate leading-tight">
                        {c.label}
                      </div>
                      <div className="text-[10px] tracking-[0.2em] text-noir/55 uppercase font-medium mt-0.5">
                        {c.articleCount} article{c.articleCount > 1 ? 's' : ''}
                      </div>
                    </div>
                    <span className="text-noir/30 group-hover:text-vert-foret group-hover:translate-x-0.5 transition-all duration-300 text-xs">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
