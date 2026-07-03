/**
 * Registre de TOUS les modèles d'e-mails du site.
 *
 * Fichier partagé client/serveur : uniquement des données et fonctions pures
 * (aucun import de nodemailer ni de la base) pour pouvoir alimenter l'admin
 * « Mails » côté client.
 *
 * Fonctionnement :
 * - `defaultSubject` / `defaultBody` = le contenu ACTUEL des e-mails du code,
 *   avec les valeurs dynamiques remplacées par des variables `{{nom}}`.
 * - Les personnalisations (overrides) sont stockées dans la table
 *   `email_templates` et résolues côté serveur par `resolveTemplate()`
 *   (src/lib/mailer.ts). Sans override, le rendu est identique octet pour
 *   octet à l'e-mail historique.
 *
 * IMPORTANT :
 * - Les variables sont interpolées DÉJÀ ÉCHAPPÉES HTML par les appelants
 *   (les appels à esc() restent dans mailer.ts / les routes d'envoi).
 * - Aucun prix ne doit jamais figurer en dur dans les modèles destinés aux
 *   clients (les montants des devis passent par des variables).
 */

import { PROJECT_STAGE_TEMPLATES } from './project-mail-templates';

// =============================================
// Types
// =============================================

export interface EmailTemplateVariable {
  name: string;
  description: string;
  /** Valeur d'exemple utilisée pour l'aperçu et l'e-mail de test */
  sample: string;
}

export type EmailTemplateCategoryKey =
  | 'compte'
  | 'devis'
  | 'projet'
  | 'rdv'
  | 'messagerie'
  | 'admin';

export interface EmailTemplateDef {
  key: string;
  label: string;
  category: EmailTemplateCategoryKey;
  description: string;
  variables: EmailTemplateVariable[];
  defaultSubject: string;
  defaultBody: string;
  /**
   * 'full'  : le corps contient toute la mise en page (en-tête vert compris).
   * 'inner' : corps interne uniquement — la route d'envoi l'enveloppe dans le
   *           gabarit (cas des e-mails d'étape projet, route /notify).
   */
  layout: 'full' | 'inner';
}

export const EMAIL_TEMPLATE_CATEGORIES: { key: EmailTemplateCategoryKey; label: string }[] = [
  { key: 'compte', label: 'Compte & accès' },
  { key: 'devis', label: 'Devis' },
  { key: 'projet', label: 'Projet & fabrication' },
  { key: 'rdv', label: 'Rendez-vous & relances' },
  { key: 'messagerie', label: 'Messagerie & contact' },
  { key: 'admin', label: 'Notifications internes admin' },
];

// =============================================
// Gabarits partagés — copies EXACTES de src/lib/mailer.ts
// (ne pas reformater : le rendu doit rester identique octet pour octet)
// =============================================

const SIGNATURE = `
  <br/>
  <p style="margin: 0; color: #555;">À bientôt, chez <strong>Au Format</strong></p>
  <p style="color: #888; font-size: 13px;">Au Format — Menuiserie sur mesure</p>
`;

const btn = (href: string, label: string) => `
  <div style="text-align: center; margin: 24px 0;">
    <a href="${href}" style="display: inline-block; padding: 12px 32px; background: #2C5F2D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">${label}</a>
  </div>`;

