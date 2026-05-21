import type { MetadataRoute } from 'next';
import { getSettings, getServices, getRealisations, getMateriaux, getArticles } from '@/lib/content';
import { queryOne } from '@/lib/db';

const SITE_URL = 'https://auformat.com';

async function getLatestUpdate(table: string): Promise<Date> {
  const row = await queryOne<{ latest: string }>(
    `SELECT MAX(updated_at) as latest FROM ${table}`
  );
  return row?.latest ? new Date(row.latest) : new Date('2025-01-01');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, services, realisations, materiaux, articles, latestRealisation, latestAvis, latestMateriau, latestContent, latestArticle] = await Promise.all([
    getSettings(),
    getServices(),
    getRealisations(),
    getMateriaux(),
    getArticles(),
    getLatestUpdate('realisations'),
    getLatestUpdate('avis'),
    getLatestUpdate('materiaux'),
    getLatestUpdate('page_content'),
    getLatestUpdate('articles'),
  ]);
  const configurateurEnabled = settings?.configurateurEnabled ?? false;

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: latestContent },
    { url: `${SITE_URL}/realisations`, lastModified: latestRealisation },
    { url: `${SITE_URL}/contact`, lastModified: new Date('2025-01-01') },
    { url: `${SITE_URL}/avis`, lastModified: latestAvis },
    { url: `${SITE_URL}/savoir-faire`, lastModified: latestContent },
    { url: `${SITE_URL}/processus`, lastModified: latestContent },
    { url: `${SITE_URL}/materiaux`, lastModified: latestMateriau },
    { url: `${SITE_URL}/blog`, lastModified: latestArticle },
    { url: `${SITE_URL}/about`, lastModified: latestContent },
    { url: `${SITE_URL}/menuiserie-lille`, lastModified: latestContent },
    { url: `${SITE_URL}/menuiserie-le-touquet`, lastModified: latestContent },
    { url: `${SITE_URL}/mentions-legales`, lastModified: new Date('2025-01-01') },
    { url: `${SITE_URL}/politique-confidentialite`, lastModified: new Date('2025-01-01') },
    { url: `${SITE_URL}/cgv`, lastModified: new Date('2025-01-01') },
  ];

  // Service pages
  for (const s of services) {
    entries.push({ url: `${SITE_URL}/services/${s.slug}`, lastModified: new Date(s.updatedAt || Date.now()) });
  }

  // Blog articles
  for (const a of articles) {
    const entry: MetadataRoute.Sitemap[number] = {
      url: `${SITE_URL}/blog/${a.slug}`,
      lastModified: new Date(a.updatedAt || a.publishedAt || a.createdAt),
    };
    if (a.coverImage) {
      entry.images = [a.coverImage.startsWith('http') ? a.coverImage : `${SITE_URL}${a.coverImage}`];
    }
    entries.push(entry);
  }

  // Configurateur
  if (configurateurEnabled) {
    entries.splice(1, 0, { url: `${SITE_URL}/configurateur`, lastModified: new Date() });
  }

  // Realisation images for image sitemap (grouped under single URL)
  const realisationImages = realisations
    .filter((r) => r.image)
    .map((r) => r.image!.startsWith('http') ? r.image! : `${SITE_URL}${r.image}`);
  if (realisationImages.length > 0) {
    const realisationEntry = entries.find((e) => e.url === `${SITE_URL}/realisations`);
    if (realisationEntry) {
      realisationEntry.images = realisationImages;
    }
  }

  // Materiau images for image sitemap (grouped under single URL)
  const materiauImages = materiaux
    .filter((m) => m.image)
    .map((m) => m.image!.startsWith('http') ? m.image! : `${SITE_URL}${m.image}`);
  if (materiauImages.length > 0) {
    const materiauEntry = entries.find((e) => e.url === `${SITE_URL}/materiaux`);
    if (materiauEntry) {
      materiauEntry.images = materiauImages;
    }
  }

  return entries;
}
