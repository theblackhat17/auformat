import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getArticleBySlug, getRelatedArticles, getArticles } from '@/lib/content';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { ReadingProgress } from '@/components/blog/ReadingProgress';
import { ArticleContent } from '@/components/blog/ArticleContent';

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
  const articles = await getArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  const description = article.metaDescription || article.excerpt || `${article.title} - Article du blog Au Format`;
  const keywords = article.metaKeywords
    ? article.metaKeywords.split(',').map((k) => k.trim())
    : ['blog menuiserie', 'menuiserie sur mesure', article.title];

  return buildPageMetadata(`/blog/${slug}`, {
    title: article.metaTitle || `${article.title} | Au Format`,
    description,
    keywords,
    ogTitle: article.title,
    ogDescription: description,
  });
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const related = await getRelatedArticles(article.id, article.categoryId, 3);

  const articleUrl = `${SITE_URL}/blog/${slug}`;
  const imageFullUrl = article.coverImage
    ? (article.coverImage.startsWith('http') ? article.coverImage : `${SITE_URL}${article.coverImage}`)
    : `${SITE_URL}/img/logo_tmp.png`;

  return (
    <>
      <JsonLd data={[
        breadcrumbJsonLd([
          { name: 'Accueil', url: SITE_URL },
          { name: 'Blog', url: `${SITE_URL}/blog` },
          ...(article.categoryLabel && article.categorySlug
            ? [{ name: article.categoryLabel, url: `${SITE_URL}/blog/categorie/${article.categorySlug}` }]
            : []),
          { name: article.title, url: articleUrl },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          '@id': `${articleUrl}#article`,
          headline: article.title,
          image: imageFullUrl,
          datePublished: article.publishedAt || article.createdAt,
          dateModified: article.updatedAt,
          author: {
            '@type': 'Organization',
            name: 'Au Format',
            url: SITE_URL,
          },
          publisher: { '@id': `${SITE_URL}/#organization` },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': articleUrl,
          },
          description: article.excerpt || article.metaDescription || article.title,
          articleBody: article.content,
          ...(article.categoryLabel ? { articleSection: article.categoryLabel } : {}),
          inLanguage: 'fr-FR',
        },
      ]} />

      <ReadingProgress />

      <div className="bg-white">
        <article>
          {/* Article header */}
          <header className="relative pt-28 lg:pt-36 pb-12 lg:pb-16 bg-beige/30 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-multiply"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
              }}
            />

            <div className="max-w-4xl mx-auto px-6 lg:px-8 relative">
              {/* Breadcrumb-style nav */}
              <nav className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.25em] text-noir/55 uppercase font-medium mb-10 lg:mb-14">
                <Link href="/blog" className="hover:text-vert-foret transition-colors inline-flex items-center gap-2 group">
                  <span className="transition-transform duration-300 group-hover:-translate-x-0.5">←</span>
                  <span>Journal</span>
                </Link>
                {article.categoryLabel && article.categorySlug && (
                  <>
                    <span className="text-noir/25">/</span>
                    <Link
                      href={`/blog/categorie/${article.categorySlug}`}
                      className="hover:text-vert-foret transition-colors inline-flex items-center gap-1.5"
                    >
                      {article.categoryIcon && <span>{article.categoryIcon}</span>}
                      <span>{article.categoryLabel}</span>
                    </Link>
                  </>
                )}
              </nav>

              {/* Title */}
              <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] text-noir leading-[1.1] tracking-[-0.01em] mb-8 lg:mb-10">
                {article.title}
              </h1>

              {/* Excerpt */}
              {article.excerpt && (
                <p className="text-xl md:text-2xl text-noir/65 leading-[1.5] font-light mb-10 lg:mb-12 italic">
                  {article.excerpt}
                </p>
              )}

              {/* Meta — bigger and more visible */}
              <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-noir/10">
                <span className="inline-flex items-center gap-2 text-sm text-noir/75 bg-white/80 backdrop-blur px-3.5 py-2 border border-noir/5">
                  <svg className="w-4 h-4 text-bois-fonce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <time dateTime={article.publishedAt || article.createdAt} className="font-medium">
                    {formatDateLong(article.publishedAt || article.createdAt)}
                  </time>
                </span>

                <span className="inline-flex items-center gap-2 text-sm text-noir/75 bg-white/80 backdrop-blur px-3.5 py-2 border border-noir/5">
                  <svg className="w-4 h-4 text-bois-fonce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{article.readingTime} min de lecture</span>
                </span>

                {article.authorName && (
                  <span className="inline-flex items-center gap-2 text-sm text-noir/75 bg-white/80 backdrop-blur px-3.5 py-2 border border-noir/5">
                    <svg className="w-4 h-4 text-bois-fonce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">par {article.authorName}</span>
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Cover image — full width */}
          {article.coverImage && (
            <div className="relative aspect-[16/10] lg:aspect-[21/9] max-h-[680px] w-full overflow-hidden bg-beige">
              <Image
                src={article.coverImage}
                alt={article.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>
          )}

          {/* Article body */}
          <div className="max-w-3xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
            <div className="article-prose">
              <ArticleContent content={article.content} />
            </div>

            {/* End mark */}
            <div className="mt-16 lg:mt-20 flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-bois-clair" />
              <span className="text-bois-clair text-2xl">§</span>
              <span className="h-px w-12 bg-bois-clair" />
            </div>
          </div>

          {/* Share section */}
          <div className="max-w-3xl mx-auto px-6 lg:px-8 pb-20">
            <div className="border-y border-noir/10 py-8 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-bois-clair" />
                <span className="text-[10px] tracking-[0.4em] text-bois-fonce uppercase font-medium">
                  Partager cet article
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 flex items-center justify-center border border-noir/15 text-noir/60 hover:border-vert-foret hover:bg-vert-foret hover:text-white transition-all duration-300 rounded-full"
                  aria-label="Partager sur Facebook"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
                  </svg>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 flex items-center justify-center border border-noir/15 text-noir/60 hover:border-vert-foret hover:bg-vert-foret hover:text-white transition-all duration-300 rounded-full"
                  aria-label="Partager sur Twitter"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 flex items-center justify-center border border-noir/15 text-noir/60 hover:border-vert-foret hover:bg-vert-foret hover:text-white transition-all duration-300 rounded-full"
                  aria-label="Partager sur LinkedIn"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(`À lire sur Au Format : ${articleUrl}`)}`}
                  className="w-11 h-11 flex items-center justify-center border border-noir/15 text-noir/60 hover:border-vert-foret hover:bg-vert-foret hover:text-white transition-all duration-300 rounded-full"
                  aria-label="Partager par email"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6m-18 0v10a2 2 0 002 2h14a2 2 0 002-2V8m-18 0a2 2 0 012-2h14a2 2 0 012 2" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </article>

        {/* Related articles */}
        {related.length > 0 && (
          <section className="bg-beige/40 py-20 lg:py-28">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="flex items-baseline gap-4 mb-12 lg:mb-16">
                <span className="h-px w-12 bg-bois-clair" />
                <span className="text-[10px] tracking-[0.4em] text-bois-fonce uppercase font-medium">
                  Articles similaires
                </span>
                <span className="h-px flex-1 bg-noir/10" />
              </div>

              <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
                {related.map((a) => (
                  <Link
                    key={a.id}
                    href={`/blog/${a.slug}`}
                    className="group flex flex-col"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-white mb-5 lg:mb-6">
                      {a.coverImage ? (
                        <Image
                          src={a.coverImage}
                          alt={a.title}
                          fill
                          className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.05]"
                          sizes="(min-width: 768px) 33vw, 100vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-bois-clair/20 via-beige to-bois-fonce/15" />
                      )}
                    </div>

                    {a.categoryLabel && (
                      <div className="mb-2.5">
                        <span className="text-[10px] tracking-[0.3em] text-bois-fonce uppercase font-medium inline-flex items-center gap-2">
                          {a.categoryIcon && <span className="opacity-80">{a.categoryIcon}</span>}
                          <span>{a.categoryLabel}</span>
                        </span>
                      </div>
                    )}

                    <h3 className="font-display text-xl lg:text-[1.375rem] text-noir leading-[1.2] group-hover:text-vert-foret transition-colors duration-500 mb-4">
                      {a.title}
                    </h3>

                    <div className="mt-auto flex items-center gap-2 text-[13px] text-noir/55">
                      <span>{a.readingTime} min</span>
                      <span className="h-px w-3 bg-noir/20" />
                      <span>{formatDateLong(a.publishedAt || a.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="relative bg-noir text-white py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-bois-clair blur-[120px]" />
            <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-vert-foret blur-[120px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className="h-px w-12 bg-bois-clair/60" />
              <span className="text-[10px] tracking-[0.4em] text-bois-clair uppercase font-medium">
                Au Format · Atelier
              </span>
              <span className="h-px w-12 bg-bois-clair/60" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.1] tracking-[-0.01em] mb-8">
              Un projet de{' '}
              <em className="italic font-normal text-bois-clair">menuiserie</em>
              &nbsp;?
            </h2>
            <p className="text-lg md:text-xl text-white/65 leading-[1.65] mb-12 font-light max-w-2xl mx-auto">
              De la première idée à la pose finale, notre atelier vous accompagne dans la création de pièces uniques en bois massif, à votre image.
            </p>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-3 bg-bois-clair text-noir hover:bg-white transition-colors duration-300 px-10 py-4 text-[11px] tracking-[0.3em] uppercase font-medium"
            >
              <span>Discutons-en</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </section>
      </div>

      {/* Editorial prose styling */}
      <style>{`
        .article-prose {
          font-size: 1.1875rem;
          line-height: 1.85;
          color: rgba(43, 43, 43, 0.88);
          font-weight: 400;
        }

        @media (min-width: 768px) {
          .article-prose {
            font-size: 1.25rem;
          }
        }

        .article-prose > p:first-of-type::first-letter {
          float: left;
          font-weight: 400;
          font-size: 4.5rem;
          line-height: 0.85;
          margin: 0.5rem 0.75rem -0.25rem 0;
          color: #2C5F2D;
          font-style: normal;
        }

        .article-prose h2 {
          font-weight: 400;
          font-size: 2rem;
          line-height: 1.2;
          color: #000000;
          margin: 3.5rem 0 1.5rem;
          letter-spacing: -0.015em;
        }

        @media (min-width: 768px) {
          .article-prose h2 {
            font-size: 2.5rem;
          }
        }

        .article-prose h2::before {
          content: '';
          display: block;
          width: 2.5rem;
          height: 1px;
          background: #D4A574;
          margin-bottom: 1.25rem;
        }

        .article-prose h3 {
          font-weight: 500;
          font-size: 1.5rem;
          line-height: 1.3;
          color: #000000;
          margin: 2.5rem 0 1rem;
          letter-spacing: -0.005em;
        }

        @media (min-width: 768px) {
          .article-prose h3 {
            font-size: 1.75rem;
          }
        }

        .article-prose h4 {
          font-weight: 500;
          font-size: 1.25rem;
          line-height: 1.35;
          color: #000000;
          margin: 2rem 0 0.75rem;
        }

        .article-prose p {
          margin: 0 0 1.5rem;
        }

        .article-prose ul,
        .article-prose ol {
          margin: 0 0 1.75rem;
          padding-left: 0;
        }

        .article-prose ul {
          list-style: none;
        }

        .article-prose ul > li {
          position: relative;
          padding-left: 1.75rem;
          margin-bottom: 0.625rem;
        }

        .article-prose ul > li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.95em;
          width: 0.875rem;
          height: 1px;
          background: #D4A574;
        }

        .article-prose ol {
          list-style: none;
          counter-reset: editorial-counter;
        }

        .article-prose ol > li {
          position: relative;
          padding-left: 2.25rem;
          margin-bottom: 0.625rem;
          counter-increment: editorial-counter;
        }

        .article-prose ol > li::before {
          content: counter(editorial-counter, decimal-leading-zero);
          position: absolute;
          left: 0;
          top: 0.05em;
          font-weight: 500;
          font-size: 0.95em;
          color: #8B6F47;
          letter-spacing: 0.05em;
        }

        .article-prose strong {
          font-weight: 600;
          color: #000000;
        }

        .article-prose em {
          font-style: italic;
        }

        .article-prose a {
          color: #2C5F2D;
          text-decoration: none;
          background-image: linear-gradient(to right, rgba(212, 165, 116, 0.6), rgba(212, 165, 116, 0.6));
          background-position: 0 100%;
          background-repeat: no-repeat;
          background-size: 100% 1px;
          transition: background-size 0.3s ease, color 0.2s;
        }

        .article-prose a:hover {
          color: #234a24;
          background-size: 100% 2px;
        }

        .article-prose blockquote {
          margin: 3rem 0;
          padding: 0.5rem 0 0.5rem 2rem;
          border-left: 2px solid #D4A574;
          font-size: 1.5rem;
          font-style: italic;
          line-height: 1.45;
          color: #000000;
          font-weight: 300;
          letter-spacing: -0.005em;
        }

        @media (min-width: 768px) {
          .article-prose blockquote {
            font-size: 1.875rem;
            margin: 3.5rem -1rem;
            padding-left: 2.5rem;
          }
        }

        .article-prose blockquote p {
          margin: 0;
        }

        .article-prose blockquote p::before {
          content: '"';
          color: #D4A574;
          font-size: 1.25em;
          margin-right: 0.15em;
          line-height: 0;
        }

        .article-prose blockquote p::after {
          content: '"';
          color: #D4A574;
          font-size: 1.25em;
          margin-left: 0.1em;
          line-height: 0;
        }

        /* Callouts override default prose styling inside .callout-body */
        .article-prose .callout-body p {
          margin: 0 0 0.75rem;
          font-size: inherit;
          font-style: normal;
          font-weight: 400;
          color: inherit;
          line-height: inherit;
          letter-spacing: normal;
        }
        .article-prose .callout-body p:last-child {
          margin-bottom: 0;
        }
        .article-prose .callout-body p::before,
        .article-prose .callout-body p::after {
          content: none;
        }
        .article-prose .callout-body ul,
        .article-prose .callout-body ol {
          margin: 0.5rem 0 0.75rem;
        }
        .article-prose .callout-body ul > li,
        .article-prose .callout-body ol > li {
          margin-bottom: 0.35rem;
        }

        .article-prose img {
          max-width: 100%;
          height: auto;
          margin: 3rem 0;
        }

        .article-prose code {
          background: #F5F1E8;
          padding: 0.15em 0.4em;
          font-size: 0.875em;
          color: #8B6F47;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          border-radius: 2px;
        }

        .article-prose pre {
          background: #000000;
          color: #F5F1E8;
          padding: 1.5rem;
          margin: 2.5rem 0;
          overflow-x: auto;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 0.9rem;
          line-height: 1.6;
          border-left: 2px solid #D4A574;
        }

        .article-prose pre code {
          background: transparent;
          color: inherit;
          padding: 0;
          font-size: inherit;
        }

        .article-prose hr {
          border: none;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(43, 43, 43, 0.18), transparent);
          margin: 3.5rem 0;
        }

        .article-prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 2.5rem 0;
          font-size: 0.95em;
        }

        .article-prose thead {
          border-bottom: 1px solid #000000;
        }

        .article-prose th {
          text-align: left;
          padding: 0.75rem 1rem 0.75rem 0;
          font-weight: 500;
          font-size: 0.95em;
          color: #000000;
        }

        .article-prose td {
          padding: 0.75rem 1rem 0.75rem 0;
          border-bottom: 1px solid rgba(43, 43, 43, 0.08);
          color: rgba(43, 43, 43, 0.8);
        }
      `}</style>
    </>
  );
}
