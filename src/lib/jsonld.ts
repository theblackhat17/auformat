import { SITE_URL, SITE_NAME, LOCATIONS, PHONE_INTL, EMAIL, SOCIALS } from './seo';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/img/logo.png`,
      width: 200,
      height: 65,
    },
    description: 'Menuiserie et agencement sur mesure dans le Nord et le Pas-de-Calais. Fabrication artisanale de meubles, dressings, cuisines et agencements en bois massif.',
    email: EMAIL,
    telephone: PHONE_INTL,
    address: [
      {
        '@type': 'PostalAddress',
        streetAddress: LOCATIONS.cysoing.streetAddress,
        addressLocality: LOCATIONS.cysoing.city,
        postalCode: LOCATIONS.cysoing.postalCode,
        addressRegion: LOCATIONS.cysoing.region,
        addressCountry: 'FR',
      },
      {
        '@type': 'PostalAddress',
        streetAddress: LOCATIONS.calotterie.streetAddress,
        addressLocality: LOCATIONS.calotterie.city,
        postalCode: LOCATIONS.calotterie.postalCode,
        addressRegion: LOCATIONS.calotterie.region,
        addressCountry: 'FR',
      },
    ],
    sameAs: [
      SOCIALS.instagram,
      SOCIALS.facebook,
      SOCIALS.googleBusinessCysoing,
      SOCIALS.googleBusinessCalotterie,
    ].filter(Boolean),
    knowsAbout: [
      'menuiserie sur mesure', 'ebenisterie', 'agencement interieur',
      'meuble bois massif', 'dressing sur mesure', 'cuisine bois',
      'bibliotheque sur mesure', 'agencement commercial',
    ],
  };
}

interface AggregateRatingData {
  ratingValue: number;
  reviewCount: number;
}

function buildLocalBusiness(key: 'cysoing' | 'calotterie', rating?: AggregateRatingData) {
  const loc = LOCATIONS[key];
  return {
    '@context': 'https://schema.org',
    '@type': 'Carpenter',
    '@id': `${SITE_URL}/#${key}`,
    name: loc.name,
    image: `${SITE_URL}/img/logo.png`,
    url: key === 'cysoing' ? `${SITE_URL}/menuiserie-lille` : `${SITE_URL}/menuiserie-le-touquet`,
    telephone: PHONE_INTL,
    email: EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: loc.streetAddress,
      addressLocality: loc.city,
      postalCode: loc.postalCode,
      addressRegion: loc.region,
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: loc.lat,
      longitude: loc.lng,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
    ],
    areaServed: loc.areaServed.map((name) => {
      const nonCities = ['Metropole lilloise', 'Nord', 'Côte d\'Opale', 'Pas-de-Calais'];
      return { '@type': nonCities.includes(name) ? 'AdministrativeArea' : 'City', name };
    }),
    priceRange: '$$',
    branchOf: { '@id': `${SITE_URL}/#organization` },
    ...(rating && rating.reviewCount > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating.ratingValue,
        bestRating: 5,
        worstRating: 1,
        reviewCount: rating.reviewCount,
      },
    } : {}),
  };
}

export function localBusinessCysoingJsonLd(rating?: AggregateRatingData) {
  return buildLocalBusiness('cysoing', rating);
}

export function localBusinessCalotterieJsonLd(rating?: AggregateRatingData) {
  return buildLocalBusiness('calotterie', rating);
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Menuiserie et agencement sur mesure',
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'fr',
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function serviceJsonLd(services: { name: string; description: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/#services`,
    provider: { '@id': `${SITE_URL}/#organization` },
    serviceType: 'Menuiserie sur mesure',
    areaServed: [
      ...LOCATIONS.cysoing.areaServed.map((name) => ({ '@type': 'City', name })),
      ...LOCATIONS.calotterie.areaServed.map((name) => ({ '@type': 'City', name })),
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services de menuiserie sur mesure',
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          description: s.description,
          url: s.url,
        },
      })),
    },
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
