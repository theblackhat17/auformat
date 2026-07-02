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
];

/** Retrouve un modèle par sa clé (undefined si inconnue) */
export function getStageTemplate(key: string): ProjectStageTemplate | undefined {
  return PROJECT_STAGE_TEMPLATES.find((t) => t.key === key);
}
