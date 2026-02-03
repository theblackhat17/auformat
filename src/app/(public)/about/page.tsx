import type { Metadata } from 'next';
import { getEquipe, getPageContent } from '@/lib/content';

export const metadata: Metadata = { title: 'A propos' };

export default async function AboutPage() {
  const [equipe, sections] = await Promise.all([
    getEquipe(),
    getPageContent('about'),
  ]);

  const getSection = (key: string) => sections.find((s) => s.sectionKey === key)?.content || {};

  const hero = getSection('hero') as Record<string, string>;
  const history = getSection('history') as { title?: string; paragraphs?: string[] };
  const values = getSection('values') as { title?: string; items?: { icon: string; title: string; desc: string }[] };

  return (
    <>
      {/* Hero */}
      <section className="bg-noir text-white py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-bois-clair text-sm font-medium tracking-widest uppercase mb-3">{hero.subtitle_top || 'Notre histoire'}</p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">{hero.title || "A propos d'Au Format"}</h1>
          <p className="text-white/60 text-lg max-w-2xl">{hero.description || 'Une passion pour le bois et le sur-mesure, transmise de generation en generation.'}</p>
        </div>
      </section>

      {/* Histoire */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-noir mb-6">{history.title || 'Notre parcours'}</h2>
          <div className="prose prose-lg text-noir/70 space-y-4">
            {history.paragraphs ? (
              history.paragraphs.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <>
                <p>Au Format est ne d&apos;une passion familiale pour le travail du bois. Depuis plus de 15 ans, nous concevons et fabriquons du mobilier sur mesure pour les particuliers et les professionnels de la region lilloise.</p>
                <p>Notre atelier est equipe de machines traditionnelles et numeriques, nous permettant de combiner savoir-faire artisanal et precision moderne. Chaque projet est unique et merite une attention particuliere.</p>
                <p>Nous accompagnons nos clients de la conception a l&apos;installation, en passant par le choix des materiaux et la fabrication en atelier. Notre engagement : un travail de qualite, dans les delais convenus.</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Valeurs */}
      {values.items && (
        <section className="py-20 bg-beige/50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-noir text-center mb-12">{values.title || 'Nos valeurs'}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.items.map((v) => (
                <div key={v.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <span className="text-3xl mb-3 block">{v.icon}</span>
                  <h3 className="text-lg font-semibold text-noir mb-2">{v.title}</h3>
                  <p className="text-sm text-noir/50 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Equipe */}
      {equipe.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-noir text-center mb-12">Notre equipe</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {equipe.map((member) => (
                <div key={member.id} className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full bg-beige overflow-hidden mb-4">
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl text-bois-fonce">
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-noir">{member.name}</h3>
                  <p className="text-sm text-bois-fonce">{member.role}</p>
                  {member.description && <p className="text-sm text-noir/50 mt-2">{member.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
