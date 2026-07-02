import { ADMIN_NAV_CRM, ADMIN_NAV_CONTENT } from './constants';

export type AdminSearchEntry = {
  label: string;
  href: string;
  group: string;
  icon?: string;
  /** Mots-clés supplémentaires pour la recherche (réglages contenus dans la page) */
  keywords?: string;
};

/** Réglages / actions précis, avec lien direct vers la page (et l'onglet quand supporté). */
const SETTINGS_INDEX: AdminSearchEntry[] = [
  // ── Configurateur : réglages détaillés (tous vers l'onglet Univers & Modules) ──
  { label: 'Socle des modules (plinthe / pieds)', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'socle plinthe pieds metal bois option module posé sol' },
  { label: 'Dimensions min / max des modules', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'dimension largeur hauteur profondeur minimum maximum 100 2800 mm curseur borne' },
  { label: 'Étagères / tiroirs : nombre max & défaut', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'etagere tablette tiroir nombre max maximum defaut option compteur' },
  { label: 'Portes des modules (libellés)', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'porte pleine haute basse battante coulissante option facade' },
  { label: 'Penderie : disposition des tringles', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'penderie tringle disposition simple double haut bas dressing' },
  { label: 'Bibliothèque à cases (grille)', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'bibliotheque case grille colonne etagere kallax' },
  { label: 'Bandeau & plafond', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'bandeau plafond hauteur sous plafond cache trou finition' },
  { label: 'Fusion / empilement de modules', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'fusion fusionner empilement superposer caisson colle pose sur' },
  { label: 'Matériau intérieur / façades', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'materiau interieur exterieur facade couleur teinte' },
  { label: 'Plan de travail & façade coulissante', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'plan travail facade coulissante prix ml univers cuisine dressing' },
  { label: 'Univers d\'agencement (cuisine, dressing…)', href: '/admin/configurateur?tab=univers&focus=univers', group: 'Configurateur', icon: '🛠️', keywords: 'univers cuisine dressing salle de bain famille module depart' },
  { label: 'Nouveau module (créer)', href: '/admin/configurateur?tab=univers&focus=modules', group: 'Configurateur', icon: '🛠️', keywords: 'nouveau module creer ajouter brique' },
  { label: 'Textes du configurateur', href: '/admin/configurateur?tab=labels', group: 'Configurateur', icon: '🛠️', keywords: 'titre sous-titre libelle texte bouton devis etape recap' },
  { label: 'Affichage des prix client (devis / estimation)', href: '/admin/configurateur?focus=prix', group: 'Configurateur', icon: '🛠️', keywords: 'prix sur devis estimation masque afficher tarif client mode' },
  // ── Paramètres ──
  { label: 'TVA / taux de taxe', href: '/admin/parametres', group: 'Paramètres', icon: '⚙️', keywords: 'tva taxe taux pourcentage devis facturation' },
  { label: 'Coordonnées (adresse, téléphone, email)', href: '/admin/parametres?focus=contact', group: 'Paramètres', icon: '⚙️', keywords: 'adresse telephone email ville code postal contact coordonnees' },
  { label: 'Horaires d\'ouverture', href: '/admin/parametres?focus=horaires', group: 'Paramètres', icon: '⚙️', keywords: 'horaires ouverture semaine samedi dimanche jours' },
  { label: 'Thème & couleurs du site', href: '/admin/parametres?focus=couleurs', group: 'Paramètres', icon: '⚙️', keywords: 'theme couleur police font vert foret bois beige noir blanc palette' },
  { label: 'Typographie / polices', href: '/admin/parametres?focus=typographie', group: 'Paramètres', icon: '⚙️', keywords: 'typographie police font moderne classique' },
  { label: 'Image / fond du hero (accueil)', href: '/admin/parametres?focus=hero', group: 'Paramètres', icon: '⚙️', keywords: 'hero fond image accueil banniere background' },
  { label: 'Réseaux sociaux (Instagram, Facebook)', href: '/admin/parametres?focus=reseaux', group: 'Paramètres', icon: '⚙️', keywords: 'reseaux sociaux instagram facebook lien' },
  { label: 'Activer / désactiver le configurateur', href: '/admin/parametres?focus=configurateur', group: 'Paramètres', icon: '⚙️', keywords: 'configurateur activer desactiver visible' },
  // ── Contenu ──
  { label: 'Matériaux — photo & rendu 3D (bois/uni)', href: '/admin/materiaux', group: 'Contenu', icon: '🪵', keywords: 'materiau photo image bois uni veinage grain rendu 3d realiste' },
  { label: 'Matériaux — prix au m²', href: '/admin/materiaux', group: 'Contenu', icon: '🪵', keywords: 'materiau prix m2 tarif essence' },
  { label: 'Réalisations — tags savoir-faire', href: '/admin/realisations', group: 'Contenu', icon: '🖼️', keywords: 'realisation tag service savoir-faire galerie associer sous-page' },
  { label: 'Réalisations — galerie & photos', href: '/admin/realisations', group: 'Contenu', icon: '🖼️', keywords: 'realisation galerie photo image chantier projet' },
  { label: 'Services / savoir-faire — contenu des pages', href: '/admin/services', group: 'Contenu', icon: '🔧', keywords: 'service savoir-faire meuble dressing cuisine bibliotheque bureau intro arguments features body' },
  { label: 'Catégories (réalisations, blog)', href: '/admin/categories', group: 'Contenu', icon: '🏷️', keywords: 'categorie tag particuliers professionnels blog realisation' },
  { label: 'Blog / articles', href: '/admin/articles', group: 'Contenu', icon: '📰', keywords: 'blog article actualite publication redaction' },
  { label: 'Avis clients', href: '/admin/avis', group: 'Contenu', icon: '⭐', keywords: 'avis temoignage note etoiles client' },
  { label: 'Équipe', href: '/admin/equipe', group: 'Contenu', icon: '👤', keywords: 'equipe membre photo role artisan' },
  { label: 'Pages / contenu éditorial', href: '/admin/contenu', group: 'Contenu', icon: '📝', keywords: 'page contenu texte editorial about processus' },
  // ── CRM ──
  { label: 'Devis', href: '/admin/devis', group: 'CRM', icon: '📄', keywords: 'devis chiffrage relance envoyer client montant' },
  { label: 'Projets / suivi fabrication', href: '/admin/projets', group: 'CRM', icon: '🛠️', keywords: 'projet chantier fabrication kanban suivi timeline' },
  { label: 'Clients', href: '/admin/clients', group: 'CRM', icon: '👥', keywords: 'client contact fiche compte' },
  { label: 'Messages / chat', href: '/admin/chat', group: 'CRM', icon: '💬', keywords: 'chat message discussion client atelier' },
  { label: 'Logs / activité', href: '/admin/logs', group: 'CRM', icon: '📋', keywords: 'log activite historique action' },
];

/** Index complet : pages du menu + réglages précis. */
export function buildAdminSearchIndex(): AdminSearchEntry[] {
  const pages: AdminSearchEntry[] = [
    ...ADMIN_NAV_CRM.map((n) => ({ label: n.label, href: n.href, group: 'Pages', icon: n.icon })),
    ...ADMIN_NAV_CONTENT.map((n) => ({ label: n.label, href: n.href, group: 'Pages', icon: n.icon })),
  ];
  return [...pages, ...SETTINGS_INDEX];
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Filtre l'index par requête (sur le libellé, le groupe et les mots-clés, insensible aux accents). */
export function searchAdmin(query: string, index = buildAdminSearchIndex()): AdminSearchEntry[] {
  const q = norm(query.trim());
  if (!q) return index;
  const terms = q.split(/\s+/);
  return index
    .map((e) => {
      const hay = norm(`${e.label} ${e.group} ${e.keywords || ''}`);
      const score = terms.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0);
      return { e, score, exact: norm(e.label).startsWith(q) };
    })
    .filter((r) => r.score === terms.length)
    .sort((a, b) => Number(b.exact) - Number(a.exact))
    .map((r) => r.e);
}
