import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Creating services table...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      subtitle TEXT,
      icon TEXT,
      short_description TEXT,
      image TEXT,
      content JSONB NOT NULL DEFAULT '{}',
      meta_title TEXT,
      meta_description TEXT,
      meta_keywords TEXT,
      sort_order INT DEFAULT 0,
      published BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('Table created. Seeding default services...');

  const services = [
    {
      slug: 'agencement-interieur',
      title: 'Agencement interieur',
      subtitle: 'Des espaces de vie sur mesure',
      icon: '🏠',
      short_description: 'Transformation et optimisation de vos espaces de vie. Habillages muraux, sous-escaliers, alcoves et rangements integres.',
      content: JSON.stringify({
        intro: 'Au Format concoit et realise des agencements interieurs sur mesure pour optimiser chaque recoin de votre habitat. Notre approche artisanale garantit des finitions impeccables et une integration parfaite dans votre interieur.',
        features: [
          { title: 'Etude personnalisee', desc: 'Prise de mesures et conception adaptee a votre espace' },
          { title: 'Fabrication artisanale', desc: 'Chaque element est fabrique dans nos ateliers' },
          { title: 'Pose soignee', desc: 'Installation par nos menuisiers avec finitions sur site' },
        ],
        body: '',
        cta_title: 'Un projet d\'agencement ?',
        cta_text: 'Contactez-nous pour un devis gratuit et personnalise.',
      }),
      meta_title: 'Agencement interieur sur mesure - Au Format | Menuiserie Nord & Pas-de-Calais',
      meta_description: 'Agencement interieur sur mesure en bois massif. Optimisation d\'espaces, rangements, habillages muraux. Ateliers a Cysoing (Lille) et La Calotterie (Le Touquet).',
      meta_keywords: 'agencement interieur, agencement sur mesure, agencement Lille, agencement bois, amenagement interieur Nord',
      sort_order: 1,
    },
    {
      slug: 'cuisines',
      title: 'Cuisines sur mesure',
      subtitle: 'Des cuisines en bois massif uniques',
      icon: '🍳',
      short_description: 'Conception et fabrication de cuisines completes en bois massif. Facades, ilots centraux, plans de travail et rangements.',
      content: JSON.stringify({
        intro: 'Nous concevons des cuisines sur mesure en bois massif, du plan de travail aux facades en passant par l\'ilot central. Chaque cuisine est unique et adaptee a vos habitudes de vie.',
        features: [
          { title: 'Bois massif', desc: 'Chene, noyer, hetre ou frene selon vos preferences' },
          { title: 'Sur mesure integral', desc: 'Dimensions, finitions et ergonomie personnalisees' },
          { title: 'Installation complete', desc: 'Livraison et pose par notre equipe' },
        ],
        body: '',
        cta_title: 'Envie d\'une cuisine sur mesure ?',
        cta_text: 'Demandez votre devis gratuit.',
      }),
      meta_title: 'Cuisine sur mesure en bois massif - Au Format | Menuiserie Lille & Le Touquet',
      meta_description: 'Cuisines sur mesure en bois massif : chene, noyer, hetre. Facades, ilots, plans de travail. Fabrication artisanale dans le Nord et le Pas-de-Calais.',
      meta_keywords: 'cuisine sur mesure, cuisine bois massif, cuisine bois Lille, cuisine artisanale, cuisine sur mesure Nord',
      sort_order: 2,
    },
    {
      slug: 'dressings',
      title: 'Dressings sur mesure',
      subtitle: 'Des dressings qui optimisent votre espace',
      icon: '👔',
      short_description: 'Amenagement complet de dressings et placards sur mesure. Optimisation de l\'espace, choix des finitions et accessoires.',
      content: JSON.stringify({
        intro: 'Un dressing sur mesure s\'adapte parfaitement a votre espace et a vos besoins de rangement. Nous concevons des solutions fonctionnelles et esthetiques en bois massif.',
        features: [
          { title: 'Optimisation de l\'espace', desc: 'Exploitation de chaque centimetre, y compris sous pente' },
          { title: 'Accessoires integres', desc: 'Tiroirs, penderies, etageres, eclairage LED' },
          { title: 'Finitions au choix', desc: 'Bois brut, laque, teinte ou vernis' },
        ],
        body: '',
        cta_title: 'Besoin d\'un dressing sur mesure ?',
        cta_text: 'Nous nous deplacons pour prendre les mesures.',
      }),
      meta_title: 'Dressing sur mesure en bois - Au Format | Menuiserie Nord & Pas-de-Calais',
      meta_description: 'Dressings et placards sur mesure en bois massif. Optimisation d\'espace, sous-pente, accessoires integres. Ateliers a Cysoing et La Calotterie.',
      meta_keywords: 'dressing sur mesure, dressing bois, placard sur mesure, dressing Lille, dressing sur mesure Nord',
      sort_order: 3,
    },
    {
      slug: 'bibliotheques',
      title: 'Bibliotheques sur mesure',
      subtitle: 'Des bibliotheques qui subliment vos murs',
      icon: '📚',
      short_description: 'Bibliotheques murales, sur pied ou encastrees. Du classique au contemporain, en bois massif.',
      content: JSON.stringify({
        intro: 'Une bibliotheque sur mesure transforme un mur en espace de rangement elegant. Nous realisons des bibliotheques adaptees a vos dimensions, votre style et vos collections.',
        features: [
          { title: 'Toutes configurations', desc: 'Murale, encastree, autoportante, sous escalier' },
          { title: 'Styles varies', desc: 'Classique, contemporain, industriel, scandinave' },
          { title: 'Bois selectionnes', desc: 'Chene, noyer, hetre selon l\'ambiance souhaitee' },
        ],
        body: '',
        cta_title: 'Un projet de bibliotheque ?',
        cta_text: 'Parlons de votre projet.',
      }),
      meta_title: 'Bibliotheque sur mesure en bois - Au Format | Menuiserie Lille & Cote d\'Opale',
      meta_description: 'Bibliotheques sur mesure en bois massif : murales, encastrees, sous escalier. Fabrication artisanale dans le Nord et le Pas-de-Calais.',
      meta_keywords: 'bibliotheque sur mesure, bibliotheque bois, bibliotheque murale, bibliotheque Lille, meuble bibliotheque Nord',
      sort_order: 4,
    },
    {
      slug: 'meubles',
      title: 'Meubles sur mesure',
      subtitle: 'Des meubles uniques a votre image',
      icon: '🪑',
      short_description: 'Meubles TV, buffets, commodes, tables et rangements. Chaque piece est concue selon vos envies et dimensions.',
      content: JSON.stringify({
        intro: 'Chaque meuble sur mesure est une piece unique, concue pour s\'integrer parfaitement dans votre interieur. Du meuble TV au buffet, nous realisons tous types de mobilier en bois massif.',
        features: [
          { title: 'Design personnalise', desc: 'Dimensions, essences et finitions a votre choix' },
          { title: 'Fabrication artisanale', desc: 'Assemblages traditionnels, finitions manuelles' },
          { title: 'Durabilite', desc: 'Des meubles concus pour durer des generations' },
        ],
        body: '',
        cta_title: 'Un meuble sur mesure en tete ?',
        cta_text: 'Decrivez-nous votre projet.',
      }),
      meta_title: 'Meuble sur mesure en bois massif - Au Format | Ebenisterie Nord & Pas-de-Calais',
      meta_description: 'Meubles sur mesure en bois massif : meubles TV, buffets, commodes, tables. Ebenisterie artisanale a Cysoing (Lille) et La Calotterie (Le Touquet).',
      meta_keywords: 'meuble sur mesure, meuble bois massif, meuble TV sur mesure, ebeniste Lille, meuble sur mesure Nord',
      sort_order: 5,
    },
    {
      slug: 'bureaux',
      title: 'Bureaux sur mesure',
      subtitle: 'Des espaces de travail inspires',
      icon: '💼',
      short_description: 'Bureaux professionnels et personnels, postes de travail et rangements pour espaces de travail.',
      content: JSON.stringify({
        intro: 'Un bureau sur mesure en bois massif allie confort, fonctionnalite et esthetique. Ideal pour le teletravail ou l\'amenagement d\'un espace professionnel.',
        features: [
          { title: 'Ergonomie', desc: 'Hauteur, profondeur et rangements adaptes a votre usage' },
          { title: 'Gestion des cables', desc: 'Passages de cables integres et discrets' },
          { title: 'Materiaux nobles', desc: 'Bois massif pour un espace de travail inspirant' },
        ],
        body: '',
        cta_title: 'Besoin d\'un bureau sur mesure ?',
        cta_text: 'Contactez-nous pour en discuter.',
      }),
      meta_title: 'Bureau sur mesure en bois - Au Format | Menuiserie Lille & Le Touquet',
      meta_description: 'Bureaux sur mesure en bois massif pour particuliers et professionnels. Ergonomie, rangements integres. Fabrication artisanale dans le Nord.',
      meta_keywords: 'bureau sur mesure, bureau bois massif, bureau teletravail, bureau sur mesure Lille, bureau bois Nord',
      sort_order: 6,
    },
    {
      slug: 'agencement-commercial',
      title: 'Agencement commercial',
      subtitle: 'Des espaces professionnels sur mesure',
      icon: '🏪',
      short_description: 'Amenagement de boutiques, restaurants, hotels et bureaux professionnels. Comptoirs, presentoirs et mobilier d\'accueil.',
      content: JSON.stringify({
        intro: 'Nous realisons l\'agencement complet de vos espaces commerciaux : boutiques, restaurants, hotels, bureaux. Un agencement sur mesure en bois valorise votre image de marque.',
        features: [
          { title: 'Etude de projet', desc: 'Accompagnement de la conception a la realisation' },
          { title: 'Respect des normes', desc: 'Conformite ERP et normes d\'accessibilite' },
          { title: 'Delais maitrises', desc: 'Planning adapte a vos contraintes d\'exploitation' },
        ],
        body: '',
        cta_title: 'Un projet d\'agencement commercial ?',
        cta_text: 'Demandez un rendez-vous pour etudier votre projet.',
      }),
      meta_title: 'Agencement commercial sur mesure - Au Format | Menuiserie Nord & Pas-de-Calais',
      meta_description: 'Agencement commercial en bois sur mesure : boutiques, restaurants, hotels, bureaux. Conception et realisation dans le Nord et le Pas-de-Calais.',
      meta_keywords: 'agencement commercial, agencement boutique, agencement restaurant, agencement bois, menuiserie commerciale Nord',
      sort_order: 7,
    },
    {
      slug: 'plans-de-travail',
      title: 'Plans de travail en bois',
      subtitle: 'Des plans de travail massifs et durables',
      icon: '🪵',
      short_description: 'Plans de travail en bois massif pour cuisines et salles de bain. Decoupe, finition et traitement sur mesure.',
      content: JSON.stringify({
        intro: 'Un plan de travail en bois massif apporte chaleur et authenticite a votre cuisine ou salle de bain. Nous proposons une large gamme d\'essences et de finitions adaptees a un usage intensif.',
        features: [
          { title: 'Essences adaptees', desc: 'Chene, hetre, noyer : des bois durs et resistants' },
          { title: 'Traitement professionnel', desc: 'Huile, vernis ou finition speciale contact alimentaire' },
          { title: 'Decoupe sur mesure', desc: 'Decoupes d\'evier, plaque et ajustements sur site' },
        ],
        body: '',
        cta_title: 'Besoin d\'un plan de travail ?',
        cta_text: 'Demandez votre devis.',
      }),
      meta_title: 'Plan de travail bois massif sur mesure - Au Format | Menuiserie Lille & Le Touquet',
      meta_description: 'Plans de travail en bois massif sur mesure : chene, hetre, noyer. Decoupe, traitement et pose. Ateliers a Cysoing et La Calotterie.',
      meta_keywords: 'plan de travail bois, plan de travail massif, plan de travail chene, plan de travail sur mesure, plan de travail Lille',
      sort_order: 8,
    },
  ];

  for (const s of services) {
    await pool.query(
      `INSERT INTO services (slug, title, subtitle, icon, short_description, content, meta_title, meta_description, meta_keywords, sort_order, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
       ON CONFLICT (slug) DO NOTHING`,
      [s.slug, s.title, s.subtitle, s.icon, s.short_description, s.content, s.meta_title, s.meta_description, s.meta_keywords, s.sort_order]
    );
    console.log(`  -> ${s.title}`);
  }

  console.log('Done!');
  await pool.end();
}

migrate().catch((err) => { console.error(err); process.exit(1); });
