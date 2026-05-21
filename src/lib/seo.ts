export const SITE_URL = 'https://auformat.com';
export const SITE_NAME = 'Au Format';
export const DEFAULT_LOCALE = 'fr_FR';

export const LOCATIONS = {
  cysoing: {
    name: 'Au Format - Atelier Cysoing',
    streetAddress: '88 Imp. de la Briqueterie',
    city: 'Cysoing',
    postalCode: '59830',
    region: 'Hauts-de-France',
    department: 'Nord',
    nearCity: 'Lille',
    lat: 50.57549,
    lng: 3.21206,
    areaServed: ['Lille', 'Cysoing', 'Villeneuve-d\'Ascq', 'Roubaix', 'Tourcoing', 'Metropole lilloise', 'Nord'],
  },
  calotterie: {
    name: 'Au Format - Atelier Côte d\'Opale',
    streetAddress: '1056 Rue de Montreuil',
    city: 'La Calotterie',
    postalCode: '62170',
    region: 'Hauts-de-France',
    department: 'Pas-de-Calais',
    nearCity: 'Le Touquet-Paris-Plage',
    lat: 50.47213,
    lng: 1.73850,
    areaServed: ['Montreuil-sur-Mer', 'Le Touquet-Paris-Plage', 'Boulogne-sur-Mer', 'Berck', 'Etaples', 'Côte d\'Opale', 'Pas-de-Calais'],
  },
} as const;

export const PHONE = '07 88 91 60 68';
export const PHONE_INTL = '+33788916068';
export const EMAIL = 'contact@auformat.fr';

export const SOCIALS = {
  instagram: 'https://www.instagram.com/auformat/',
  facebook: 'https://www.facebook.com/profile.php?id=100087409924806',
  googleBusinessCysoing: 'https://www.google.com/maps/place/Au+format/@50.5754919,3.212056,17z/data=!3m1!4b1!4m6!3m5!1s0x47c2d139b2c06069:0x82a3d4bce3fdff91',
  googleBusinessCalotterie: 'https://www.google.com/maps/place/Au+format/@50.4721322,1.7385005,17z/data=!3m1!4b1!4m6!3m5!1s0x47ddc5850eaa0a43:0xa15586d2b09b837e',
};

export const HOURS = {
  weekdays: '08:00-18:00',
  saturday: 'Fermé',
  sunday: 'Fermé',
};

import type { Metadata } from 'next';
import { getSeoMetadata } from './content';

export async function buildPageMetadata(
  pagePath: string,
  fallback: { title: string; description: string; keywords?: string[]; ogTitle?: string; ogDescription?: string },
): Promise<Metadata> {
  const seo = await getSeoMetadata(pagePath).catch(() => null);

  const title = seo?.metaTitle || fallback.title;
  const description = seo?.metaDescription || fallback.description;

  const canonicalUrl = `${SITE_URL}${pagePath === '/' ? '' : pagePath}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: { 'fr': canonicalUrl },
    },
    openGraph: {
      type: 'website',
      locale: DEFAULT_LOCALE,
      siteName: SITE_NAME,
      title: fallback.ogTitle || title,
      description: fallback.ogDescription || description,
      url: canonicalUrl,
      images: [
        {
          url: `${SITE_URL}/api/og?title=${encodeURIComponent(fallback.ogTitle || title)}&path=${encodeURIComponent(pagePath)}`,
          width: 1200,
          height: 630,
          alt: fallback.ogTitle || title,
        },
      ],
    },
  };
}

export const SEO_KEYWORDS = [
  // Marque
  'Au Format', 'au format menuiserie',
  // Menuiserie + villes
  'menuiserie sur mesure', 'menuiserie Lille', 'menuiserie Cysoing',
  'menuiserie Le Touquet', 'menuiserie Touquet Paris Plage',
  'menuiserie Montreuil-sur-Mer', 'menuiserie Montreuil sur Mer',
  'menuiserie Nord', 'menuiserie Pas-de-Calais',
  'menuiserie sur mesure Lille', 'menuiserie sur mesure Nord',
  // Agencement + villes
  'agencement sur mesure', 'agencement Cysoing', 'agencement Lille',
  'agencement intérieur Nord', 'agencement sur mesure Pas-de-Calais',
  // Bois & metier
  'ébénisterie', 'ébéniste Nord', 'artisan menuisier',
  'bois massif', 'bois sur mesure', 'travail du bois',
  'menuiserie artisanale', 'menuiserie traditionnelle',
  // Produits
  'meuble sur mesure', 'meuble sur mesure Lille',
  'dressing sur mesure', 'dressing sur mesure Nord',
  'cuisine bois', 'cuisine sur mesure',
  'bibliothèque sur mesure', 'meuble TV sur mesure',
  'bureau sur mesure', 'étagère sur mesure',
  'plan de travail bois', 'escalier bois',
  'agencement commercial',
  // Essences
  'chêne massif', 'noyer', 'hêtre', 'frêne', 'bois local Nord',
];