const wrap = (title: string, body: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
      <h2 style="margin: 0;">${title}</h2>
    </div>
    <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
      ${body}
      ${SIGNATURE}
    </div>
  </div>`;

/**
 * Gabarit des e-mails d'étape projet (copie exacte du `wrap` de la route
 * /api/admin/projects/[id]/notify) — sert à l'aperçu et aux tests des
 * modèles `layout: 'inner'`.
 */
export const wrapForPreview = (title: string, body: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
      <h2 style="margin: 0;">${title}</h2>
    </div>
    <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
      ${body}
      <p style="color: #888; font-size: 13px; margin-top: 16px;">Au Format — Menuiserie sur mesure</p>
    </div>
  </div>`;

// =============================================
// Variables communes
// =============================================

const V_CLIENT_NAME: EmailTemplateVariable = { name: 'clientName', description: 'Nom du client', sample: 'Marie Dupont' };
const V_PROJECT_NAME: EmailTemplateVariable = { name: 'projectName', description: 'Nom du projet', sample: 'Bibliothèque du salon' };
const V_QUOTE_NUMBER: EmailTemplateVariable = { name: 'quoteNumber', description: 'Numéro du devis', sample: 'DEV-2026-0042' };
const V_SITE_URL: EmailTemplateVariable = { name: 'siteUrl', description: 'Adresse du site (remplie automatiquement)', sample: 'https://auformat.com' };
const V_CLIENT_EMAIL: EmailTemplateVariable = { name: 'clientEmail', description: 'Email du client', sample: 'marie.dupont@exemple.fr' };

// =============================================
// Modèles d'étape projet (générés depuis PROJECT_STAGE_TEMPLATES)
// =============================================

const STAGE_TEMPLATE_DEFS: EmailTemplateDef[] = PROJECT_STAGE_TEMPLATES.map((t) => ({
  key: `stage_${t.key}`,
  label: `Étape : ${t.label}`,
  category: 'projet' as const,
  description: `Envoyé manuellement depuis la fiche projet (« Prévenir le client ») pour l'étape « ${t.label} ». Le sujet sert aussi de titre dans l'e-mail ; « — Au Format » est ajouté automatiquement.`,
  variables: [V_CLIENT_NAME, V_PROJECT_NAME],
  defaultSubject: t.subject,
  defaultBody: t.body({ clientName: '{{clientName}}', projectName: '{{projectName}}' }),
  layout: 'inner' as const,
}));

// =============================================
// Registre complet
// =============================================

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  // ------- Compte & accès -------
  {
    key: 'welcome',
    label: 'Bienvenue',
    category: 'compte',
    description: 'Envoyé au client juste après la création de son compte.',
    variables: [V_CLIENT_NAME],
    defaultSubject: 'Bienvenue chez Au Format !',
    defaultBody: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Bienvenue chez Au Format !</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour {{clientName}},</p>
        <p>Votre compte a bien été créé sur <strong>Au Format</strong>.</p>
        <p>Vous pouvez désormais :</p>
        <ul>
          <li>Configurer vos meubles sur mesure avec notre configurateur</li>
          <li>Demander des devis en ligne</li>
          <li>Suivre l'avancement de vos commandes</li>
        </ul>
        <p>N'hésitez pas à nous contacter pour toute question.</p>
        ${SIGNATURE}
      </div>
    </div>
  `,
    layout: 'full',
  },
  {
    key: 'email_verification',
    label: 'Vérification de l\'email',
    category: 'compte',
    description: 'Envoyé à l\'inscription pour vérifier l\'adresse email du client (lien valable 24 h).',
    variables: [
      { name: 'verificationUrl', description: 'Lien de vérification (rempli automatiquement)', sample: 'https://auformat.com/verification?token=exemple' },
    ],
    defaultSubject: 'Vérifiez votre email — Au Format',
    defaultBody: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Vérifiez votre adresse email</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour,</p>
        <p>Merci de vous être inscrit sur <strong>Au Format</strong>. Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{verificationUrl}}" style="display: inline-block; padding: 12px 32px; background: #2C5F2D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Vérifier mon email
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
        ${SIGNATURE}
      </div>
    </div>
  `,
    layout: 'full',
  },
  {
    key: 'password_reset',
    label: 'Réinitialisation du mot de passe',
    category: 'compte',
    description: 'Envoyé quand le client demande à réinitialiser son mot de passe (lien valable 1 h).',
    variables: [
      { name: 'resetUrl', description: 'Lien de réinitialisation (rempli automatiquement)', sample: 'https://auformat.com/reinitialisation?token=exemple' },
    ],
    defaultSubject: 'Réinitialisation de mot de passe — Au Format',
    defaultBody: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Réinitialisation de votre mot de passe</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe sur <strong>Au Format</strong>.</p>
        <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{resetUrl}}" style="display: inline-block; padding: 12px 32px; background: #2C5F2D; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez simplement cet email.</p>
        ${SIGNATURE}
      </div>
    </div>
  `,
    layout: 'full',
  },

  // ------- Devis -------
  {
    key: 'quote_sent',
    label: 'Envoi du devis au client',
    category: 'devis',
    description: 'Envoyé au client avec le détail chiffré de son devis (et le PDF en pièce jointe le cas échéant).',
    variables: [
      V_CLIENT_NAME,
      V_QUOTE_NUMBER,
      {
        name: 'itemRows',
        description: 'Lignes du tableau des prestations (bloc HTML calculé automatiquement)',
        sample: '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Bibliothèque sur mesure en chêne</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">1</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">2 041,67 €</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">2 041,67 €</td></tr>',
      },
      { name: 'subtotalHt', description: 'Sous-total HT formaté', sample: '2 041,67 €' },
      { name: 'tva', description: 'Montant de TVA formaté', sample: '408,33 €' },
      { name: 'totalTtc', description: 'Total TTC formaté', sample: '2 450,00 €' },
      {
        name: 'footerBlock',
        description: 'Paragraphe de pied (différent selon qu\'un PDF est joint ou non — calculé automatiquement)',
        sample: '<p style="color: #888; font-size: 13px;">Ce devis est estimatif. Notre équipe vous recontactera pour confirmer les détails et le prix final.</p>',
      },
    ],
    defaultSubject: 'Votre devis {{quoteNumber}} — Au Format',
    defaultBody: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Au Format — Votre devis</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour {{clientName}},</p>
        <p>Voici votre devis <strong>{{quoteNumber}}</strong> :</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="padding: 8px; text-align: left;">Description</th>
              <th style="padding: 8px; text-align: center;">Qté</th>
              <th style="padding: 8px; text-align: right;">P.U.</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>{{itemRows}}</tbody>
        </table>
        <div style="text-align: right; margin-top: 12px;">
          <p style="margin: 4px 0; color: #666;">Sous-total HT : {{subtotalHt}}</p>
          <p style="margin: 4px 0; color: #666;">TVA (20%) : {{tva}}</p>
          <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #2C5F2D;">Total TTC : {{totalTtc}}</p>
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        {{footerBlock}}
        ${SIGNATURE}
      </div>
    </div>
  `,
    layout: 'full',
  },

  // ------- Projet & fabrication -------
  {
    key: 'project_update',
    label: 'Avancement du projet',
    category: 'projet',
    description: 'Envoyé automatiquement au client quand son projet change d\'étape de fabrication (kanban admin).',
    variables: [
      V_CLIENT_NAME,
      V_PROJECT_NAME,
      { name: 'statusLabel', description: 'Libellé de la nouvelle étape', sample: 'Fabrication' },
      {
        name: 'noteBlock',
        description: 'Note de l\'atelier (bloc HTML calculé automatiquement, peut être vide)',
        sample: '<blockquote style="margin: 12px 0; padding: 12px; background: #f9f9f9; border-left: 3px solid #2C5F2D; border-radius: 4px; color: #555;">Les panneaux sont découpés, montage prévu la semaine prochaine.</blockquote>',
      },
      {
        name: 'photosBlock',
        description: 'Ligne « photos d\'atelier ajoutées » (bloc HTML calculé automatiquement, peut être vide)',
        sample: '<p>📷 2 photos d\'atelier ont été ajoutées à votre suivi.</p>',
      },
      V_SITE_URL,
    ],
    defaultSubject: 'Votre projet « {{projectName}} » : {{statusLabel}} — Au Format',
    defaultBody: wrap('Votre projet avance !', `
    <p>Bonjour {{clientName}},</p>
    <p>Bonne nouvelle : votre projet <strong>{{projectName}}</strong> vient de passer à l'étape
    <strong style="color: #2C5F2D;">{{statusLabel}}</strong>.</p>
    {{noteBlock}}
    {{photosBlock}}
    ${btn('{{siteUrl}}/mes-projets', 'Voir le suivi de mon projet')}
  `),
    layout: 'full',
  },
  ...STAGE_TEMPLATE_DEFS,
  {
    key: 'review_request',
    label: 'Demande d\'avis Google',
    category: 'projet',
    description: 'Envoyé automatiquement quelques jours après la fin du chantier pour inviter le client à laisser un avis Google.',
    variables: [
      V_CLIENT_NAME,
      V_PROJECT_NAME,
      { name: 'reviewUrl', description: 'Lien « laisser un avis » Google (paramétré dans Paramètres du site)', sample: 'https://g.page/r/exemple/review' },
    ],
    defaultSubject: 'Comment trouvez-vous votre {{projectName}} ? — Au Format',
    defaultBody: wrap('Votre avis compte énormément', `
    <p>Bonjour {{clientName}},</p>
    <p>Votre projet <strong>{{projectName}}</strong> est terminé — nous espérons qu'il vous
    apporte entière satisfaction, et c'était un plaisir de le fabriquer pour vous.</p>
    <p>Si vous avez deux minutes, votre avis sur Google aide énormément notre atelier :
    c'est grâce à lui que d'autres familles de la région nous découvrent.</p>
    ${btn('{{reviewUrl}}', '⭐ Laisser un avis sur Google')}
    <p style="color: #888; font-size: 13px;">Un détail à reprendre ? Répondez simplement à cet email,
    nous revenons chez vous — c'est garanti 2 ans.</p>
  `),
    layout: 'full',
  },

  // ------- Rendez-vous & relances -------
  {
    key: 'rdv_reminder',
    label: 'Rappel de rendez-vous (J-1)',
    category: 'rdv',
    description: 'Envoyé automatiquement la veille d\'un rendez-vous (découverte, technique ou pose).',
    variables: [
      V_CLIENT_NAME,
      { name: 'typeLabel', description: 'Type de rendez-vous', sample: 'Rendez-vous technique' },
      V_PROJECT_NAME,
      { name: 'whenLabel', description: 'Date et heure du rendez-vous', sample: 'jeudi 9 juillet à 14h00' },
      V_SITE_URL,
    ],
    defaultSubject: 'Rappel : votre rendez-vous demain — Au Format',
    defaultBody: wrap('À demain !', `
    <p>Bonjour {{clientName}},</p>
    <p>Petit rappel : nous avons rendez-vous <strong>demain</strong> pour votre projet
    <strong>{{projectName}}</strong>.</p>
    <blockquote style="margin: 12px 0; padding: 12px; background: #f9f9f9; border-left: 3px solid #2C5F2D; border-radius: 4px; color: #555;">
      <strong style="color: #2C5F2D;">{{typeLabel}}</strong><br/>
      {{whenLabel}}
    </blockquote>
    <p>Un empêchement ou une question ? Répondez simplement à cet email ou appelez-nous,
    nous trouverons un autre créneau.</p>
    ${btn('{{siteUrl}}/mes-projets', 'Voir mon projet')}
    <p style="margin: 16px 0 0; color: #555;">À demain,<br/><strong>L'atelier Au Format</strong></p>
  `),
    layout: 'full',
  },
  {
    key: 'quote_reminder',
    label: 'Relance devis sans réponse (J+7)',
    category: 'rdv',
    description: 'Envoyé automatiquement (cron quotidien) quand un devis est resté sans réponse depuis 7 jours.',
    variables: [
      V_CLIENT_NAME,
      V_QUOTE_NUMBER,
      { name: 'totalTtc', description: 'Total TTC formaté', sample: '2 450,00 €' },
      {
        name: 'validityLine',
        description: 'Ligne « valable jusqu\'au… » (bloc HTML calculé automatiquement, peut être vide)',
        sample: '<p style="color: #888; font-size: 13px;">Ce devis est valable jusqu\'au 15/08/2026.</p>',
      },
      V_SITE_URL,
    ],
    defaultSubject: 'Votre devis {{quoteNumber}} vous attend — Au Format',
    defaultBody: wrap('Votre devis vous attend', `
    <p>Bonjour {{clientName}},</p>
    <p>Nous vous avons transmis il y a quelques jours le devis <strong>{{quoteNumber}}</strong>
    ({{totalTtc}} TTC) pour votre projet sur mesure.</p>
    <p>Avez-vous eu le temps d'y jeter un œil ? Nous restons à votre disposition pour
    ajuster le projet, répondre à vos questions ou planifier une visite à l'atelier.</p>
    {{validityLine}}
    ${btn('{{siteUrl}}/mes-devis', 'Consulter mon devis')}
    <p style="color: #888; font-size: 13px;">Une question ? Répondez simplement à cet email ou appelez-nous.</p>
  `),
    layout: 'full',
  },
  {
    key: 'quote_expiry',
    label: 'Devis bientôt expiré (J-5)',
    category: 'rdv',
    description: 'Envoyé automatiquement (cron quotidien) 5 jours avant la date d\'échéance d\'un devis.',
    variables: [
      V_CLIENT_NAME,
      V_QUOTE_NUMBER,
      { name: 'validUntilDate', description: 'Date d\'échéance formatée', sample: '15/08/2026' },
      V_SITE_URL,
    ],
    defaultSubject: 'Votre devis {{quoteNumber}} expire bientôt — Au Format',
    defaultBody: wrap('Votre devis expire bientôt', `
    <p>Bonjour {{clientName}},</p>
    <p>Petit rappel : votre devis <strong>{{quoteNumber}}</strong> arrive à échéance le
    <strong>{{validUntilDate}}</strong>.</p>
    <p>Passé cette date, les prix des matériaux pourront être réévalués. Si le projet vous
    tient toujours à cœur, c'est le bon moment pour le valider — ou pour nous demander
    un ajustement.</p>
    ${btn('{{siteUrl}}/mes-devis', 'Consulter mon devis')}
  `),
    layout: 'full',
  },

  // ------- Messagerie & contact -------
  {
    key: 'chat_client',
    label: 'Nouveau message de l\'atelier',
    category: 'messagerie',
    description: 'Envoyé au client quand l\'atelier lui écrit dans la messagerie et que le message reste non lu.',
    variables: [
      V_CLIENT_NAME,
      { name: 'contextLabel', description: 'Contexte de la conversation (projet, devis…)', sample: 'Bibliothèque du salon' },
      { name: 'preview', description: 'Aperçu du message', sample: 'Bonjour, la teinte choisie est arrivée à l\'atelier…' },
      V_SITE_URL,
    ],
    defaultSubject: 'Nouveau message — {{contextLabel}} — Au Format',
    defaultBody: wrap('Nouveau message de l\'atelier', `
    <p>Bonjour {{clientName}},</p>
    <p>L'atelier Au Format vous a écrit au sujet de <strong>{{contextLabel}}</strong> :</p>
    <blockquote style="margin: 12px 0; padding: 12px; background: #f9f9f9; border-left: 3px solid #2C5F2D; border-radius: 4px; color: #555;">{{preview}}</blockquote>
    ${btn('{{siteUrl}}/mes-projets', 'Répondre dans mon espace')}
  `),
    layout: 'full',
  },
  {
    key: 'contact_confirmation',
    label: 'Confirmation de demande de contact',
    category: 'messagerie',
    description: 'Envoyé au visiteur après l\'envoi du formulaire de contact (accusé de réception).',
    variables: [
      { name: 'firstName', description: 'Prénom du visiteur', sample: 'Marie' },
      {
        name: 'messageHtml',
        description: 'Message du visiteur (échappé, sauts de ligne convertis — calculé automatiquement)',
        sample: 'Bonjour,<br/>je souhaite un dressing sur mesure pour une chambre mansardée.',
      },
    ],
    defaultSubject: 'Votre demande de contact — Au Format',
    defaultBody: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Votre demande a bien été reçue</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Bonjour {{firstName}},</p>
        <p>Nous avons bien reçu votre demande de contact et nous vous répondrons dans les <strong>24 heures</strong>.</p>
        <p style="color: #888; font-size: 13px;">Voici un récapitulatif de votre message :</p>
        <blockquote style="margin: 12px 0; padding: 12px; background: #f9f9f9; border-left: 3px solid #2C5F2D; border-radius: 4px; font-size: 14px; color: #555;">
          {{messageHtml}}
        </blockquote>
        <p>N'hésitez pas à nous appeler directement si votre demande est urgente.</p>
        ${SIGNATURE}
      </div>
    </div>
  `,
    layout: 'full',
  },

  // ------- Notifications internes admin -------
  {
    key: 'admin_new_quote',
    label: 'Nouvelle demande de devis',
    category: 'admin',
    description: 'Envoyé à l\'atelier et aux administrateurs quand un client soumet une demande de devis.',
    variables: [
      V_QUOTE_NUMBER,
      V_CLIENT_NAME,
      V_CLIENT_EMAIL,
      { name: 'totalTtc', description: 'Total TTC estimé', sample: '2 450,00 €' },
    ],
    defaultSubject: 'Nouveau devis {{quoteNumber}} - {{clientName}}',
    defaultBody: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Nouvelle demande de devis</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p><strong>Devis n&deg;</strong> {{quoteNumber}}</p>
        <p><strong>Client :</strong> {{clientName}}</p>
        <p><strong>Email :</strong> {{clientEmail}}</p>
        <p><strong>Total TTC :</strong> {{totalTtc}}</p>
        <br/>
        <p>Connectez-vous à l'espace admin pour consulter et traiter ce devis.</p>
        ${SIGNATURE}
      </div>
    </div>
  `,
    layout: 'full',
  },
  {
    key: 'admin_new_registration',
    label: 'Nouveau client inscrit',
    category: 'admin',
    description: 'Envoyé à l\'atelier quand un nouveau client crée un compte.',
    variables: [
      V_CLIENT_NAME,
      V_CLIENT_EMAIL,
      { name: 'registrationDate', description: 'Date d\'inscription (remplie automatiquement)', sample: '03/07/2026' },
    ],
    defaultSubject: 'Nouveau client inscrit - {{clientName}}',
    defaultBody: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Nouveau client inscrit</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p><strong>Nom :</strong> {{clientName}}</p>
        <p><strong>Email :</strong> {{clientEmail}}</p>
        <p style="color: #888; font-size: 13px;">Inscription le {{registrationDate}}</p>
        ${SIGNATURE}
      </div>
    </div>
  `,
    layout: 'full',
  },
  {
    key: 'admin_contact',
    label: 'Nouvelle demande de contact',
    category: 'admin',
    description: 'Envoyé à l\'atelier quand un visiteur remplit le formulaire de contact.',
    variables: [
      { name: 'firstName', description: 'Prénom du visiteur', sample: 'Marie' },
      { name: 'lastName', description: 'Nom du visiteur', sample: 'Dupont' },
      { name: 'email', description: 'Email du visiteur', sample: 'marie.dupont@exemple.fr' },
      { name: 'phone', description: 'Téléphone du visiteur', sample: '06 12 34 56 78' },
      { name: 'city', description: 'Ville', sample: 'Lille' },
      { name: 'zipCode', description: 'Code postal', sample: '59000' },
      { name: 'projectType', description: 'Type de projet', sample: 'Dressing' },
      { name: 'message', description: 'Message du visiteur (échappé)', sample: 'Bonjour, je souhaite un dressing sur mesure pour une chambre mansardée.' },
      {
        name: 'attachmentsBlock',
        description: 'Liste des fichiers joints (bloc HTML calculé automatiquement, peut être vide)',
        sample: '<hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />\n       <p style="margin: 0 0 8px; color: #888; font-size: 13px;">Fichiers joints par le client :</p>\n       <ul style="margin: 0; padding-left: 18px;"><li><a href="#">photo-chambre.jpg</a></li></ul>',
      },
    ],
    defaultSubject: 'Contact : {{firstName}} {{lastName}} — {{projectType}}',
    defaultBody: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2C5F2D; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Nouvelle demande de contact</h2>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #888; width: 120px;">Nom</td><td style="padding: 6px 0;"><strong>{{firstName}} {{lastName}}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #888;">Email</td><td style="padding: 6px 0;"><a href="mailto:{{email}}">{{email}}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #888;">Téléphone</td><td style="padding: 6px 0;"><a href="tel:{{phone}}">{{phone}}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #888;">Ville</td><td style="padding: 6px 0;">{{city}} ({{zipCode}})</td></tr>
          <tr><td style="padding: 6px 0; color: #888;">Type de projet</td><td style="padding: 6px 0;">{{projectType}}</td></tr>
        </table>
        <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />
        <p style="margin: 0 0 8px; color: #888; font-size: 13px;">Message :</p>
        <p style="margin: 0; white-space: pre-wrap;">{{message}}</p>
        {{attachmentsBlock}}
        ${SIGNATURE}
      </div>
    </div>
  `,
    layout: 'full',
  },
  {
    key: 'admin_quote_revision',
    label: 'Demande de modification de devis',
    category: 'admin',
    description: 'Envoyé à l\'atelier quand un client demande une modification sur son devis.',
    variables: [
      V_QUOTE_NUMBER,
      V_CLIENT_NAME,
      V_CLIENT_EMAIL,
      {
        name: 'messageHtml',
        description: 'Demande du client (échappée, sauts de ligne convertis — calculée automatiquement)',
        sample: 'Serait-il possible de passer sur des façades en chêne clair ?',
      },
    ],
    defaultSubject: 'Modification demandée sur {{quoteNumber}} — {{clientName}}',
    defaultBody: wrap('Demande de modification de devis', `
    <p><strong>Devis :</strong> {{quoteNumber}}</p>
    <p><strong>Client :</strong> {{clientName}} (<a href="mailto:{{clientEmail}}">{{clientEmail}}</a>)</p>
    <p style="margin: 0 0 8px; color: #888; font-size: 13px;">Sa demande :</p>
    <blockquote style="margin: 12px 0; padding: 12px; background: #f9f9f9; border-left: 3px solid #2C5F2D; border-radius: 4px;">{{messageHtml}}</blockquote>
    <p>Retrouvez le devis dans l'espace admin pour le retravailler et le renvoyer.</p>
  `),
    layout: 'full',
  },
  {
    key: 'admin_chat',
    label: 'Nouveau message client',
    category: 'admin',
    description: 'Envoyé à l\'atelier quand un client écrit dans la messagerie et que le message reste non lu.',
    variables: [
      V_CLIENT_NAME,
      { name: 'contextLabel', description: 'Contexte de la conversation (projet, devis…)', sample: 'Bibliothèque du salon' },
      { name: 'preview', description: 'Aperçu du message', sample: 'Bonjour, nous avons une question sur la teinte…' },
      V_SITE_URL,
    ],
    defaultSubject: 'Message client — {{contextLabel}} — {{clientName}}',
    defaultBody: wrap('Nouveau message client', `
    <p><strong>{{clientName}}</strong> vous a écrit au sujet de <strong>{{contextLabel}}</strong> :</p>
    <blockquote style="margin: 12px 0; padding: 12px; background: #f9f9f9; border-left: 3px solid #2C5F2D; border-radius: 4px;">{{preview}}</blockquote>
    ${btn('{{siteUrl}}/admin/projets', 'Répondre depuis le suivi des projets')}
  `),
    layout: 'full',
  },
];

