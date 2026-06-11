export const revalidate = 300;

import type { Metadata } from 'next';
import { getServices, getAvisStats, getPageContent } from '@/lib/content';
import { buildPageMetadata, SITE_URL, LOCATIONS } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbJsonLd, localBusinessCalotterieJsonLd } from '@/lib/jsonld';
import { LocalAtelierSections } from '@/components/local/LocalAtelierSections';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/menuiserie-le-touquet', {
    title: 'Menuiserie sur mesure au Touquet et Montreuil-sur-Mer — Atelier Côte d\'Opale',
    description:
      'Au Format, menuisier ébéniste à La Calotterie près du Touquet-Paris-Plage et de Montreuil-sur-Mer. Meubles, dressings, cuisines et agencements sur mesure en bois massif. Devis gratuit sur la Côte d\'Opale.',
    keywords: [
      'menuiserie Le Touquet',
      'menuisier Montreuil-sur-Mer',
      'meuble sur mesure Côte d\'Opale',
      'ébéniste Pas-de-Calais',
      'menuiserie La Calotterie',
      'dressing sur mesure Le Touquet',
      'cuisine sur mesure Montreuil',
      'agencement Berck Étaples',
    ],
  });
}

const loc = LOCATIONS.calotterie;

const DEFAULT_INTRO = {
  title: 'Votre menuisier ébéniste sur la Côte d\'Opale',
  paragraphs: [
    `Notre second atelier, situé à La Calotterie aux portes de Montreuil-sur-Mer, dessert la Côte d'Opale et le littoral du Pas-de-Calais. À quelques minutes du Touquet-Paris-Plage, nous concevons et fabriquons du mobilier sur mesure adapté aux résidences principales comme aux maisons secondaires du bord de mer.`,
    `Du dressing d'une villa au Touquet à l'agencement complet d'un commerce à Boulogne-sur-Mer, chaque projet est réalisé avec le même soin artisanal. Nous nous déplaçons gratuitement pour la prise de mesures sur toute la Côte d'Opale et dans le Montreuillois.`,
  ],
};

const DEFAULT_WHY = [
  { icon: '🏖️', title: 'Ancrage local', desc: 'Atelier à La Calotterie, au cœur du Montreuillois. Connaissance du bâti local, des contraintes des maisons de bord de mer et des résidences de standing.' },
  { icon: '🪚', title: 'Artisanat authentique', desc: 'Fabrication intégrale en atelier, sans sous-traitance. Chaque pièce est signée par l\'artisan qui l\'a conçue, fabriquée et posée.' },
  { icon: '🏠', title: 'Résidences principales & secondaires', desc: 'Habitués des projets pour résidences secondaires : nous gérons les mesures, la fabrication et la pose même en votre absence.' },
  { icon: '📐', title: 'Adaptation au bâti ancien', desc: 'Expertise des murs courbes, plafonds bas et sols irréguliers propres aux maisons de caractère du littoral et de l\'arrière-pays.' },
];

const DEFAULT_AREAS = [
  'Le Touquet-Paris-Plage', 'Montreuil-sur-Mer', 'La Calotterie', 'Étaples',
  'Berck', 'Boulogne-sur-Mer', 'Le Portel', 'Hardelot', 'Merlimont',
  'Stella-Plage', 'Cucq', 'Rang-du-Fliers', 'Verton', 'Beaurainville',
  'Hesdin', 'Fruges', 'Hucqueliers', 'Desvres', 'Samer', 'Camiers',
];

export default async function MenuiserieLeTouquetPage() {
  const [services, avisStats, sections] = await Promise.all([
    getServices(),
    getAvisStats(),
    getPageContent('menuiserie-le-touquet'),
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
        { name: 'Menuiserie Le Touquet', url: `${SITE_URL}/menuiserie-le-touquet` },
      ])} />
      <JsonLd data={localBusinessCalotterieJsonLd(avisStats)} />

      <LocalAtelierSections
        heroKicker={hero.subtitle_top || "Atelier La Calotterie — Côte d'Opale"}
        heroTitle={hero.title || 'Menuiserie sur mesure au Touquet et Montreuil-sur-Mer'}
        heroIntro={hero.description || "Mobilier sur mesure en bois massif pour particuliers et professionnels de la Côte d'Opale et du Pas-de-Calais."}
        intro={intro}
        introDefaults={DEFAULT_INTRO}
        services={services}
        servicesTitle="Nos services sur la Côte d'Opale"
        whyTitle="Pourquoi choisir Au Format sur la Côte d'Opale ?"
        why={why}
        atelier={{ title: 'Notre atelier à La Calotterie', address: `${loc.streetAddress}, ${loc.postalCode} ${loc.city}` }}
        mapTitle="Atelier Au Format La Calotterie"
        mapSrc={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2535!2d${loc.lng}!3d${loc.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTDCsDI3JzQ2LjEiTiAxwrA0NSc0MS4wIkU!5e0!3m2!1sfr!2sfr`}
        areasTitle="Zone d'intervention sur la Côte d'Opale"
        areasIntro="Nous intervenons dans un rayon de 50 km autour de notre atelier de La Calotterie, du Touquet à Boulogne-sur-Mer en passant par le Montreuillois et l'arrière-pays."
        areas={areas}
        otherLocation={{
          question: 'Vous êtes dans la métropole lilloise ?',
          href: '/menuiserie-lille',
          label: 'Découvrez notre atelier à Cysoing, près de Lille',
        }}
        cta={{
          title: cta.title || "Un projet sur la Côte d'Opale ?",
          text: cta.text || 'Contactez-nous pour un devis gratuit et sans engagement. Déplacement offert du Touquet à Boulogne-sur-Mer.',
        }}
      />
    </>
  );
}
