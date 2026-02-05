import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function migrate() {
  console.log('Migrating processus page content...');

  const sections = [
    {
      page_key: 'processus',
      section_key: 'hero',
      sort_order: 0,
      content: {
        subtitle_top: 'Du projet à la réalisation',
        title: 'Notre processus',
        description: "Un accompagnement sur mesure, de la première idée à l'installation finale.",
      },
    },
    {
      page_key: 'processus',
      section_key: 'steps',
      sort_order: 1,
      content: {
        items: [
          { num: '01', title: 'Premier contact', desc: 'Échangeons sur votre projet, vos envies et vos contraintes. Visite sur site gratuite.', delay: '1-2 jours' },
          { num: '02', title: 'Conception & Plans', desc: 'Réalisation de plans détaillés et visualisation 3D de votre projet.', delay: '5-10 jours' },
          { num: '03', title: 'Devis détaillé', desc: 'Un devis transparent et détaillé, poste par poste. Sans surprise.', delay: '2-3 jours' },
          { num: '04', title: 'Fabrication en atelier', desc: 'Réalisation de votre projet dans notre atelier avec des matériaux sélectionnés.', delay: '2-6 semaines' },
          { num: '05', title: 'Installation sur site', desc: 'Pose soignée par notre équipe. Nous veillons à la propreté du chantier.', delay: '1-5 jours' },
          { num: '06', title: 'Livraison & Suivi', desc: 'Réception des travaux et garantie 2 ans. Nous restons disponibles.', delay: 'Suivi 2 ans' },
        ],
      },
    },
    {
      page_key: 'processus',
      section_key: 'engagements',
      sort_order: 2,
      content: {
        title: 'Nos engagements',
        items: [
          { icon: '✓', title: 'Transparence', desc: 'Devis détaillé sans frais cachés. Le prix annoncé est le prix final.' },
          { icon: '⏱', title: 'Respect des délais', desc: 'Nous nous engageons sur un planning précis et le respectons.' },
          { icon: '🛡️', title: 'Garantie 2 ans', desc: "Tous nos travaux sont garantis 2 ans, pièces et main d'oeuvre." },
        ],
      },
    },
    {
      page_key: 'processus',
      section_key: 'faq',
      sort_order: 3,
      content: {
        title: 'Questions fréquentes',
        items: [
          { question: 'Le devis est-il gratuit ?', answer: 'Oui, le devis est entièrement gratuit et sans engagement. Nous nous déplaçons sur site pour prendre les mesures et comprendre vos besoins.' },
          { question: 'Quel est le délai de réponse ?', answer: 'Nous répondons à toutes les demandes sous 24h maximum en jour ouvré.' },
          { question: "Quelle est votre zone d'intervention ?", answer: "Nous intervenons dans le Nord et le Pas-de-Calais grâce à nos deux ateliers : à Cysoing près de Lille (métropole lilloise, 50 km autour) et à La Calotterie près de Montreuil-sur-Mer et du Touquet-Paris-Plage (Côte d'Opale, 50 km autour)." },
          { question: 'Peut-on visiter votre atelier ?', answer: 'Absolument ! Nous recevons nos clients sur rendez-vous dans nos ateliers de Cysoing ou de La Calotterie pour vous montrer nos réalisations en cours et nos matériaux.' },
          { question: 'Quels sont les modes de paiement acceptés ?', answer: "Nous acceptons les virements bancaires, chèques et espèces. Un échéancier en 3 fois est possible pour les projets importants." },
        ],
      },
    },
  ];

  for (const section of sections) {
    await pool.query(
      `INSERT INTO page_content (page_key, section_key, content, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (page_key, section_key)
       DO UPDATE SET content = $3, sort_order = $4, updated_at = NOW()`,
      [section.page_key, section.section_key, JSON.stringify(section.content), section.sort_order]
    );
    console.log(`  ✓ ${section.section_key}`);
  }

  console.log('Done!');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
