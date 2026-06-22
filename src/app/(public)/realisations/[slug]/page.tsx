export const revalidate = 300;

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRealisationBySlug, getRealisations, getSettings } from '@/lib/content';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/lib/jsonld';

export async function generateStaticParams() {
  const realisations = await getRealisations();
  return realisations.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRealisationBySlug(slug);
  if (!r) return { title: 'Réalisation introuvable' };
  return buildPageMetadata(`/realisations/${r.slug}`, {
    title: `${r.title} — Réalisation sur mesure`,
    description: r.description?.slice(0, 155) || `${r.title} : une réalisation de menuiserie sur mesure par l'atelier Au Format.`,
    keywords: [r.categoryLabel || '', 'menuiserie sur mesure', r.location || '', r.materialName || ''].filter(Boolean),
  });
}

export default async function RealisationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [r, all, settings] = await Promise.all([getRealisationBySlug(slug), getRealisations(), getSettings()]);
  if (!r) notFound();

  const related = all.filter((x) => x.id !== r.id && x.category === r.category).slice(0, 3);
  const configurateurEnabled = settings?.configurateurEnabled ?? false;

  const specs = [
    { label: 'Catégorie', value: r.categoryLabel },
    { label: 'Durée', value: r.duration },
    { label: 'Surface', value: r.surface },
    { label: 'Matériau', value: r.materialName || r.material },
    { label: 'Lieu', value: r.location },
  ].filter((s) => s.value);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Accueil', url: SITE_URL },
          { name: 'Réalisations', url: `${SITE_URL}/realisations` },
          { name: r.title, url: `${SITE_URL}/realisations/${r.slug}` },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: r.title,
          description: r.description,
          image: r.image ? (r.image.startsWith('http') ? r.image : `${SITE_URL}${r.image}`) : undefined,
          datePublished: r.date,
          locationCreated: r.location || undefined,
          creator: { '@type': 'Organization', name: 'Au Format' },
        }}
      />

      {/* Hero image */}
      <section className="relative">
        <div className="relative h-[45vh] min-h-[320px] lg:h-[60vh]">
          {r.image ? (
            <Image src={r.image} alt={r.title} fill sizes="100vw" priority className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-beige" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-noir/75 via-noir/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="max-w-5xl mx-auto px-6 lg:px-8 pb-10">
              <nav aria-label="Fil d'Ariane" className="text-sm text-white/70 mb-3">
                <Link href="/realisations" className="hover:text-white transition-colors">← Toutes nos réalisations</Link>
              </nav>
              {r.categoryLabel && <p className="text-bois-clair text-sm font-semibold mb-2">{r.categoryLabel}</p>}
              <h1 className="font-display text-[clamp(1.75rem,3vw+0.75rem,3rem)] leading-[1.1] text-white">{r.title}</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <p className="text-lg text-noir/80 leading-relaxed">{r.description}</p>
            {r.body && <p className="mt-5 text-noir/70 leading-relaxed whitespace-pre-line">{r.body}</p>}

            {r.features && r.features.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-xl text-noir mb-3">Ce que nous avons réalisé</h2>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {r.features.map((f, i) => (
                    <li key={i} className="text-sm text-noir/70 flex items-start gap-2">
                      <span className="text-vert-foret mt-0.5">✓</span> {f.feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {r.gallery && r.gallery.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xl text-noir mb-4">En images</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {r.gallery.map((g, i) => (
                    <a key={i} href={g.image} target="_blank" rel="noopener" className="group relative aspect-square rounded-xl overflow-hidden ring-1 ring-noir/8">
                      <Image src={g.image} alt={`${r.title} — photo ${i + 1}`} fill sizes="(max-width: 640px) 50vw, 280px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fiche technique + CTA */}
          <aside className="space-y-5">
            {specs.length > 0 && (
              <div className="bg-beige/50 rounded-2xl p-6">
                <h2 className="font-display text-lg text-noir mb-4">Fiche projet</h2>
                <dl className="space-y-3">
                  {specs.map((s) => (
                    <div key={s.label}>
                      <dt className="text-xs text-noir/50 uppercase tracking-wide">{s.label}</dt>
                      <dd className="text-sm font-semibold text-noir mt-0.5">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <div className="bg-noir text-white rounded-2xl p-6">
              <h2 className="font-display text-lg mb-2">Un projet similaire ?</h2>
              <p className="text-sm text-white/75 leading-relaxed mb-4">
                Chaque projet est unique : parlons du vôtre, ou esquissez-le vous-même dans notre configurateur.
              </p>
              <div className="space-y-2.5">
                {configurateurEnabled && (
                  <Link href="/configurateur" className="btn-on-dark w-full !py-2.5 text-sm block text-center">
                    Configurer mon projet
                  </Link>
                )}
                <Link href="/contact" className="block text-center text-sm font-semibold text-bois-clair hover:text-white transition-colors">
                  Demander un devis gratuit →
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Projets de la même catégorie */}
        {related.length > 0 && (
          <div className="max-w-5xl mx-auto px-6 lg:px-8 mt-16">
            <h2 className="font-display text-2xl text-noir mb-6">Dans la même catégorie</h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {related.map((x) => (
                <Link key={x.id} href={`/realisations/${x.slug}`} className="group relative aspect-[4/3] rounded-xl overflow-hidden">
                  {x.image ? (
                    <Image src={x.image} alt={x.title} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="absolute inset-0 bg-beige" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-noir/75 to-transparent" />
                  <span className="absolute bottom-0 left-0 right-0 p-4 font-display text-white leading-snug">{x.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