// =============================================
// Rendu (pur)
// =============================================

/** Remplace chaque occurrence de {{variable}} par sa valeur (les inconnues sont laissées telles quelles) */
export function interpolateTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match
  );
}

/** Retrouve un modèle par sa clé (undefined si inconnue) */
export function getEmailTemplate(key: string): EmailTemplateDef | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}

/**
 * Rend un modèle : sujet/corps personnalisés s'ils existent, sinon les défauts
 * du code, puis interpolation des variables.
 *
 * IMPORTANT : les valeurs de `vars` doivent être DÉJÀ échappées HTML par
 * l'appelant lorsqu'elles proviennent d'une saisie utilisateur.
 * `subjectVars` permet, si besoin, d'interpoler le sujet avec des valeurs
 * différentes (ex. non échappées, un sujet étant du texte brut).
 */
export function renderTemplate(
  def: EmailTemplateDef,
  overrides: { subject?: string | null; body?: string | null } | null | undefined,
  vars: Record<string, string>,
  subjectVars?: Record<string, string>
): { subject: string; body: string } {
  const subjectTpl = overrides?.subject?.trim() ? overrides.subject : def.defaultSubject;
  const bodyTpl = overrides?.body?.trim() ? overrides.body : def.defaultBody;
  return {
    subject: interpolateTemplate(subjectTpl, subjectVars ?? vars),
    body: interpolateTemplate(bodyTpl, vars),
  };
}
