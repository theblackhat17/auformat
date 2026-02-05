import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Creating seo_metadata table...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS seo_metadata (
      page_path TEXT PRIMARY KEY,
      meta_title TEXT NOT NULL DEFAULT '',
      meta_description TEXT NOT NULL DEFAULT '',
      meta_keywords TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log('Seeding default SEO data...');

  const pages = [
    {
      path: '/',
      title: 'Au Format | Menuiserie sur mesure a Cysoing (Lille) et Montreuil-sur-Mer (Le Touquet)',
      description: 'Au Format, menuiserie et agencement sur mesure dans le Nord et le Pas-de-Calais. Meubles, dressings, cuisines, bibliotheques en bois massif. Ateliers a Cysoing pres de Lille et a La Calotterie pres du Touquet-Paris-Plage. Devis gratuit.',
      keywords: 'Au Format, menuiserie sur mesure, menuiserie Lille, menuiserie Cysoing, agencement sur mesure, meuble sur mesure, bois massif',
    },
    {
      path: '/about',
      title: 'A propos - Notre histoire et nos valeurs',
      description: 'Decouvrez Au Format, menuiserie artisanale dans le Nord et le Pas-de-Calais. Notre equipe passionnee cree du mobilier sur mesure a Cysoing pres de Lille et a La Calotterie pres du Touquet.',
      keywords: 'menuiserie artisanale, ebeniste Nord, atelier menuiserie Cysoing, artisan bois Lille, equipe Au Format',
    },
    {
      path: '/realisations',
      title: 'Nos realisations - Portfolio menuiserie sur mesure',
      description: 'Parcourez nos realisations de menuiserie sur mesure : cuisines, dressings, bibliotheques, meubles TV, agencements commerciaux. Projets realises a Lille, Cysoing, Le Touquet et dans tout le Nord-Pas-de-Calais.',
      keywords: 'realisations menuiserie, portfolio meuble sur mesure, cuisine sur mesure Lille, dressing sur mesure Nord',
    },
    {
      path: '/processus',
      title: 'Notre processus - De la conception a l\'installation',
      description: 'Decouvrez les 6 etapes de votre projet de menuiserie sur mesure chez Au Format : premier contact, conception, devis gratuit, fabrication en atelier, installation et suivi.',
      keywords: 'processus menuiserie, etapes projet meuble sur mesure, fabrication meuble bois, devis gratuit menuiserie',
    },
    {
      path: '/contact',
      title: 'Contact - Devis gratuit menuiserie sur mesure',
      description: 'Contactez Au Format pour un devis gratuit. Menuiserie sur mesure a Cysoing pres de Lille et a La Calotterie pres du Touquet-Paris-Plage. Tel : 07 88 91 60 68.',
      keywords: 'devis menuiserie gratuit, contact menuisier Lille, menuiserie Cysoing contact, menuiserie Le Touquet contact',
    },
    {
      path: '/avis',
      title: 'Avis clients - Temoignages menuiserie sur mesure',
      description: 'Lisez les avis de nos clients sur nos realisations de menuiserie sur mesure. Satisfaction client et travail de qualite a Cysoing, Lille, Le Touquet et Montreuil-sur-Mer.',
      keywords: 'avis menuiserie Lille, temoignages clients meuble sur mesure, avis Au Format',
    },
    {
      path: '/configurateur',
      title: 'Configurateur de meubles sur mesure en ligne',
      description: 'Configurez votre meuble sur mesure en ligne : bibliotheque, dressing, meuble TV, bureau, plan de travail. Choisissez vos dimensions, materiaux et options. Devis instantane.',
      keywords: 'configurateur meuble sur mesure, meuble sur mesure en ligne, configurateur dressing, devis meuble en ligne',
    },
    {
      path: '/homemade',
      title: 'Savoir-faire - Expertise menuiserie et ebenisterie',
      description: 'Decouvrez le savoir-faire d\'Au Format : menuiserie traditionnelle, ebenisterie, usinage numerique CNC. L\'alliance de l\'artisanat et des technologies modernes.',
      keywords: 'savoir-faire menuiserie, ebenisterie artisanale, menuiserie CNC, artisan menuisier Nord',
    },
    {
      path: '/materiaux',
      title: 'Nos materiaux - Essences de bois et panneaux',
      description: 'Decouvrez notre selection d\'essences de bois nobles, locaux et exotiques : chene, noyer, hetre, frene. Materiaux de qualite pour vos meubles sur mesure.',
      keywords: 'essences de bois, bois massif meuble, chene massif, noyer, hetre, materiaux menuiserie',
    },
  ];

  for (const p of pages) {
    await pool.query(
      `INSERT INTO seo_metadata (page_path, meta_title, meta_description, meta_keywords)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (page_path) DO NOTHING`,
      [p.path, p.title, p.description, p.keywords]
    );
  }

  console.log(`Seeded ${pages.length} pages.`);
  await pool.end();
  console.log('Done!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
