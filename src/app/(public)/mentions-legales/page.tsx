export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getSettings } from '@/lib/content';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/mentions-legales', {
    title: 'Mentions légales',
    description: 'Mentions légales du site Au Format, menuiserie sur mesure.',
    keywords: ['mentions légales', 'Au Format', 'informations légales'],
  });
}

export default async function MentionsLegalesPage() {
  const settings = await getSettings();
  const companyName = settings?.companyName || 'Au Format';
  const phone = settings?.phone || '07 88 91 60 68';
  const email = settings?.email || 'contact@auformat.fr';

  return (
    <>
      <section className="bg-noir text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-bold">Mentions légales</h1>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 prose prose-gray max-w-none">

          <h2>1. Éditeur du site</h2>
          <p>
            Le site <strong>www.auformat.com</strong> est édité par :
          </p>
          <ul>
            <li><strong>Raison sociale :</strong> {companyName}</li>
            <li><strong>Forme juridique :</strong> Entreprise individuelle / Auto-entrepreneur</li>
            <li><strong>Siège social :</strong> 88 Imp. de la Briqueterie, 59830 Cysoing, France</li>
            <li><strong>Atelier secondaire :</strong> 1056 Rue de Montreuil, 62170 La Calotterie, France</li>
            <li><strong>Téléphone :</strong> {phone}</li>
            <li><strong>Email :</strong> {email}</li>
            <li><strong>Directeur de la publication :</strong> Le gérant de {companyName}</li>
          </ul>

          <h2>2. Hébergement</h2>
          <p>
            Le site est hébergé par :
          </p>
          <ul>
            <li><strong>Hébergeur :</strong> OVH SAS</li>
            <li><strong>Adresse :</strong> 2 Rue Kellermann, 59100 Roubaix, France</li>
            <li><strong>Téléphone :</strong> 1007 (depuis la France)</li>
            <li><strong>Site web :</strong> www.ovhcloud.com</li>
          </ul>

          <h2>3. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble du contenu du site www.auformat.com (textes, images, vidéos, logos, icônes, sons, logiciels, etc.) est la propriété exclusive de {companyName} ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
          </p>
          <p>
            Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans l&apos;autorisation écrite préalable de {companyName}.
          </p>
          <p>
            Toute exploitation non autorisée du site ou de son contenu sera considérée comme constitutive d&apos;une contrefaçon et poursuivie conformément aux articles L.335-2 et suivants du Code de la Propriété Intellectuelle.
          </p>

          <h2>4. Limitation de responsabilité</h2>
          <p>
            {companyName} s&apos;efforce de fournir sur le site des informations aussi précises que possible. Toutefois, {companyName} ne pourra être tenue responsable des omissions, des inexactitudes et des carences dans la mise à jour, qu&apos;elles soient de son fait ou du fait de tiers partenaires.
          </p>
          <p>
            Les informations présentes sur le site sont données à titre indicatif et sont susceptibles d&apos;évoluer. Les prix affichés sur le configurateur en ligne sont estimatifs et ne constituent pas un engagement contractuel. Seul un devis signé fait foi.
          </p>

          <h2>5. Liens hypertextes</h2>
          <p>
            Le site peut contenir des liens vers d&apos;autres sites internet. {companyName} n&apos;exerce aucun contrôle sur le contenu de ces sites tiers et décline toute responsabilité quant à leur contenu ou leurs pratiques en matière de protection des données personnelles.
          </p>

          <h2>6. Cookies</h2>
          <p>
            Le site utilise des cookies strictement nécessaires au fonctionnement du service (authentification, session utilisateur). Aucun cookie publicitaire ou de suivi n&apos;est utilisé. Pour plus d&apos;informations, consultez notre <a href="/politique-confidentialite" className="text-vert-foret hover:underline">politique de confidentialité</a>.
          </p>

          <h2>7. Droit applicable</h2>
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.
          </p>

          <p className="text-sm text-noir/40 mt-12">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>
    </>
  );
}
