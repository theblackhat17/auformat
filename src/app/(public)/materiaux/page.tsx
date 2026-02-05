import type { Metadata } from 'next';
import { getMateriauxGrouped, getCategories } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Nos materiaux - Essences de bois et panneaux',
  description:
    'Decouvrez notre selection d\'essences de bois nobles, locaux et exotiques : chene, noyer, hetre, frene. Materiaux de qualite pour vos meubles sur mesure et agencements dans le Nord et le Pas-de-Calais.',
  keywords: ['essences de bois', 'bois massif meuble', 'chene massif', 'noyer', 'hetre', 'materiaux menuiserie', 'bois local Nord'],
  alternates: { canonical: 'https://www.auformat.com/materiaux' },
  openGraph: {
    title: 'Nos materiaux - Au Format',
    description: 'Des essences nobles et durables, selectionnees pour leur qualite et leur beaute.',
    url: 'https://www.auformat.com/materiaux',
  },
};

function HardnessBar({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`w-4 h-1.5 rounded-full ${i < value ? 'bg-bois-clair' : 'bg-gray-200'}`} />
      ))}
    </div>
  );
}

export default async function MateriauxPage() {
  const [grouped, categories] = await Promise.all([
    getMateriauxGrouped(),
    getCategories('material'),
  ]);

  const categoryTitles: Record<string, string> = {};
  for (const cat of categories) {
    categoryTitles[cat.slug] = cat.label;
  }

  const groupedCategories = Object.keys(grouped);

  return (
    <>
      <section className="bg-noir text-white py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-bois-clair text-sm font-medium tracking-widest uppercase mb-3">Nos essences</p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Materiaux</h1>
          <p className="text-white/60 text-lg max-w-2xl">Des essences nobles et durables, selectionnees pour leur qualite et leur beaute.</p>
        </div>
      </section>

      {/* Category nav */}
      {groupedCategories.length > 1 && (
        <nav className="sticky top-16 lg:top-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-30">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex gap-6 overflow-x-auto py-3">
            {groupedCategories.map((cat) => (
              <a key={cat} href={`#${cat}`} className="text-sm font-medium text-noir/60 hover:text-vert-foret whitespace-nowrap transition-colors">
                {categoryTitles[cat] || cat}
              </a>
            ))}
          </div>
        </nav>
      )}

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
          {groupedCategories.map((cat) => (
            <div key={cat} id={cat}>
              <h2 className="text-2xl font-bold text-noir mb-8">{categoryTitles[cat] || cat}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {grouped[cat].map((m) => (
                  <div key={m.id} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="aspect-[3/2] bg-beige overflow-hidden relative">
                      {m.image && <img src={m.image} alt={m.name} className="w-full h-full object-cover" loading="lazy" />}
                      {m.tag && <span className="absolute top-3 left-3 text-xs font-medium bg-white/90 text-bois-fonce px-2.5 py-1 rounded-full">{m.tag}</span>}
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-noir">{m.name}</h3>
                      {m.latinName && <p className="text-xs text-noir/40 italic">{m.latinName}</p>}
                      <p className="text-sm text-noir/60 mt-2 mb-4 line-clamp-2">{m.description}</p>
                      <div className="space-y-2 text-xs text-noir/60">
                        <div className="flex justify-between items-center">
                          <span>Durete</span>
                          <HardnessBar value={m.hardness} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Stabilite</span>
                          <HardnessBar value={m.stability} />
                        </div>
                        {m.origin && <div className="flex justify-between"><span>Origine</span><span className="font-medium text-noir/70">{m.origin}</span></div>}
                        {m.color && <div className="flex justify-between"><span>Couleur</span><span className="font-medium text-noir/70">{m.color}</span></div>}
                      </div>
                      {m.usages && m.usages.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-50">
                          {m.usages.map((u, j) => (
                            <span key={j} className="text-xs bg-beige text-bois-fonce px-2 py-0.5 rounded">{u.usage}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
