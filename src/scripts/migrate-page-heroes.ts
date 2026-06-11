import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// Sections éditables pour les pages qui n'en avaient pas (demande de Noémie).
// ON CONFLICT DO NOTHING : ne touche jamais à du contenu déjà saisi.
const SECTIONS: { pageKey: string; sectionKey: string; content: Record<string, unknown>; sortOrder: number }[] = [
  // Réalisations
  { pageKey: 'realisations', sectionKey: 'hero', sortOrder: 0, content: {
    subtitle_top: 'Notre portfolio',
    title: 'Nos réalisations',
    description: 'Découvrez nos créations sur mesure pour particuliers et professionnels.',
  } },
  // Matériaux
  { pageKey: 'materiaux', sectionKey: 'hero', sortOrder: 0, content: {
    subtitle_top: 'Nos essences',
    title: 'Matériaux',
    description: 'Des essences nobles et durables, sélectionnées pour leur qualité et leur beauté.',
  } },
  // Avis
  { pageKey: 'avis', sectionKey: 'hero', sortOrder: 0, content: {
    subtitle_top: 'Témoignages',
    title: 'Avis clients',
    description: 'La satisfaction de nos clients est notre meilleure carte de visite.',
  } },
  // Contact
  { pageKey: 'contact', sectionKey: 'hero', sortOrder: 0, content: {
    subtitle_top: 'Parlons de votre projet',
    title: 'Contactez-nous',
    description: 'Devis gratuit et sans engagement. Réponse sous 24h.',
  } },
  // Blog
  { pageKey: 'blog', sectionKey: 'hero', sortOrder: 0, content: {
    kicker: 'Journal · N° 01',
    title_prefix: 'Le',
    title_accent: 'Journal',
    description: "Conseils, inspirations & savoir-faire d'un atelier passionné par le bois, le geste juste et les pièces qui traversent les générations.",
  } },
  // Atelier Lille
  { pageKey: 'menuiserie-lille', sectionKey: 'hero', sortOrder: 0, content: {
    subtitle_top: 'Atelier Cysoing — Métropole lilloise',
    title: 'Menuiserie sur mesure à Lille',
    description: 'Fabrication artisanale de meubles, dressings, cuisines et agencements en bois massif. Atelier à Cysoing, interventions dans tout le Nord.',
  } },
  { pageKey: 'menuiserie-lille', sectionKey: 'intro', sortOrder: 1, content: {
    title: 'Votre menuisier ébéniste près de Lille',
    paragraphs: [
      "Notre atelier de Cysoing, situé à 15 minutes au sud de Lille, conçoit et fabrique du mobilier sur mesure pour les particuliers et les professionnels de la métropole lilloise. Chaque projet est pensé, dessiné et réalisé dans notre atelier équipé de machines traditionnelles et numériques.",
      "Que vous habitiez Lille, Villeneuve-d'Ascq, Roubaix, Tourcoing, Marcq-en-Barœul ou les communes environnantes, nous nous déplaçons gratuitement pour une prise de mesures et un échange sur votre projet. De la conception à la pose, un seul interlocuteur vous accompagne.",
    ],
  } },
  { pageKey: 'menuiserie-lille', sectionKey: 'why', sortOrder: 2, content: {
    items: [
      { icon: '📍', title: 'Proximité', desc: 'Atelier à Cysoing, à 15 min de Lille centre. Intervention rapide dans toute la métropole lilloise et le département du Nord.' },
      { icon: '🪚', title: 'Fabrication locale', desc: "Tout est conçu et fabriqué dans notre atelier. Pas de sous-traitance, pas d'intermédiaire : vous échangez directement avec l'artisan." },
      { icon: '🌳', title: 'Bois sélectionnés', desc: 'Chêne, noyer, hêtre, frêne… Nous travaillons des essences nobles, françaises et européennes, choisies pour leur qualité et leur durabilité.' },
      { icon: '📐', title: 'Sur mesure intégral', desc: 'Chaque meuble est unique. Dimensions, essences, finitions : tout est adapté à votre espace et à vos envies.' },
    ],
  } },
  { pageKey: 'menuiserie-lille', sectionKey: 'areas', sortOrder: 3, content: {
    items: [
      'Lille', 'Cysoing', "Villeneuve-d'Ascq", 'Roubaix', 'Tourcoing',
      'Marcq-en-Barœul', 'Lambersart', 'Wasquehal', 'Seclin', 'Templeuve',
      'Orchies', 'Pont-à-Marcq', 'Genech', 'Mérignies', 'Péronne-en-Mélantois',
      'Lesquin', 'Faches-Thumesnil', 'Haubourdin', 'Loos', 'Hem',
    ],
  } },
  { pageKey: 'menuiserie-lille', sectionKey: 'cta', sortOrder: 4, content: {
    title: 'Un projet de menuiserie à Lille ?',
    text: 'Contactez-nous pour un devis gratuit et sans engagement. Déplacement offert dans toute la métropole lilloise.',
  } },
  // Atelier Côte d'Opale
  { pageKey: 'menuiserie-le-touquet', sectionKey: 'hero', sortOrder: 0, content: {
    subtitle_top: "Atelier La Calotterie — Côte d'Opale",
    title: 'Menuiserie sur mesure au Touquet et Montreuil-sur-Mer',
    description: "Mobilier sur mesure en bois massif pour particuliers et professionnels de la Côte d'Opale et du Pas-de-Calais.",
  } },
  { pageKey: 'menuiserie-le-touquet', sectionKey: 'intro', sortOrder: 1, content: {
    title: "Votre menuisier ébéniste sur la Côte d'Opale",
    paragraphs: [
      "Notre second atelier, situé à La Calotterie aux portes de Montreuil-sur-Mer, dessert la Côte d'Opale et le littoral du Pas-de-Calais. À quelques minutes du Touquet-Paris-Plage, nous concevons et fabriquons du mobilier sur mesure adapté aux résidences principales comme aux maisons secondaires du bord de mer.",
      "Du dressing d'une villa au Touquet à l'agencement complet d'un commerce à Boulogne-sur-Mer, chaque projet est réalisé avec le même soin artisanal. Nous nous déplaçons gratuitement pour la prise de mesures sur toute la Côte d'Opale et dans le Montreuillois.",
    ],
  } },
  { pageKey: 'menuiserie-le-touquet', sectionKey: 'why', sortOrder: 2, content: {
    items: [
      { icon: '🏖️', title: 'Ancrage local', desc: 'Atelier à La Calotterie, au cœur du Montreuillois. Connaissance du bâti local, des contraintes des maisons de bord de mer et des résidences de standing.' },
      { icon: '🪚', title: 'Artisanat authentique', desc: "Fabrication intégrale en atelier, sans sous-traitance. Chaque pièce est signée par l'artisan qui l'a conçue, fabriquée et posée." },
      { icon: '🏠', title: 'Résidences principales & secondaires', desc: 'Habitués des projets pour résidences secondaires : nous gérons les mesures, la fabrication et la pose même en votre absence.' },
      { icon: '📐', title: 'Adaptation au bâti ancien', desc: "Expertise des murs courbes, plafonds bas et sols irréguliers propres aux maisons de caractère du littoral et de l'arrière-pays." },
    ],
  } },
  { pageKey: 'menuiserie-le-touquet', sectionKey: 'areas', sortOrder: 3, content: {
    items: [
      'Le Touquet-Paris-Plage', 'Montreuil-sur-Mer', 'La Calotterie', 'Étaples',
      'Berck', 'Boulogne-sur-Mer', 'Le Portel', 'Hardelot', 'Merlimont',
      'Stella-Plage', 'Cucq', 'Rang-du-Fliers', 'Verton', 'Beaurainville',
      'Hesdin', 'Fruges', 'Hucqueliers', 'Desvres', 'Samer', 'Camiers',
    ],
  } },
  { pageKey: 'menuiserie-le-touquet', sectionKey: 'cta', sortOrder: 4, content: {
    title: "Un projet sur la Côte d'Opale ?",
    text: 'Contactez-nous pour un devis gratuit et sans engagement. Déplacement offert du Touquet à Boulogne-sur-Mer.',
  } },
];

async function migrate() {
  for (const s of SECTIONS) {
    const result = await pool.query(
      `INSERT INTO page_content (page_key, section_key, content, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (page_key, section_key) DO NOTHING`,
      [s.pageKey, s.sectionKey, JSON.stringify(s.content), s.sortOrder]
    );
    console.log(`${result.rowCount ? '✓ créé ' : '· déjà présent'} ${s.pageKey}/${s.sectionKey}`);
  }
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
