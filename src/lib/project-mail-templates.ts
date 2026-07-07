/**
 * Modèles d'e-mails pour prévenir le client des grandes étapes de son projet.
 *
 * Fichier partagé client/serveur : uniquement des données et fonctions pures
 * (aucun import de nodemailer) pour pouvoir alimenter le <select> côté admin.
 *
 * IMPORTANT :
 * - Aucun prix ne doit jamais figurer dans ces modèles.
 * - Les valeurs de `ctx` (clientName, projectName) doivent être échappées HTML
 *   par l'appelant AVANT interpolation (voir la route /notify).
 */

/** Signature commune en fin de corps — sert aussi de point d'insertion pour le message personnalisé */
export const PROJECT_MAIL_SIGNATURE = `<p style="margin: 20px 0 0;">L'atelier Au Format</p>`;

export type ProjectStageTemplateContext = {
  clientName: string;
  projectName: string;
};

export type ProjectStageTemplate = {
  key: string;
  label: string;
  subject: string;
  body: (ctx: ProjectStageTemplateContext) => string;
};

export const PROJECT_STAGE_TEMPLATES: ProjectStageTemplate[] = [
  {
    key: 'configure',
    label: 'Projet configuré',
    subject: 'Votre projet est bien lancé',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Votre projet <strong>${projectName}</strong> est configuré et pris en main par notre atelier.
      Nous préparons la suite et revenons rapidement vers vous avec les prochaines étapes.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'envoye_3d',
    label: 'Projet 3D prêt',
    subject: 'Votre projet en 3D est prêt',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Bonne nouvelle : la mise en 3D de votre projet <strong>${projectName}</strong> est prête !
      Vous pouvez dès maintenant la découvrir dans votre espace client et vous projeter
      dans votre futur aménagement.</p>
      <p>C'est le moment idéal pour ajuster le moindre détail : n'hésitez pas à nous faire
      part de vos remarques, nous affinerons le projet avec vous.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'devis_realise',
    label: 'Devis réalisé',
    subject: 'Votre devis est en préparation',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Nous avons finalisé l'étude de votre projet <strong>${projectName}</strong> et préparé votre devis.
      Vous le recevrez très prochainement dans votre espace client.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'devis_envoye',
    label: 'Devis envoyé',
    subject: 'Votre devis est disponible',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Votre devis pour le projet <strong>${projectName}</strong> est disponible dans votre espace client.
      Vous pouvez le consulter à tête reposée ; nous restons à votre entière disposition pour
      en discuter, l'ajuster ou répondre à vos questions.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'devis_accepte',
    label: 'Devis accepté',
    subject: 'Merci pour votre confiance',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Merci ! Nous avons bien noté votre accord sur le projet <strong>${projectName}</strong>.
      Notre atelier peut maintenant préparer le lancement — nous vous tiendrons informé
      de chaque grande étape.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'acompte',
    label: "Demande d'acompte",
    subject: 'Prochaine étape de votre projet',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Pour lancer la fabrication de votre projet <strong>${projectName}</strong>, nous revenons vers vous
      concernant les modalités de démarrage. Vous trouverez tous les détails dans votre espace client,
      et nous restons joignables pour toute question.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'production',
    label: 'Entrée en fabrication',
    subject: 'Votre meuble entre en fabrication',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Grande étape : votre projet <strong>${projectName}</strong> entre en fabrication
      dans notre atelier. Les panneaux sont sélectionnés, les machines sont prêtes —
      votre meuble prend vie sous les mains de nos menuisiers.</p>
      <p>Nous vous tiendrons informé de l'avancement ; vous pouvez suivre chaque étape
      depuis votre espace client.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'pose',
    label: 'Pose planifiée',
    subject: 'Votre pose est planifiée',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Votre projet <strong>${projectName}</strong> touche au but : la pose est planifiée.
      Notre équipe viendra installer votre meuble avec le plus grand soin, et nous
      reviendrons vers vous très prochainement pour confirmer les détails pratiques
      (date, horaires, accès).</p>
      <p>D'ici là, si vous avez la moindre question, répondez simplement à cet e-mail.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'facture_solde',
    label: 'Facture de solde',
    subject: 'Le point sur votre projet',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Votre projet <strong>${projectName}</strong> arrive à son terme. Vous retrouverez les documents
      correspondants dans votre espace client. Merci encore de votre confiance tout au long
      du projet.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'termine',
    label: 'Projet terminé',
    subject: 'Votre projet est terminé',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Ça y est : votre projet <strong>${projectName}</strong> est terminé !
      Nous espérons qu'il vous apporte entière satisfaction — ce fut un vrai plaisir
      de le concevoir et de le fabriquer pour vous.</p>
      <p>Votre meuble est garanti : au moindre détail à reprendre, répondez simplement
      à cet e-mail et nous revenons chez vous.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'avis_google',
    label: "Demande d'avis",
    subject: 'Votre avis compte pour nous',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Nous espérons que votre projet <strong>${projectName}</strong> vous apporte entière satisfaction.
      Si vous avez deux minutes, votre avis nous aiderait énormément et permet à d'autres familles
      de la région de nous découvrir.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'photos',
    label: 'Photos de réalisation',
    subject: 'Les photos de votre réalisation',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Nous avons pris quelques photos de votre projet <strong>${projectName}</strong> une fois terminé —
      nous en sommes fiers ! Nous serions ravis de les partager avec vous.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'publie_insta',
    label: 'Publié sur Instagram',
    subject: 'Votre réalisation est à l\'honneur',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Avec votre accord, nous avons mis à l'honneur votre projet <strong>${projectName}</strong>
      sur notre page Instagram. Merci de nous permettre de partager ce beau travail !</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
  {
    key: 'publie_site',
    label: 'Publié sur le site',
    subject: 'Votre réalisation est en ligne',
    body: ({ clientName, projectName }) => `
      <p>Bonjour ${clientName},</p>
      <p>Votre projet <strong>${projectName}</strong> figure désormais parmi nos réalisations sur le site.
      Merci de nous permettre de présenter ce travail dont nous sommes fiers.</p>
      ${PROJECT_MAIL_SIGNATURE}`,
  },
];

/** Retrouve un modèle par sa clé (undefined si inconnue) */
export function getStageTemplate(key: string): ProjectStageTemplate | undefined {
  return PROJECT_STAGE_TEMPLATES.find((t) => t.key === key);
}
