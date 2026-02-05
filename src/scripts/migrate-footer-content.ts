import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SECTIONS = [
  {
    section_key: 'addresses',
    sort_order: 0,
    content: {
      items: [
        {
          title: 'Atelier Cysoing',
          line1: '88 Imp. de la Briqueterie',
          line2: '59830 Cysoing',
          note: 'Près de Lille, Nord (59)',
        },
        {
          title: 'Atelier Côte d\'Opale',
          line1: '1056 Rue de Montreuil',
          line2: '62170 La Calotterie',
          note: 'Près du Touquet, Pas-de-Calais (62)',
        },
      ],
    },
  },
  {
    section_key: 'links',
    sort_order: 1,
    content: {
      items: [
        { label: 'Configurateur en ligne', href: '/configurateur' },
        { label: 'Nos réalisations', href: '/realisations' },
        { label: 'Essences de bois', href: '/materiaux' },
        { label: 'Notre processus', href: '/processus' },
        { label: 'Savoir-faire', href: '/homemade' },
        { label: 'Avis clients', href: '/avis' },
        { label: 'Demander un devis', href: '/contact' },
        { label: 'À propos', href: '/about' },
      ],
    },
  },
  {
    section_key: 'seo_text',
    sort_order: 2,
    content: {
      text: 'Au Format, menuiserie et agencement sur mesure dans le Nord et le Pas-de-Calais. Fabrication artisanale de meubles, dressings, bibliothèques, cuisines, bureaux, plans de travail, étagères et escaliers en bois massif. Nos ateliers à Cysoing près de Lille et à La Calotterie près de Montreuil-sur-Mer et du Touquet-Paris-Plage réalisent vos projets sur mesure pour particuliers et professionnels. Ébénisterie, agencement intérieur, menuiserie traditionnelle et numérique. Essences de bois nobles : chêne, noyer, hêtre, frêne. Devis gratuit dans la métropole lilloise, la Côte d\'Opale et les Hauts-de-France.',
    },
  },
  {
    section_key: 'socials',
    sort_order: 3,
    content: {
      items: [
        { platform: 'instagram', url: 'https://www.instagram.com/auformat/' },
        { platform: 'facebook', url: 'https://www.facebook.com/profile.php?id=100087409924806' },
      ],
    },
  },
];

async function main() {
  console.log('Seeding footer content...');

  for (const section of SECTIONS) {
    await pool.query(
      `INSERT INTO page_content (page_key, section_key, content, sort_order)
       VALUES ('footer', $1, $2, $3)
       ON CONFLICT (page_key, section_key)
       DO UPDATE SET content = $2, sort_order = $3`,
      [section.section_key, JSON.stringify(section.content), section.sort_order]
    );
    console.log(`  ✓ ${section.section_key}`);
  }

  console.log('Done!');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
