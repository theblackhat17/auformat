import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Creating articles table...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL DEFAULT '',
      cover_image TEXT,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      reading_time INT DEFAULT 1,
      meta_title TEXT,
      meta_description TEXT,
      meta_keywords TEXT,
      published BOOLEAN DEFAULT false,
      published_at TIMESTAMPTZ,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published, published_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id)`);

  console.log('Table articles created with indexes.');

  console.log('Seeding default blog categories...');
  const categories = [
    { slug: 'conseils', label: 'Conseils', icon: '💡', sort_order: 1 },
    { slug: 'inspiration', label: 'Inspiration', icon: '✨', sort_order: 2 },
    { slug: 'savoir-faire', label: 'Savoir-faire', icon: '🔨', sort_order: 3 },
    { slug: 'materiaux', label: 'Matériaux', icon: '🪵', sort_order: 4 },
    { slug: 'projets', label: 'Projets', icon: '🏠', sort_order: 5 },
  ];

  for (const c of categories) {
    await pool.query(
      `INSERT INTO categories (slug, label, icon, type, sort_order, published)
       VALUES ($1, $2, $3, 'blog', $4, true)
       ON CONFLICT (slug) DO NOTHING`,
      [c.slug, c.label, c.icon, c.sort_order]
    );
    console.log(`  -> ${c.label}`);
  }

  console.log('Seeding sample article...');
  const sampleContent = `## Choisir le bois pour sa cuisine, un choix essentiel

Une cuisine en bois massif n'est pas qu'une question d'esthétique : c'est un investissement qui dure plusieurs décennies. Le choix de l'essence influence directement la durabilité, l'entretien et l'ambiance de votre pièce de vie.

## Les essences les plus adaptées

### Le chêne, valeur sûre
Le chêne est sans doute le bois le plus utilisé en cuisine. Ses qualités sont nombreuses :
- **Dureté élevée** (4 sur l'échelle de Brinell)
- **Excellente stabilité** dimensionnelle
- **Veinage prononcé** qui apporte du caractère
- **Vieillissement noble** avec une patine qui se développe au fil des ans

### Le hêtre, alternative économique
Plus accessible que le chêne, le hêtre offre une teinte claire et homogène. Idéal pour les cuisines lumineuses de style scandinave.

### Le noyer, pour les ambiances haut de gamme
Le noyer apporte une profondeur visuelle incomparable. Sa teinte sombre et ses contrastes naturels en font un choix premium.

## Les critères à prendre en compte

1. **L'usage** : Plan de travail, façades ou structure ? Chaque élément a ses contraintes.
2. **L'humidité** : La cuisine est une pièce humide. Privilégier des bois stables.
3. **Le budget** : Du hêtre au noyer, le rapport peut aller du simple au triple.
4. **L'entretien** : Tous les bois nécessitent un soin régulier mais à des degrés différents.

## Notre conseil d'artisan

Chez Au Format, nous recommandons généralement le **chêne massif** pour les façades et la **structure**, associé à un **plan de travail** dans la même essence ou en hêtre traité. Cette combinaison offre le meilleur compromis entre durabilité, esthétique et budget.

> Un bon bois bien traité vous accompagnera 30 à 50 ans. Le choix initial est donc déterminant.

## Vous avez un projet ?

Notre équipe se déplace gratuitement pour vous conseiller sur le choix des essences et des finitions adaptées à votre projet de cuisine sur mesure.`;

  const cat = await pool.query(`SELECT id FROM categories WHERE slug = 'conseils' AND type = 'blog' LIMIT 1`);
  const categoryId = cat.rows[0]?.id || null;

  await pool.query(
    `INSERT INTO articles (slug, title, excerpt, content, reading_time, category_id, meta_title, meta_description, meta_keywords, published, published_at, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), 1)
     ON CONFLICT (slug) DO NOTHING`,
    [
      'comment-choisir-le-bois-de-sa-cuisine',
      'Comment choisir le bois de sa cuisine ?',
      'Chêne, hêtre, noyer... découvrez quelle essence privilégier pour une cuisine en bois massif durable et esthétique. Nos conseils d\'artisan menuisier.',
      sampleContent,
      5,
      categoryId,
      'Comment choisir le bois de sa cuisine - Guide d\'artisan | Au Format',
      'Quel bois choisir pour une cuisine sur mesure ? Chêne, hêtre, noyer : nos conseils pour choisir l\'essence parfaite. Guide d\'artisan menuisier dans le Nord.',
      'bois cuisine, cuisine bois massif, choisir bois cuisine, chêne cuisine, hêtre cuisine, noyer cuisine',
    ]
  );
  console.log('  -> Comment choisir le bois de sa cuisine ?');

  console.log('Done!');
  await pool.end();
}

migrate().catch((err) => { console.error(err); process.exit(1); });
