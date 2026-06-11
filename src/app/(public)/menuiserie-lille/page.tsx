export const revalidate = 300;

import type { Metadata } from 'next';
import { getServices, getAvisStats, getPageContent } from '@/lib/content';
import { buildPageMetadata, SITE_URL, LOCATIONS } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, localBusinessCysoingJsonLd } from '@/lib/jsonld';
import { LocalAtelierSections } from '@/components/local/LocalAtelierSections';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/menuiserie-lille', {
    title: 'Menuiserie sur mesure à Lille et Cysoing — Atelier Nord',
    description:
      'Au Format, menuisier ébéniste à Cysoing près de Lille. Fabrication artisanale de meubles, dressings, cuisines, bibliothèques et agencements sur mesure. Atelier dans la métropole lilloise, devis gratuit.',
    keywords: [
      'menuiserie Lille',
      'menuisier Cysoing',
      'meuble sur mesure Lille',
      'ébéniste Nord',
      'dressing sur mesure Lille',
      'cuisine sur mesure métropole lilloise',
      'menuiserie sur mesure Villeneuve-d\'Ascq',
      'agencement Roubaix Tourcoing',
    ],
  });
}

const loc = LOCATIONS.cysoing;

const DEFAULT_INTRO = {
  title: 'Votre menuisier ébéniste près de Lille',
  paragraphs: [
    `Notre atelier de Cysoing, situé à 15 minutes au sud de Lille, conçoit et fabrique du mobilier sur mesure pour les particuliers et les professionnels de la métropole lilloise. Chaque projet est pensé, dessiné et réalisé dans notre atelier équipé de machines traditionnelles et numériques.`,
    `Que vous habitiez Lille, Villeneuve-d'Ascq, Roubaix, Tourcoing, Marcq-en-Barœul ou les communes environnantes, nous nous déplaçons gratuitement pour une prise de mesures et un échange sur votre projet. De la conception à la pose, un seul interlocuteur vous accompagne.`,
  ],
};

const DEFAULT_WHY = [
  { icon: '📍', title: 'Proximité', desc: 'Atelier à Cysoing, à 15 min de Lille centre. Intervention rapide dans toute la métropole lilloise et le département du Nord.' },
  { icon: '🪚', title: 'Fabrication locale', desc: 'Tout est conçu et fabriqué dans notre atelier. Pas de sous-traitance, pas d\'intermédiaire : vous échangez directement avec l\'artisan.' },
  { icon: '🌳', title: 'Bois sélectionnés', desc: 'Chêne, noyer, hêtre, frêne… Nous travaillons des essences nobles, françaises et européennes, choisies pour leur qualité et leur durabilité.' },
  { icon: '📐', title: 'Sur mesure intégral', desc: 'Chaque meuble est unique. Dimensions, essences, finitions : tout est adapté à votre espace et à vos envies.' },
];

const DEFAULT_AREAS = [
  'Lille', 'Cysoing', 'Villeneuve-d\'Ascq', 'Roubaix', 'Tourcoing',
  'Marcq-en-Barœul', 'Lambersart', 'Wasquehal', 'Seclin', 'Templeuve',
  'Orchies', 'Pont-à-Marcq', 'Genech', 'Mérignies', 'Péronne-en-Mélantois',
  'Lesquin', 'Faches-Thumesnil', 'Haubourdin', 'Loos', 'Hem',
];

export default async function MenuiserieLillePage() {
  const [services, avisStats, sections] = await Promise.all([
    getServices(),
    getAvisStats(),
    getPageContent('menuiserie-lille'),
  ]);

  const getSection = (key: string) => sections.find((s) => s.sectionKey === key)?.content;

  const intro = (getSection('intro') as { title?: string; paragraphs?: string[] }) || DEFAULT_INTRO;
  const why = (getSection('why') as { items?: { icon: string; title: string; desc: string }[] })?.items || DEFAULT_WHY;
  const areas = (getSection('areas') as { items?: string[] })?.items || DEFAULT_AREAS;
  const hero = (getSection('hero') || {}) as Record<string, string>;
  const cta = (getSection('cta') || {}) as Record<string, string>;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', url: SITE_URL },
        { name: 'Menuiserie Lille', url: `${SITE_URL}/menuiserie-lille` },
      ])} />
      <JsonLd data={localBusinessCysoingJsonLd(avisStats)} />

      <LocalAtelierSections
        heroKicker={hero.subtitle_top || 'Atelier Cysoing — Métropole lilloise'}
        heroTitle={hero.title || 'Menuiserie sur mesure à Lille'}
        heroIntro={hero.description || 'Fabrication artisanale de meubles, dressings, cuisines et agencements en bois massif. Atelier à Cysoing, interventions dans tout le Nord.'}
        intro={intro}
        introDefaults={DEFAULT_INTRO}
        services={services}
        servicesTitle="Nos services à Lille et environs"
        whyTitle="Pourquoi choisir Au Format à Lille ?"
        why={why}
        atelier={{ title: 'Notre atelier à Cysoing', address: `${loc.streetAddress}, ${loc.postalCode} ${loc.city}` }}
        mapTitle="Atelier Au Format Cysoing"
        mapSrc={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2535!2d${loc.lng}!3d${loc.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTDCsDM0JzE2LjAiTiAzwrAxMic0Ni4xIkU!5e0!3m2!1sfr!2sfr`}
        areasTitle="Zone d'intervention autour de Lille"
        areasIntro="Nous intervenons dans un rayon de 50 km autour de notre atelier de Cysoing, couvrant l'ensemble de la métropole lilloise et du département du Nord."
        areas={areas}
        otherLocation={{
          question: 'Vous êtes sur la Côte d\'Opale ?',
          href: '/menuiserie-le-touquet',
          label: 'Découvrez notre atelier à La Calotterie, près du Touquet',
        }}
        cta={{
          title: cta.title || 'Un projet de menuiserie à Lille ?',
          text: cta.text || 'Contactez-nous pour un devis gratuit et sans engagement. Déplacement offert dans toute la métropole lilloise.',
        }}
      />
    </>
  );
}
