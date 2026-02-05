export const SITE_URL = 'https://www.auformat.com';
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
    lat: 50.5711,
    lng: 3.2128,
    areaServed: ['Lille', 'Cysoing', 'Villeneuve-d\'Ascq', 'Roubaix', 'Tourcoing', 'Metropole lilloise', 'Nord'],
  },
  calotterie: {
    name: 'Au Format - Atelier Cote d\'Opale',
    streetAddress: '1056 Rue de Montreuil',
    city: 'La Calotterie',
    postalCode: '62170',
    region: 'Hauts-de-France',
    department: 'Pas-de-Calais',
    nearCity: 'Le Touquet-Paris-Plage',
    lat: 50.4628,
    lng: 1.7614,
    areaServed: ['Montreuil-sur-Mer', 'Le Touquet-Paris-Plage', 'Boulogne-sur-Mer', 'Berck', 'Etaples', 'Cote d\'Opale', 'Pas-de-Calais'],
  },
} as const;

export const PHONE = '07 88 91 60 68';
export const PHONE_INTL = '+33788916068';
export const EMAIL = 'contact@auformat.fr';

export const SOCIALS = {
  instagram: 'https://www.instagram.com/auformat/',
  facebook: 'https://www.facebook.com/profile.php?id=100087409924806',
};

export const HOURS = {
  weekdays: '08:00-18:00',
  saturday: 'Ferme',
  sunday: 'Ferme',
};

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
  'agencement interieur Nord', 'agencement sur mesure Pas-de-Calais',
  // Bois & metier
  'ebenisterie', 'ebeniste Nord', 'artisan menuisier',
  'bois massif', 'bois sur mesure', 'travail du bois',
  'menuiserie artisanale', 'menuiserie traditionnelle',
  // Produits
  'meuble sur mesure', 'meuble sur mesure Lille',
  'dressing sur mesure', 'dressing sur mesure Nord',
  'cuisine bois', 'cuisine sur mesure',
  'bibliotheque sur mesure', 'meuble TV sur mesure',
  'bureau sur mesure', 'etagere sur mesure',
  'plan de travail bois', 'escalier bois',
  'agencement commercial',
  // Essences
  'chene massif', 'noyer', 'hetre', 'frene', 'bois local Nord',
];
