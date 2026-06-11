import { query, queryOne } from './db';
import type { Realisation, Avis, Materiau, TeamMember, SiteSettings, Category, PageContent, GeneralSettings, HomepageSettings, Service, Article } from './types';

export async function getRealisations(): Promise<Realisation[]> {
  const rows = await query<Realisation & { categorySlug: string; categoryLabel: string; matName: string | null }>(
    `SELECT r.*, c.slug as category_slug, c.label as category_label, mat.name as mat_name
     FROM realisations r
     LEFT JOIN categories c ON r.category_id = c.id
     LEFT JOIN materiaux mat ON r.material_id = mat.id
     WHERE r.published = true
     ORDER BY r.date DESC`
  );
  return rows.map((r) => ({
    ...r,
    category: r.categorySlug || '',
    categoryLabel: r.categoryLabel || '',
    materialName: r.matName || r.material || '',
  }));
}

export async function getAvis(): Promise<Avis[]> {
  return query<Avis>(
    'SELECT * FROM avis WHERE published = true ORDER BY date DESC'
  );
}

export async function getMateriaux(): Promise<Materiau[]> {
  // configurateur_only : panneaux du configurateur, absents de la page publique /materiaux
  const rows = await query<Materiau & { categorySlug: string; categoryLabel: string }>(
    `SELECT m.*, c.slug as category_slug, c.label as category_label
     FROM materiaux m
     LEFT JOIN categories c ON m.category_id = c.id
     WHERE m.published = true AND COALESCE(m.configurateur_only, false) = false
     ORDER BY m.sort_order`
  );
  return rows.map((m) => ({
    ...m,
    category: m.categorySlug || '',
    categoryLabel: m.categoryLabel || '',
  }));
}

export async function getMateriauxForConfigurateur(): Promise<Materiau[]> {
  const rows = await query<Materiau & { categorySlug: string; categoryLabel: string }>(
    `SELECT m.*, c.slug as category_slug, c.label as category_label
     FROM materiaux m
     LEFT JOIN categories c ON m.category_id = c.id
     WHERE m.published = true AND m.prix_m2 IS NOT NULL
     ORDER BY m.sort_order`
  );
  return rows.map((m) => ({
    ...m,
    category: m.categorySlug || '',
    categoryLabel: m.categoryLabel || '',
  }));
}

