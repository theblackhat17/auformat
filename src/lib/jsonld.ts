import { SITE_URL, SITE_NAME, LOCATIONS, PHONE_INTL, EMAIL, SOCIALS } from './seo';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/img/logo_tmp.png`,
    description: 'Menuiserie et agencement sur mesure dans le Nord et le Pas-de-Calais. Fabrication artisanale de meubles, dressings, cuisines et agencements en bois massif.',
    email: EMAIL,
    telephone: PHONE_INTL,
    address: [
      {
        '@type': 'PostalAddress',
        streetAddress: LOCATIONS.cysoing.streetAddress,
        addressLocality: LOCATIONS.cysoing.city,
        postalCode: LOCATIONS.cysoing.postalCode,
        addressRegion: LOCATIONS.cysoing.department,
        addressCountry: 'FR',
      },
      {
        '@type': 'PostalAddress',
        streetAddress: LOCATIONS.calotterie.streetAddress,
        addressLocality: LOCATIONS.calotterie.city,
        postalCode: LOCATIONS.calotterie.postalCode,
        addressRegion: LOCATIONS.calotterie.department,
        addressCountry: 'FR',
      },
    ],
    sameAs: [SOCIALS.instagram, SOCIALS.facebook],
    knowsAbout: [
      'menuiserie sur mesure', 'ebenisterie', 'agencement interieur',
      'meuble bois massif', 'dressing sur mesure', 'cuisine bois',
      'bibliotheque sur mesure', 'agencement commercial',
    ],
  };
}

function buildLocalBusiness(key: 'cysoing' | 'calotterie') {
  const loc = LOCATIONS[key];
  return {
    '@context': 'https://schema.org',
    '@type': 'Carpenter',
    '@id': `${SITE_URL}/#${key}`,
    name: loc.name,
    image: `${SITE_URL}/img/logo_tmp.png`,
    url: SITE_URL,
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
    areaServed: loc.areaServed.map((name) => ({ '@type': 'City', name })),
    priceRange: '$$',
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
  };
}

export function localBusinessCysoingJsonLd() {
  return buildLocalBusiness('cysoing');
}

export function localBusinessCalotterieJsonLd() {
  return buildLocalBusiness('calotterie');
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
