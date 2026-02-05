import { query, queryOne } from './db';
import type { Realisation, Avis, Materiau, TeamMember, SiteSettings, Category, PageContent, GeneralSettings, HomepageSettings } from './types';

export async function getRealisations(): Promise<Realisation[]> {
  const rows = await query<Realisation & { categorySlug: string; categoryLabel: string }>(
    `SELECT r.*, c.slug as category_slug, c.label as category_label
     FROM realisations r
     LEFT JOIN categories c ON r.category_id = c.id
     WHERE r.published = true
     ORDER BY r.date DESC`
  );
  return rows.map((r) => ({
    ...r,
    category: r.categorySlug || '',
    categoryLabel: r.categoryLabel || '',
  }));
}

export async function getAvis(): Promise<Avis[]> {
  return query<Avis>(
    'SELECT * FROM avis WHERE published = true ORDER BY date DESC'
  );
}

export async function getMateriaux(): Promise<Materiau[]> {
  const rows = await query<Materiau & { categorySlug: string; categoryLabel: string }>(
    `SELECT m.*, c.slug as category_slug, c.label as category_label
     FROM materiaux m
     LEFT JOIN categories c ON m.category_id = c.id
     WHERE m.published = true
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