export async function getMateriauxGrouped(): Promise<Record<string, Materiau[]>> {
  const materiaux = await getMateriaux();
  const grouped: Record<string, Materiau[]> = {};
  for (const m of materiaux) {
    const key = m.category || 'other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }
  return grouped;
}

export async function getEquipe(): Promise<TeamMember[]> {
  return query<TeamMember>(
    'SELECT * FROM team_members WHERE published = true ORDER BY sort_order'
  );
}

export async function getSettings(): Promise<SiteSettings | null> {
  return queryOne<SiteSettings>('SELECT * FROM site_settings LIMIT 1');
}

export async function getCategories(type?: string): Promise<Category[]> {
  if (type) {
    return query<Category>('SELECT * FROM categories WHERE type = $1 AND published = true ORDER BY sort_order', [type]);
  }
  return query<Category>('SELECT * FROM categories WHERE published = true ORDER BY type, sort_order');
}

export interface CategoryWithCount extends Category {
  articleCount: number;
}

export async function getBlogCategoriesWithCount(): Promise<CategoryWithCount[]> {
  return query<CategoryWithCount>(
    `SELECT c.*, COUNT(a.id)::int AS article_count
     FROM categories c
     LEFT JOIN articles a ON a.category_id = c.id AND a.published = true
     WHERE c.type = 'blog' AND c.published = true
     GROUP BY c.id
     ORDER BY c.sort_order`
  );
}

export async function getArticlesByCategorySlug(slug: string): Promise<Article[]> {
  return query<Article>(
    `SELECT a.*, c.slug as category_slug, c.label as category_label, c.icon as category_icon,
            p.full_name as author_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN profiles p ON a.author_id = p.id
     WHERE a.published = true AND c.slug = $1
     ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC`,
    [slug]
  );
}

export async function getServices(): Promise<Service[]> {
  return query<Service>(
    'SELECT * FROM services WHERE published = true ORDER BY sort_order'
  );
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  return queryOne<Service>(
    'SELECT * FROM services WHERE slug = $1 AND published = true',
    [slug]
  );
}

export async function getArticles(): Promise<Article[]> {
  return query<Article>(
    `SELECT a.*, c.slug as category_slug, c.label as category_label, c.icon as category_icon,
            p.full_name as author_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN profiles p ON a.author_id = p.id
     WHERE a.published = true
     ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC`
  );
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return queryOne<Article>(
    `SELECT a.*, c.slug as category_slug, c.label as category_label, c.icon as category_icon,
            p.full_name as author_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN profiles p ON a.author_id = p.id
     WHERE a.slug = $1 AND a.published = true`,
    [slug]
  );
}

export async function getRelatedArticles(articleId: string, categoryId: string | null, limit = 3): Promise<Article[]> {
  if (categoryId) {
    return query<Article>(
      `SELECT a.*, c.slug as category_slug, c.label as category_label, c.icon as category_icon
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.published = true AND a.id != $1 AND a.category_id = $2
       ORDER BY a.published_at DESC NULLS LAST
       LIMIT $3`,
      [articleId, categoryId, limit]
    );
  }
  return query<Article>(
    `SELECT a.*, c.slug as category_slug, c.label as category_label, c.icon as category_icon
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.published = true AND a.id != $1
     ORDER BY a.published_at DESC NULLS LAST
     LIMIT $2`,
    [articleId, limit]
  );
}

export async function getAvisStats(): Promise<{ ratingValue: number; reviewCount: number }> {
  const result = await queryOne<{ avg: string; count: string }>(
    'SELECT ROUND(AVG(rating)::numeric, 1) as avg, COUNT(*)::text as count FROM avis WHERE published = true AND rating > 0'
  );
  return {
    ratingValue: result ? parseFloat(result.avg) || 0 : 0,
    reviewCount: result ? parseInt(result.count) || 0 : 0,
  };
}

export async function getPageContent(pageKey: string): Promise<PageContent[]> {
  return query<PageContent>(
    'SELECT * FROM page_content WHERE page_key = $1 ORDER BY sort_order',
    [pageKey]
  );
}

export interface SeoMetadata {
  pagePath: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

export async function getSeoMetadata(pagePath: string): Promise<SeoMetadata | null> {
  return queryOne<SeoMetadata>(
    'SELECT page_path, meta_title, meta_description, meta_keywords FROM seo_metadata WHERE page_path = $1',
    [pagePath]
  );
}

// Legacy compat: convert SiteSettings to GeneralSettings shape
export async function getGeneralSettings(): Promise<GeneralSettings | null> {
  const s = await getSettings();
  if (!s) return null;
  return {
    companyName: s.companyName,
    slogan: s.slogan || '',
    contact: {
      address: s.address || '',
      zipcode: s.zipcode || '',
      city: s.city || '',
      phone: s.phone || '',
      email: s.email || '',
    },
    hours: {
      weekdays: s.hoursWeekdays || '',
      saturday: s.hoursSaturday || '',
      sunday: s.hoursSunday || '',
    },
    social: {
      instagram: s.instagram || undefined,
      facebook: s.facebook || undefined,
    },
  };
}

export async function getHomepageSettings(): Promise<HomepageSettings | null> {
  const sections = await getPageContent('homepage');
  const hero = sections.find((s) => s.sectionKey === 'hero');
  if (!hero) return null;
  const c = hero.content;
  return {
    heroTitle: (c.title_line1 as string) || 'AU FORMAT',
    heroSubtitle: (c.title_line2 as string) || '',
    ctaButton: (c.cta_primary as string) || 'Demander un devis',
    secondaryButton: (c.cta_secondary as string) || 'Nos realisations',
  };
}
