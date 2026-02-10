export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getSettings } from '@/lib/content';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/cgv', {
    title: 'Conditions Générales de Vente',
    description: 'Conditions générales de vente de Au Format, menuiserie sur mesure.',
    keywords: ['CGV', 'conditions générales de vente', 'Au Format'],
  });
}

export default async function CGVPage() {
  const settings = await getSettings();
  const companyName = settings?.companyName || 'Au Format';
  const phone = settings?.phone || '07 88 91 60 68';
  const email = settings?.email || 'contact@auformat.fr';

  return (
    <>
      <section className="bg-noir text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-bold">Conditions Générales de Vente</h1>
          <p className="text-white/60 mt-3">Applicables à compter du 1er janvier 2025</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 prose prose-gray max-w-none">

          <h2>Article 1 - Objet et champ d&apos;application</h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) s&apos;appliquent à toutes les prestations de services et ventes de produits conclues entre <strong>{companyName}</strong>, ci-après dénommé &laquo; le Prestataire &raquo;, et tout client particulier ou professionnel, ci-après dénommé &laquo; le Client &raquo;.
          </p>
          <p>
            Le Prestataire est spécialisé dans la conception, la fabrication et la pose de mobilier et d&apos;agencements sur mesure en bois.
          </p>
          <p>
            Toute commande implique l&apos;acceptation sans réserve des présentes CGV, qui prévalent sur tout autre document.
          </p>

          <h2>Article 2 - Devis et commandes</h2>
          <h3>2.1 Devis</h3>
          <p>
            Tout projet fait l&apos;objet d&apos;un devis détaillé, gratuit et sans engagement. Les devis établis via le configurateur en ligne sont indicatifs et peuvent être ajustés après étude technique approfondie.
          </p>
          <p>
            Les devis sont valables <strong>30 jours</strong> à compter de leur date d&apos;émission, sauf mention contraire.
          </p>

          <h3>2.2 Commande</h3>
          <p>
            La commande est considérée comme ferme et définitive après :
          </p>
          <ul>
            <li>Acceptation et signature du devis par le Client</li>
            <li>Versement de l&apos;acompte prévu à l&apos;article 4</li>
          </ul>
          <p>
            Toute modification de commande après acceptation du devis fera l&apos;objet d&apos;un avenant et pourra entraîner une révision du prix et des délais.
          </p>

          <h2>Article 3 - Prix</h2>
          <p>
            Les prix sont exprimés en euros toutes taxes comprises (TTC). Ils comprennent la fourniture des matériaux, la fabrication en atelier et, le cas échéant, la livraison et la pose selon les termes du devis.
          </p>
          <p>
            Les prix sont fermes et définitifs une fois le devis accepté, sauf modification de la commande à la demande du Client ou variation exceptionnelle du coût des matières premières supérieure à 10%.
          </p>

          <h2>Article 4 - Modalités de paiement</h2>
          <p>Le paiement s&apos;effectue selon l&apos;échéancier suivant, sauf accord particulier mentionné au devis :</p>
          <ul>
            <li><strong>30% d&apos;acompte</strong> à la commande (signature du devis)</li>
            <li><strong>40%</strong> au démarrage de la fabrication</li>
            <li><strong>30% du solde</strong> à la livraison et/ou à la fin de la pose</li>
          </ul>
          <p>
            Les paiements sont acceptés par virement bancaire ou chèque. Tout retard de paiement entraînera l&apos;application de pénalités de retard au taux légal en vigueur, ainsi qu&apos;une indemnité forfaitaire de 40 euros pour frais de recouvrement.
          </p>

          <h2>Article 5 - Délais de fabrication et de livraison</h2>
          <p>
            Les délais de fabrication sont indicatifs et communiqués au Client lors de l&apos;acceptation du devis. Ils varient généralement de <strong>4 à 10 semaines</strong> selon la complexité du projet et la disponibilité des matériaux.
          </p>
          <p>
            Le Prestataire s&apos;engage à informer le Client de tout retard significatif. Un retard raisonnable ne saurait donner lieu à annulation de la commande ni à indemnisation, sauf accord contraire.
          </p>
          <p>
            La livraison s&apos;effectue à l&apos;adresse convenue. Le Client s&apos;assure de l&apos;accessibilité du lieu. Tout surcoût lié à des difficultés d&apos;accès non signalées sera à la charge du Client.
          </p>

          <h2>Article 6 - Droit de rétractation</h2>
          <p>
            Conformément aux articles L.221-18 et suivants du Code de la Consommation, le Client consommateur dispose d&apos;un délai de <strong>14 jours</strong> à compter de la signature du devis pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
          </p>
          <p>
            <strong>Exception :</strong> Conformément à l&apos;article L.221-28 du Code de la Consommation, le droit de rétractation ne peut être exercé pour les biens confectionnés selon les spécifications du consommateur ou nettement personnalisés, ce qui est le cas des meubles et agencements sur mesure. Le droit de rétractation s&apos;applique donc uniquement avant le début de la fabrication.
          </p>

          <h2>Article 7 - Réception et réserves</h2>
          <p>
            Le Client est tenu de vérifier l&apos;état du mobilier à la livraison et/ou à la fin de la pose. Toute réserve doit être formulée par écrit dans un délai de <strong>7 jours</strong> suivant la réception.
          </p>
          <p>
            Passé ce délai, les prestations seront réputées conformes et acceptées.
          </p>

          <h2>Article 8 - Garanties</h2>
          <h3>8.1 Garantie légale de conformité</h3>
          <p>
            Conformément aux articles L.217-4 et suivants du Code de la Consommation, le Client bénéficie de la garantie légale de conformité pendant <strong>2 ans</strong> à compter de la livraison.
          </p>

          <h3>8.2 Garantie des vices cachés</h3>
          <p>
            Conformément aux articles 1641 et suivants du Code Civil, le Client bénéficie de la garantie des vices cachés.
          </p>

          <h3>8.3 Exclusions</h3>
          <p>Les garanties ne couvrent pas :</p>
          <ul>
            <li>L&apos;usure normale des matériaux</li>
            <li>Les dommages résultant d&apos;une mauvaise utilisation ou d&apos;un défaut d&apos;entretien</li>
            <li>Les variations naturelles du bois (teinte, veinage, légers mouvements) qui ne constituent pas un défaut</li>
            <li>Les modifications ou réparations effectuées par un tiers sans accord préalable</li>
          </ul>

          <h2>Article 9 - Responsabilité</h2>
          <p>
            La responsabilité du Prestataire est limitée au montant de la commande. Le Prestataire ne saurait être tenu responsable des dommages indirects, tels que perte de jouissance, préjudice commercial ou manque à gagner.
          </p>

          <h2>Article 10 - Force majeure</h2>
          <p>
            Aucune des parties ne pourra être tenue responsable de l&apos;inexécution de ses obligations en cas de force majeure telle que définie par l&apos;article 1218 du Code Civil (catastrophes naturelles, pandémies, pénuries de matières premières, grèves, etc.).
          </p>

          <h2>Article 11 - Propriété intellectuelle</h2>
          <p>
            Les plans, dessins et conceptions réalisés par le Prestataire restent sa propriété intellectuelle. Ils ne peuvent être reproduits, communiqués ou utilisés sans son accord écrit préalable.
          </p>

          <h2>Article 12 - Protection des données</h2>
          <p>
            Les données personnelles collectées dans le cadre de la relation commerciale sont traitées conformément à notre <a href="/politique-confidentialite" className="text-vert-foret hover:underline">politique de confidentialité</a> et au Règlement Général sur la Protection des Données (RGPD).
          </p>

          <h2>Article 13 - Médiation et litiges</h2>
          <p>
            En cas de litige, le Client peut recourir gratuitement au service de médiation de la consommation. Le médiateur compétent est désigné conformément à l&apos;article L.612-1 du Code de la Consommation.
          </p>
          <p>
            Avant toute saisine du médiateur, le Client s&apos;engage à contacter {companyName} par email à <a href={`mailto:${email}`} className="text-vert-foret hover:underline">{email}</a> ou par téléphone au {phone} pour tenter de résoudre le différend à l&apos;amiable.
          </p>
          <p>
            À défaut de résolution amiable, tout litige sera soumis aux tribunaux compétents du ressort du siège social du Prestataire, conformément au droit français.
          </p>

          <h2>Article 14 - Dispositions diverses</h2>
          <p>
            Si l&apos;une des clauses des présentes CGV est déclarée nulle ou inapplicable, les autres clauses conservent leur pleine validité.
          </p>
          <p>
            Le fait pour le Prestataire de ne pas se prévaloir d&apos;un manquement du Client à l&apos;une de ses obligations ne saurait être interprété comme une renonciation à l&apos;obligation en cause.
          </p>

          <p className="text-sm text-noir/40 mt-12">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>
    </>
  );
}
