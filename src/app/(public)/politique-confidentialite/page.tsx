export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getSettings } from '@/lib/content';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/politique-confidentialite', {
    title: 'Politique de confidentialité',
    description: 'Politique de confidentialité et protection des données personnelles du site Au Format.',
    keywords: ['politique de confidentialité', 'RGPD', 'données personnelles', 'Au Format'],
  });
}

export default async function PolitiqueConfidentialitePage() {
  const settings = await getSettings();
  const companyName = settings?.companyName || 'Au Format';
  const email = settings?.email || 'contact@auformat.fr';

  return (
    <>
      <section className="bg-noir text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h1 className="text-3xl lg:text-4xl font-bold">Politique de confidentialité</h1>
          <p className="text-white/60 mt-3">Protection de vos données personnelles conformément au RGPD</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 prose prose-gray max-w-none">

          <h2>1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles collectées sur le site www.auformat.com est :
          </p>
          <ul>
            <li><strong>{companyName}</strong></li>
            <li>88 Imp. de la Briqueterie, 59830 Cysoing, France</li>
            <li>Email : <a href={`mailto:${email}`} className="text-vert-foret hover:underline">{email}</a></li>
          </ul>

          <h2>2. Données collectées</h2>
          <p>Nous collectons les données suivantes dans le cadre de l&apos;utilisation de notre site :</p>

          <h3>2.1 Création de compte</h3>
          <ul>
            <li>Nom et prénom</li>
            <li>Adresse email</li>
            <li>Numéro de téléphone (optionnel)</li>
            <li>Adresse postale (optionnel)</li>
            <li>Nom de l&apos;entreprise (optionnel)</li>
          </ul>

          <h3>2.2 Formulaire de contact</h3>
          <ul>
            <li>Nom et prénom</li>
            <li>Adresse email</li>
            <li>Numéro de téléphone</li>
            <li>Ville et code postal</li>
            <li>Type de projet</li>
            <li>Message</li>
          </ul>

          <h3>2.3 Configurateur et demandes de devis</h3>
          <ul>
            <li>Configurations de meubles choisies</li>
            <li>Informations de projet (dimensions, matériaux, options)</li>
          </ul>

          <h3>2.4 Données techniques</h3>
          <ul>
            <li>Adresse IP</li>
            <li>Type de navigateur et système d&apos;exploitation</li>
            <li>Pages consultées et dates de visite</li>
          </ul>

          <h2>3. Finalités du traitement</h2>
          <p>Vos données personnelles sont traitées pour les finalités suivantes :</p>
          <ul>
            <li><strong>Gestion de votre compte :</strong> création, authentification et gestion de votre espace client</li>
            <li><strong>Traitement des demandes :</strong> réponse à vos demandes de contact et de devis</li>
            <li><strong>Suivi de projet :</strong> gestion de vos projets et devis en cours</li>
            <li><strong>Communication :</strong> envoi d&apos;emails liés à votre compte (confirmations, notifications de devis)</li>
            <li><strong>Amélioration du service :</strong> analyse anonymisée de l&apos;utilisation du site</li>
          </ul>

          <h2>4. Base légale du traitement</h2>
          <p>Le traitement de vos données repose sur :</p>
          <ul>
            <li><strong>L&apos;exécution d&apos;un contrat :</strong> traitement de vos demandes de devis et gestion de votre compte client</li>
            <li><strong>Votre consentement :</strong> formulaire de contact, création de compte</li>
            <li><strong>L&apos;intérêt légitime :</strong> amélioration de nos services et sécurité du site</li>
          </ul>

          <h2>5. Durée de conservation</h2>
          <ul>
            <li><strong>Données de compte :</strong> conservées pendant la durée d&apos;existence du compte, puis 3 ans après la dernière activité</li>
            <li><strong>Demandes de contact :</strong> 3 ans à compter de la demande</li>
            <li><strong>Devis et projets :</strong> 5 ans à compter de la fin de la relation commerciale (obligation légale)</li>
            <li><strong>Données techniques :</strong> 13 mois maximum</li>
          </ul>

          <h2>6. Destinataires des données</h2>
          <p>
            Vos données personnelles sont destinées exclusivement à {companyName} et ne sont transmises à aucun tiers à des fins commerciales. Elles peuvent être communiquées aux prestataires techniques suivants, dans le cadre strict de leur mission :
          </p>
          <ul>
            <li><strong>Hébergeur :</strong> OVH SAS (hébergement du site et des données)</li>
            <li><strong>Service email :</strong> envoi des emails transactionnels (confirmations, devis)</li>
          </ul>

          <h2>7. Transferts de données</h2>
          <p>
            Vos données personnelles sont hébergées en France et ne font l&apos;objet d&apos;aucun transfert en dehors de l&apos;Union européenne.
          </p>

          <h2>8. Cookies</h2>
          <p>
            Notre site utilise uniquement des <strong>cookies strictement nécessaires</strong> au fonctionnement du service :
          </p>
          <ul>
            <li><strong>Cookie de session :</strong> maintien de votre connexion (durée : 7 jours)</li>
          </ul>
          <p>
            Aucun cookie publicitaire, analytique ou de suivi tiers n&apos;est déposé sur votre navigateur. Aucun consentement n&apos;est donc requis pour ces cookies conformément à la directive ePrivacy et aux recommandations de la CNIL.
          </p>

          <h2>9. Vos droits</h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez des droits suivants :
          </p>
          <ul>
            <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données personnelles</li>
            <li><strong>Droit de rectification :</strong> corriger des données inexactes ou incomplètes</li>
            <li><strong>Droit à l&apos;effacement :</strong> demander la suppression de vos données</li>
            <li><strong>Droit à la limitation :</strong> limiter le traitement de vos données</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
            <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement de vos données</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous par email à <a href={`mailto:${email}`} className="text-vert-foret hover:underline">{email}</a> en joignant une copie d&apos;un justificatif d&apos;identité. Nous nous engageons à répondre dans un délai de 30 jours.
          </p>

          <h2>10. Sécurité</h2>
          <p>
            Nous mettons en place des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles contre tout accès non autorisé, toute modification, divulgation ou destruction :
          </p>
          <ul>
            <li>Chiffrement des communications (HTTPS/TLS)</li>
            <li>Hachage sécurisé des mots de passe (bcrypt)</li>
            <li>Accès restreint aux données par authentification</li>
            <li>Sauvegardes régulières</li>
          </ul>

          <h2>11. Réclamation</h2>
          <p>
            Si vous estimez que le traitement de vos données personnelles constitue une violation du RGPD, vous avez le droit d&apos;introduire une réclamation auprès de la <strong>Commission Nationale de l&apos;Informatique et des Libertés (CNIL)</strong> :
          </p>
          <ul>
            <li>Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-vert-foret hover:underline">www.cnil.fr</a></li>
            <li>Adresse : CNIL, 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</li>
          </ul>

          <p className="text-sm text-noir/40 mt-12">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>
    </>
  );
}
