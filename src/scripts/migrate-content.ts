import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const CONTENT_DIR = path.join(process.cwd(), 'src', 'data', 'content');

function readJsonFiles<T>(dir: string): T[] {
  const fullPath = path.join(CONTENT_DIR, dir);
  if (!fs.existsSync(fullPath)) return [];
  return fs
    .readdirSync(fullPath)
    .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(fullPath, file), 'utf-8')) as T);
}

function readSettingsFile<T>(filename: string): T | null {
  const filePath = path.join(CONTENT_DIR, 'settings', filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Creating tables...');

    // 1. site_settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL DEFAULT 'Au Format',
        slogan TEXT,
        address TEXT, zipcode TEXT, city TEXT,
        phone TEXT, email TEXT,
        hours_weekdays TEXT, hours_saturday TEXT, hours_sunday TEXT,
        instagram TEXT, facebook TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  - site_settings');

    // 2. page_content
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        page_key TEXT NOT NULL,
        section_key TEXT NOT NULL,
        content JSONB NOT NULL DEFAULT '{}',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(page_key, section_key)
      )
    `);
    console.log('  - page_content');

    // 3. categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        icon TEXT,
        type TEXT NOT NULL DEFAULT 'realisation',
        sort_order INT DEFAULT 0,
        published BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  - categories');

    // 4. realisations
    await client.query(`
      CREATE TABLE IF NOT EXISTS realisations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        description TEXT DEFAULT '',
        body TEXT,
        image TEXT,
        gallery JSONB DEFAULT '[]',
        duration TEXT, surface TEXT, material TEXT, location TEXT,
        features JSONB DEFAULT '[]',
        published BOOLEAN DEFAULT false,
        date TIMESTAMPTZ DEFAULT NOW(),
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  - realisations');

    // 5. avis
    await client.query(`
      CREATE TABLE IF NOT EXISTS avis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        location TEXT DEFAULT '',
        client_type TEXT DEFAULT 'Particulier',
        rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
        project_type TEXT DEFAULT '',
        testimonial TEXT DEFAULT '',
        verified BOOLEAN DEFAULT false,
        published BOOLEAN DEFAULT false,
        date TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  - avis');

    // 6. materiaux
    await client.query(`
      CREATE TABLE IF NOT EXISTS materiaux (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        latin_name TEXT,
        image TEXT,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        tag TEXT,
        description TEXT DEFAULT '',
        hardness INT DEFAULT 0, stability INT DEFAULT 0,
        origin TEXT DEFAULT '', color TEXT DEFAULT '',
        features JSONB DEFAULT '[]',
        usages JSONB DEFAULT '[]',
        published BOOLEAN DEFAULT false,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  - materiaux');

    // 7. team_members
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        role TEXT DEFAULT '',
        photo TEXT,
        description TEXT,
        sort_order INT DEFAULT 0,
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  - team_members');

    // 8. uploads
    await client.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INT NOT NULL,
        path TEXT NOT NULL,
        uploaded_by UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  - uploads');

    // ========== SEED DATA ==========
    console.log('\nSeeding data...');

    // Seed site_settings from general.json
    interface GeneralJson {
      companyName: string;
      slogan: string;
      address: string;
      zipcode: string;
      city: string;
      phone: string;
      email: string;
      hours?: { weekdays?: string; saturday?: string; sunday?: string };
    }
    const general = readSettingsFile<GeneralJson>('general.json');
    const existingSettings = await client.query('SELECT id FROM site_settings LIMIT 1');
    if (existingSettings.rows.length === 0 && general) {
      await client.query(
        `INSERT INTO site_settings (company_name, slogan, address, zipcode, city, phone, email, hours_weekdays, hours_saturday, hours_sunday)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          general.companyName || 'Au Format',
          general.slogan || '',
          general.address || '',
          general.zipcode || '',
          general.city || '',
          general.phone || '',
          general.email || '',
          general.hours?.weekdays || '8h - 18h',
          general.hours?.saturday || '9h - 12h',
          general.hours?.sunday || 'Ferme',
        ]
      );
      console.log('  - site_settings seeded from general.json');
    } else if (existingSettings.rows.length > 0) {
      console.log('  - site_settings already has data, skipping');
    } else {
      // No general.json, insert defaults
      await client.query(
        `INSERT INTO site_settings (company_name, slogan, address, zipcode, city, phone, email, hours_weekdays, hours_saturday, hours_sunday)
         VALUES ('Au Format', 'Franchissons ensemble, le pas vers le bois', 'Votre adresse', '59000', 'Lille', '03 XX XX XX XX', 'contact@auformat.fr', '8h - 18h', '9h - 12h', 'Ferme')`
      );
      console.log('  - site_settings seeded with defaults');
    }

    // Seed categories - realisation types
    const REALISATION_CATEGORIES: Record<string, { label: string; icon: string }> = {
      cuisines: { label: 'Cuisines', icon: '🍳' },
      dressings: { label: 'Dressings', icon: '👔' },
      bibliotheques: { label: 'Bibliotheques', icon: '📚' },
      commerces: { label: 'Commerces', icon: '🏢' },
      escaliers: { label: 'Escaliers', icon: '🪜' },
      exterieurs: { label: 'Exterieurs', icon: '🚪' },
    };

    const MATERIAL_CATEGORIES: Record<string, string> = {
      nobles: 'Bois Nobles',
      locaux: 'Bois Locaux',
      exotiques: 'Bois Exotiques',
      exterieurs: 'Bois Exterieurs',
    };

    const categoryMap: Record<string, string> = {}; // slug -> id

    const existingCats = await client.query('SELECT id FROM categories LIMIT 1');
    if (existingCats.rows.length === 0) {
      let order = 0;
      for (const [slug, { label, icon }] of Object.entries(REALISATION_CATEGORIES)) {
        const res = await client.query(
          `INSERT INTO categories (slug, label, icon, type, sort_order) VALUES ($1, $2, $3, 'realisation', $4) RETURNING id`,
          [slug, label, icon, order++]
        );
        categoryMap[slug] = res.rows[0].id;
      }

      order = 0;
      for (const [slug, label] of Object.entries(MATERIAL_CATEGORIES)) {
        const matSlug = `mat-${slug}`;
        const res = await client.query(
          `INSERT INTO categories (slug, label, icon, type, sort_order) VALUES ($1, $2, NULL, 'material', $3) RETURNING id`,
          [matSlug, label, order++]
        );
        categoryMap[matSlug] = res.rows[0].id;
      }
      console.log('  - categories seeded (6 realisation + 4 material)');
    } else {
      console.log('  - categories already has data, loading existing...');
      const cats = await client.query('SELECT id, slug FROM categories');
      for (const row of cats.rows) {
        categoryMap[row.slug] = row.id;
      }
    }

    // Seed realisations from JSON files
    interface RealisationJson {
      title: string;
      date: string;
      category: string;
      image: string;
      gallery?: { image: string }[];
      description: string;
      body?: string;
      duration?: string;
      surface?: string;
      material?: string;
      location?: string;
      features?: { feature: string }[];
      published: boolean;
    }

    const existingReal = await client.query('SELECT id FROM realisations LIMIT 1');
    if (existingReal.rows.length === 0) {
      const realisations = readJsonFiles<RealisationJson>('realisations');
      let order = 0;
      for (const r of realisations) {
        const slug = slugify(r.title) + '-' + Date.now().toString(36) + order;
        const catId = categoryMap[r.category] || null;
        await client.query(
          `INSERT INTO realisations (title, slug, category_id, description, body, image, gallery, duration, surface, material, location, features, published, date, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            r.title,
            slug,
            catId,
            r.description || '',
            r.body || null,
            r.image || null,
            JSON.stringify(r.gallery || []),
            r.duration || null,
            r.surface || null,
            r.material || null,
            r.location || null,
            JSON.stringify(r.features || []),
            r.published !== false,
            r.date || new Date().toISOString(),
            order++,
          ]
        );
      }
      console.log(`  - realisations seeded (${realisations.length} items)`);
    } else {
      console.log('  - realisations already has data, skipping');
    }

    // Seed avis from JSON files
    interface AvisJson {
      name: string;
      location: string;
      clientType: string;
      rating: number;
      projectType: string;
      testimonial: string;
      date: string;
      verified: boolean;
      published: boolean;
    }

    const existingAvis = await client.query('SELECT id FROM avis LIMIT 1');
    if (existingAvis.rows.length === 0) {
      const avisList = readJsonFiles<AvisJson>('avis');
      for (const a of avisList) {
        await client.query(
          `INSERT INTO avis (name, location, client_type, rating, project_type, testimonial, verified, published, date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            a.name,
            a.location || '',
            a.clientType || 'Particulier',
            a.rating || 5,
            a.projectType || '',
            a.testimonial || '',
            a.verified || false,
            a.published !== false,
            a.date || new Date().toISOString(),
          ]
        );
      }
      console.log(`  - avis seeded (${avisList.length} items)`);
    } else {
      console.log('  - avis already has data, skipping');
    }

    // Seed materiaux from JSON files
    interface MateriauJson {
      name: string;
      latinName?: string;
      image: string;
      category: string;
      tag?: string;
      description: string;
      hardness: number;
      stability: number;
      origin: string;
      color: string;
      features?: { feature: string }[];
      usages?: { usage: string }[];
      published: boolean;
    }

    const existingMat = await client.query('SELECT id FROM materiaux LIMIT 1');
    if (existingMat.rows.length === 0) {
      const materiauxList = readJsonFiles<MateriauJson>('materiaux');
      let order = 0;
      for (const m of materiauxList) {
        const matCatSlug = `mat-${m.category}`;
        const catId = categoryMap[matCatSlug] || null;
        await client.query(
          `INSERT INTO materiaux (name, latin_name, image, category_id, tag, description, hardness, stability, origin, color, features, usages, published, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            m.name,
            m.latinName || null,
            m.image || null,
            catId,
            m.tag || null,
            m.description || '',
            m.hardness || 0,
            m.stability || 0,
            m.origin || '',
            m.color || '',
            JSON.stringify(m.features || []),
            JSON.stringify(m.usages || []),
            m.published !== false,
            order++,
          ]
        );
      }
      console.log(`  - materiaux seeded (${materiauxList.length} items)`);
    } else {
      console.log('  - materiaux already has data, skipping');
    }

    // Seed page_content with hardcoded texts from pages
    const existingPC = await client.query('SELECT id FROM page_content LIMIT 1');
    if (existingPC.rows.length === 0) {
      const pageContents = [
        // Homepage
        {
          page_key: 'homepage',
          section_key: 'hero',
          content: {
            subtitle_top: 'Menuiserie sur mesure',
            title_line1: 'Franchissons ensemble,',
            title_line2: 'le pas vers le bois',
            description: 'Conception et fabrication de meubles sur mesure, dressings, cuisines et agencements pour particuliers et professionnels dans la region lilloise.',
            cta_primary: 'Demander un devis',
            cta_primary_link: '/contact',
            cta_secondary: 'Configurateur 3D',
            cta_secondary_link: '/configurateur',
          },
          sort_order: 0,
        },
        {
          page_key: 'homepage',
          section_key: 'stats',
          content: {
            items: [
              { value: '500+', label: 'Projets realises' },
              { value: '15+', label: "Annees d'experience" },
              { value: '100%', label: 'Sur mesure' },
              { value: '98%', label: 'Clients satisfaits' },
            ],
          },
          sort_order: 1,
        },
        {
          page_key: 'homepage',
          section_key: 'services',
          content: {
            title: 'Nos savoir-faire',
            subtitle: 'Des creations uniques, concues et fabriquees dans notre atelier avec des materiaux nobles et durables.',
            items: [
              { icon: '🏠', title: 'Agencement interieur', desc: 'Dressings, bibliotheques, placards et rangements sur mesure' },
              { icon: '🍳', title: 'Cuisines', desc: 'Cuisines personnalisees en bois massif ou placage' },
              { icon: '🏢', title: 'Professionnels', desc: 'Agencement de commerces, bureaux et espaces professionnels' },
              { icon: '🪵', title: 'Menuiserie exterieure', desc: 'Terrasses, portails, pergolas et structures bois' },
            ],
          },
          sort_order: 2,
        },
        {
          page_key: 'homepage',
          section_key: 'realisations_preview',
          content: {
            title: 'Nos dernieres realisations',
            subtitle: 'Decouvrez nos creations recentes',
            link_text: 'Voir tout',
          },
          sort_order: 3,
        },
        {
          page_key: 'homepage',
          section_key: 'testimonials',
          content: {
            title: 'Ce que disent nos clients',
            subtitle: 'La satisfaction de nos clients est notre meilleure recompense',
          },
          sort_order: 4,
        },
        {
          page_key: 'homepage',
          section_key: 'cta',
          content: {
            title: 'Votre projet commence ici',
            subtitle: 'Contactez-nous pour discuter de votre projet. Devis gratuit et sans engagement.',
            cta_primary: 'Demander un devis gratuit',
            cta_primary_link: '/contact',
            cta_secondary: 'Decouvrir notre processus',
            cta_secondary_link: '/processus',
          },
          sort_order: 5,
        },

        // About page
        {
          page_key: 'about',
          section_key: 'hero',
          content: {
            subtitle_top: 'Notre histoire',
            title: "A propos d'Au Format",
            description: 'Une passion pour le bois et le sur-mesure, transmise de generation en generation.',
          },
          sort_order: 0,
        },
        {
          page_key: 'about',
          section_key: 'history',
          content: {
            title: 'Notre parcours',
            paragraphs: [
              "Au Format est ne d'une passion familiale pour le travail du bois. Depuis plus de 15 ans, nous concevons et fabriquons du mobilier sur mesure pour les particuliers et les professionnels de la region lilloise.",
              'Notre atelier est equipe de machines traditionnelles et numeriques, nous permettant de combiner savoir-faire artisanal et precision moderne. Chaque projet est unique et merite une attention particuliere.',
              "Nous accompagnons nos clients de la conception a l'installation, en passant par le choix des materiaux et la fabrication en atelier. Notre engagement : un travail de qualite, dans les delais convenus.",
            ],
          },
          sort_order: 1,
        },
        {
          page_key: 'about',
          section_key: 'values',
          content: {
            title: 'Nos valeurs',
            items: [
              { icon: '🎯', title: 'Sur mesure', desc: 'Chaque projet est unique. Nous concevons des solutions adaptees a vos besoins et votre espace.' },
              { icon: '🌿', title: 'Eco-responsable', desc: 'Nous privilegions les bois issus de forets gerees durablement et minimisons nos dechets.' },
              { icon: '🤝', title: 'Proximite', desc: 'Un interlocuteur unique du debut a la fin. Nous sommes a votre ecoute a chaque etape.' },
              { icon: '⚡', title: 'Excellence', desc: 'La qualite du travail est notre priorite absolue. Chaque detail compte.' },
              { icon: '🔧', title: 'Savoir-faire', desc: "Plus de 15 ans d'experience dans la menuiserie et l'agencement." },
              { icon: '💡', title: 'Innovation', desc: 'Nous combinons techniques traditionnelles et outils numeriques pour des resultats optimaux.' },
            ],
          },
          sort_order: 2,
        },

        // Homemade (savoir-faire) page
        {
          page_key: 'homemade',
          section_key: 'hero',
          content: {
            subtitle_top: 'Notre expertise',
            title: 'Savoir-faire',
            description: "L'alliance du savoir-faire artisanal et des technologies modernes.",
          },
          sort_order: 0,
        },
        {
          page_key: 'homemade',
          section_key: 'stats',
          content: {
            items: [
              { value: '500+', label: 'Projets realises' },
              { value: '15+', label: "Annees d'experience" },
              { value: '100%', label: 'Sur mesure' },
              { value: '98%', label: 'Satisfaction client' },
            ],
          },
          sort_order: 1,
        },
        {
          page_key: 'homemade',
          section_key: 'metiers',
          content: {
            title: 'Nos metiers',
            items: [
              { icon: '🏠', title: 'Agencement sur mesure', desc: 'Dressings, placards, bibliotheques, meubles TV... Chaque element est concu et fabrique selon vos dimensions et vos envies. Nous optimisons chaque centimetre de votre espace.' },
              { icon: '🍳', title: 'Amenagement interieur', desc: 'Cuisines, salles de bain, bureaux... Nous creons des espaces de vie fonctionnels et esthetiques, adaptes a votre quotidien.' },
              { icon: '🚪', title: 'Menuiserie exterieure', desc: 'Terrasses, portails, clotures, pergolas, abris de jardin... Nous travaillons des essences adaptees aux contraintes exterieures.' },
              { icon: '🏢', title: 'Agencement professionnel', desc: 'Commerces, restaurants, bureaux, cabinets medicaux... Nous concevons des espaces professionnels qui refletent votre identite.' },
            ],
          },
          sort_order: 2,
        },
        {
          page_key: 'homemade',
          section_key: 'competences',
          content: {
            title: 'Nos competences techniques',
            items: [
              { title: 'Decoupe numerique', desc: 'Machine CNC pour une precision au dixieme de millimetre.' },
              { title: 'Plaquage & Stratifie', desc: 'Finitions haut de gamme en placage bois ou stratifie.' },
              { title: 'Assemblage traditionnel', desc: "Tenons, mortaises, queues d'aronde... Les techniques qui durent." },
              { title: 'Finition & Vernissage', desc: "Laquage, vernis, huile, cire... Chaque finition est adaptee a l'usage." },
              { title: 'Conception 3D', desc: 'Visualisez votre projet avant fabrication grace a notre configurateur.' },
              { title: 'Installation', desc: 'Pose soignee par notre equipe. Ajustements sur site inclus.' },
            ],
          },
          sort_order: 3,
        },
      ];

      for (const pc of pageContents) {
        await client.query(
          `INSERT INTO page_content (page_key, section_key, content, sort_order) VALUES ($1, $2, $3, $4)`,
          [pc.page_key, pc.section_key, JSON.stringify(pc.content), pc.sort_order]
        );
      }
      console.log(`  - page_content seeded (${pageContents.length} sections)`);
    } else {
      console.log('  - page_content already has data, skipping');
    }

    await client.query('COMMIT');
    console.log('\nMigration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
