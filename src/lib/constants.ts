import type {
  WoodMaterial, ModuleCatalogItem, HandleType,
  HingeCatalogItem, DrawerSlideCatalogItem, EdgeBandingCatalogItem,
  FinishCatalogItem, ShelfSupportCatalogItem, CountertopMaterialItem,
  KitchenCabinetCatalogItem, MeubleTemplateDef, KitchenLayoutShape, Cabinet,
} from './types';

// TVA
export const TAX_RATE = 0.20;
export const HARDWARE_COST = 50;

// Project status labels (French)
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  quote_requested: 'Devis demandé',
  quoted: 'Devis reçu',
  in_production: 'En production',
  completed: 'Terminé',
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  quote_requested: 'bg-amber-100 text-amber-700',
  quoted: 'bg-blue-100 text-blue-700',
  in_production: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};

// Quote status
export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  viewed: 'Consulté',
  accepted: 'Accepté',
  refused: 'Refusé',
  expired: 'Expiré',
};

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-cyan-100 text-cyan-700',
  accepted: 'bg-green-100 text-green-700',
  refused: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
};

// Activity log action types
export const ACTION_TYPE_LABELS: Record<string, string> = {
  login: 'Connexion',
  logout: 'Déconnexion',
  register: 'Inscription',
  create_client: 'Création client',
  update_client: 'Modification client',
  create_quote: 'Création devis',
  send_quote: 'Envoi devis',
  accept_quote: 'Acceptation devis',
  refuse_quote: 'Refus devis',
  create_project: 'Création projet',
  update_project: 'Modification projet',
  delete_project: 'Suppression projet',
  export_data: 'Export données',
  view_page: 'Consultation page',
  error: 'Erreur',
  update_profile: 'Modification profil',
  reset_password: 'Réinitialisation MDP',
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  auth: 'Authentification',
  client: 'Client',
  quote: 'Devis',
  project: 'Projet',
  user: 'Utilisateur',
  export: 'Export',
  system: 'Système',
  page: 'Page',
};

export const ACTION_TYPE_ICONS: Record<string, string> = {
  login: '🔑',
  logout: '👋',
  register: '✨',
  create_client: '👤',
  update_client: '✏️',
  create_quote: '📄',
  send_quote: '📨',
  accept_quote: '✅',
  refuse_quote: '❌',
  create_project: '🪑',
  update_project: '🔧',
  delete_project: '🗑️',
  export_data: '📊',
  view_page: '👁️',
  error: '⚠️',
  update_profile: '👤',
  reset_password: '🔒',
};

// Wood materials for configurator
export const WOOD_MATERIALS: Record<string, WoodMaterial> = {
  chene: { name: 'Chêne massif', color: 0xD4A574, price: 45, texture: 'oak' },
  noyer: { name: 'Noyer', color: 0x8B5A3C, price: 55, texture: 'walnut' },
  pin: { name: 'Pin', color: 0xE8D4B0, price: 35, texture: 'pine' },
  hetre: { name: 'Hêtre', color: 0xDEB887, price: 42, texture: 'beech' },
  bouleau: { name: 'Bouleau', color: 0xEDE0C8, price: 38, texture: 'birch' },
  frene: { name: 'Frêne', color: 0xC8B990, price: 48, texture: 'ash' },
  blanc: { name: 'Mélamine blanc', color: 0xF5F5F5, price: 40, texture: 'white' },
  noir: { name: 'Mélamine noir', color: 0x2D2D2D, price: 42, texture: 'black' },
  mdf_brut: { name: 'MDF brut', color: 0xC4A882, price: 22, texture: 'mdf' },
  mdf_laque: { name: 'MDF laqué', color: 0xE8E8E8, price: 35, texture: 'mdf-lacquer' },
  contreplaque: { name: 'Contreplaqué bouleau', color: 0xD2C4A8, price: 30, texture: 'plywood' },
  stratifie_chene: { name: 'Stratifié chêne', color: 0xC9A96E, price: 28, texture: 'laminate-oak' },
};

// Module catalog
export const MODULES_CATALOG: Record<string, ModuleCatalogItem> = {
  etagere: { name: 'Étagère', icon: '📏', basePrice: 15, height: 18 },
  tiroir: { name: 'Tiroir', icon: '🗄️', basePrice: 45, height: 150 },
  penderie: { name: 'Penderie', icon: '👔', basePrice: 35, height: 1200 },
  niche: { name: 'Niche', icon: '📦', basePrice: 0, height: 300 },
  porte: { name: 'Porte', icon: '🚪', basePrice: 80, height: 2000, width: 400 },
};

// Handle types
export const HANDLE_TYPES: Record<string, HandleType> = {
  moderne: { name: 'Moderne', icon: '▬', price: 8, model: 'bar' },
  bouton: { name: 'Bouton', icon: '●', price: 5, model: 'knob' },
  coquille: { name: 'Coquille', icon: '◗', price: 12, model: 'shell' },
  invisible: { name: 'Invisible', icon: '⊟', price: 15, model: 'push' },
};

// Project type icons & labels
export const PROJECT_TYPE_ICONS: Record<string, string> = {
  meuble: '🪑',
  planche: '📏',
  cuisine: '🍳',
  // Legacy compat
  custom: '🎨',
  dressing: '👔',
  'kitchen-base': '🍳',
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  meuble: 'Meuble sur-mesure',
  planche: 'Planche découpée',
  cuisine: 'Cuisine',
  custom: 'Meuble sur-mesure',
  dressing: 'Dressing',
  'kitchen-base': 'Cuisine',
};

// Realisation category labels
export const CATEGORY_LABELS: Record<string, string> = {
  cuisines: '🍳 Cuisines',
  dressings: '👔 Dressings',
  bibliotheques: '📚 Bibliothèques',
  commerces: '🏢 Commerces',
  escaliers: '🪜 Escaliers',
  exterieurs: '🚪 Extérieurs',
};

// Material category titles
export const MATERIAL_CATEGORY_TITLES: Record<string, string> = {
  nobles: 'Bois Nobles',
  locaux: 'Bois Locaux',
  exotiques: 'Bois Exotiques',
  exterieurs: 'Bois Extérieurs',
};

// Navigation links
export const NAV_LINKS = [
  { href: '/configurateur', label: 'Configurateur' },
  { href: '/homemade', label: 'Savoir-faire' },
  { href: '/realisations', label: 'Réalisations' },
  { href: '/processus', label: 'Processus' },
  { href: '/materiaux', label: 'Matériaux' },
  { href: '/avis', label: 'Avis' },
  { href: '/contact', label: 'Contact' },
  { href: '/about', label: 'À propos' },
];

// Admin navigation
export const ADMIN_NAV_CRM = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/clients', label: 'Clients', icon: '👥' },
  { href: '/admin/devis', label: 'Devis', icon: '📄' },
  { href: '/admin/logs', label: 'Logs', icon: '📋' },
];

export const ADMIN_NAV_CONTENT = [
  { href: '/admin/parametres', label: 'Paramètres', icon: '⚙️' },
  { href: '/admin/contenu', label: 'Pages', icon: '📝' },
  { href: '/admin/categories', label: 'Catégories', icon: '🏷️' },
  { href: '/admin/realisations', label: 'Réalisations', icon: '🖼️' },
  { href: '/admin/avis', label: 'Avis', icon: '⭐' },
  { href: '/admin/materiaux', label: 'Matériaux', icon: '🪵' },
  { href: '/admin/equipe', label: 'Équipe', icon: '👤' },
  { href: '/admin/configurateur', label: 'Configurateur', icon: '🛠️' },
];

// Legacy alias
export const ADMIN_NAV = ADMIN_NAV_CRM;

// =============================================
// Configurator v2 catalogs
// =============================================

// Hinges (Charnieres)
export const HINGES_CATALOG: Record<string, HingeCatalogItem> = {
  standard:   { name: 'Standard',       description: 'Charnière 110° clip',                price: 3.50,  openAngle: 110 },
  soft_close: { name: 'Frein intégré',  description: 'Charnière 110° avec ralentisseur',   price: 6.80,  openAngle: 110 },
  push_open:  { name: 'Push-to-open',   description: 'Ouverture par pression, sans poignée', price: 9.50, openAngle: 110 },
  wide_angle: { name: 'Grand angle',    description: 'Charnière 170° pour angles',         price: 8.20,  openAngle: 170 },
};

// Drawer slides (Coulisses tiroirs)
export const DRAWER_SLIDES_CATALOG: Record<string, DrawerSlideCatalogItem> = {
  standard:       { name: 'Standard',          description: 'Coulisse à galets, extension partielle', pricePerPair: 8.50,  extension: 'partial', weightCapacity: 25 },
  full_extension: { name: 'Sortie totale',     description: 'Coulisse à billes, extension totale',    pricePerPair: 18.00, extension: 'full',    weightCapacity: 35 },
  soft_close:     { name: 'Fermeture douce',   description: 'Sortie totale avec ralentisseur',        pricePerPair: 28.00, extension: 'full',    weightCapacity: 40 },
  heavy_duty:     { name: 'Charge lourde',     description: 'Sortie totale, 60kg',                    pricePerPair: 42.00, extension: 'full',    weightCapacity: 60 },
};

// Edge banding (Chants)
export const EDGE_BANDING_CATALOG: Record<string, EdgeBandingCatalogItem> = {
  none:      { name: 'Sans chant',      description: 'Bord brut',                               pricePerMeter: 0,     thickness: 0 },
  matching:  { name: 'Chant assorti',   description: 'Chant mélamine assorti au panneau',        pricePerMeter: 2.50,  thickness: 0.8 },
  abs_1mm:   { name: 'ABS 1mm',         description: 'Chant ABS haute résistance',               pricePerMeter: 3.80,  thickness: 1 },
  abs_2mm:   { name: 'ABS 2mm',         description: 'Chant ABS épais, finition haut de gamme',  pricePerMeter: 5.50,  thickness: 2 },
  solid:     { name: 'Massif collé',    description: 'Chant bois massif collé',                  pricePerMeter: 12.00, thickness: 5 },
};

// Finishes (Finitions)
export const FINISHES_CATALOG: Record<string, FinishCatalogItem> = {
  brut:         { name: 'Brut',            description: 'Sans traitement',                  pricePerSqm: 0,     sheenLevel: 'none' },
  huile:        { name: 'Huile naturelle', description: 'Huile dure écologique',             pricePerSqm: 8.00,  sheenLevel: 'mat' },
  vernis_mat:   { name: 'Vernis mat',      description: 'Vernis polyuréthane mat',           pricePerSqm: 12.00, sheenLevel: 'mat' },
  vernis_satin: { name: 'Vernis satiné',   description: 'Vernis polyuréthane satiné',        pricePerSqm: 14.00, sheenLevel: 'satin' },
  laque:        { name: 'Laqué',           description: 'Laque brillante 2 couches',         pricePerSqm: 22.00, sheenLevel: 'brillant' },
  cire:         { name: 'Cire',            description: "Cire d'abeille naturelle",          pricePerSqm: 6.00,  sheenLevel: 'mat' },
};

// Shelf supports (Supports d'etagere)
export const SHELF_SUPPORTS_CATALOG: Record<string, ShelfSupportCatalogItem> = {
  pins:       { name: 'Taquets',        description: 'Taquets métalliques 5mm (lot de 4)',  pricePerSet: 2.00 },
  invisible:  { name: 'Invisibles',     description: 'Supports invisibles encastrés',       pricePerSet: 8.50 },
  rail:       { name: 'Crémaillère',    description: 'Rail crémaillère réglable',            pricePerSet: 14.00 },
};

// Countertop materials (Plan de travail)
export const COUNTERTOP_MATERIALS: Record<string, CountertopMaterialItem> = {
  stratifie_chene:   { name: 'Stratifié chêne',       color: 0xC9A96E, pricePerSqm: 45,  defaultThickness: 38 },
  stratifie_blanc:   { name: 'Stratifié blanc',        color: 0xF0F0F0, pricePerSqm: 40,  defaultThickness: 38 },
  stratifie_beton:   { name: 'Stratifié béton ciré',   color: 0xB0A89A, pricePerSqm: 55,  defaultThickness: 38 },
  bois_massif_chene: { name: 'Chêne massif',           color: 0xD4A574, pricePerSqm: 150, defaultThickness: 40 },
  bois_massif_hetre: { name: 'Hêtre massif',           color: 0xDEB887, pricePerSqm: 120, defaultThickness: 40 },
  quartz_blanc:      { name: 'Quartz blanc',           color: 0xFAFAFA, pricePerSqm: 280, defaultThickness: 20 },
  quartz_noir:       { name: 'Quartz noir',            color: 0x333333, pricePerSqm: 300, defaultThickness: 20 },
  granit:            { name: 'Granit noir Zimbabwe',    color: 0x1A1A1A, pricePerSqm: 350, defaultThickness: 30 },
  inox:              { name: 'Inox brossé',             color: 0xC0C0C0, pricePerSqm: 400, defaultThickness: 20 },
};

// Kitchen base cabinets (Caissons bas)
export const KITCHEN_BASE_CABINETS: Record<string, KitchenCabinetCatalogItem> = {
  base_1door:     { name: 'Bas 1 porte',       icon: '🚪', category: 'base', defaultWidth: 600,  defaultHeight: 720, defaultDepth: 580, widthOptions: [300, 400, 450, 500, 600],      basePrice: 120, hasDoor: true,  hasDrawer: false },
  base_2doors:    { name: 'Bas 2 portes',       icon: '🚪', category: 'base', defaultWidth: 800,  defaultHeight: 720, defaultDepth: 580, widthOptions: [600, 800, 900, 1000],          basePrice: 165, hasDoor: true,  hasDrawer: false },
  base_3drawers:  { name: 'Bas 3 tiroirs',      icon: '🗄️', category: 'base', defaultWidth: 600,  defaultHeight: 720, defaultDepth: 580, widthOptions: [400, 500, 600],                basePrice: 195, hasDoor: false, hasDrawer: true },
  base_4drawers:  { name: 'Bas 4 tiroirs',      icon: '🗄️', category: 'base', defaultWidth: 600,  defaultHeight: 720, defaultDepth: 580, widthOptions: [400, 500, 600],                basePrice: 240, hasDoor: false, hasDrawer: true },
  base_1d1t:      { name: 'Porte + tiroir',     icon: '📦', category: 'base', defaultWidth: 600,  defaultHeight: 720, defaultDepth: 580, widthOptions: [400, 500, 600],                basePrice: 175, hasDoor: true,  hasDrawer: true },
  base_sink:      { name: 'Sous-évier',         icon: '🚰', category: 'base', defaultWidth: 800,  defaultHeight: 720, defaultDepth: 580, widthOptions: [600, 800, 900, 1000, 1200],    basePrice: 145, hasDoor: true,  hasDrawer: false },
  base_corner:    { name: 'Angle bas',           icon: '📐', category: 'base', defaultWidth: 900,  defaultHeight: 720, defaultDepth: 580, widthOptions: [900, 1000],                    basePrice: 220, hasDoor: true,  hasDrawer: false },
  base_open:      { name: 'Niche ouverte',       icon: '📖', category: 'base', defaultWidth: 600,  defaultHeight: 720, defaultDepth: 580, widthOptions: [300, 400, 600],                basePrice: 85,  hasDoor: false, hasDrawer: false },
};

// Kitchen wall cabinets (Caissons hauts)
export const KITCHEN_WALL_CABINETS: Record<string, KitchenCabinetCatalogItem> = {
  wall_1door:     { name: 'Haut 1 porte',      icon: '🚪', category: 'wall', defaultWidth: 600,  defaultHeight: 720, defaultDepth: 330, widthOptions: [300, 400, 450, 500, 600],      basePrice: 95,  hasDoor: true,  hasDrawer: false },
  wall_2doors:    { name: 'Haut 2 portes',      icon: '🚪', category: 'wall', defaultWidth: 800,  defaultHeight: 720, defaultDepth: 330, widthOptions: [600, 800, 900, 1000],          basePrice: 130, hasDoor: true,  hasDrawer: false },
  wall_lift:      { name: 'Haut relevable',      icon: '⬆️', category: 'wall', defaultWidth: 600,  defaultHeight: 400, defaultDepth: 330, widthOptions: [600, 800, 900],                basePrice: 155, hasDoor: true,  hasDrawer: false },
  wall_open:      { name: 'Étagère murale',      icon: '📖', category: 'wall', defaultWidth: 600,  defaultHeight: 720, defaultDepth: 330, widthOptions: [300, 400, 600, 800],          basePrice: 65,  hasDoor: false, hasDrawer: false },
  wall_corner:    { name: 'Angle haut',          icon: '📐', category: 'wall', defaultWidth: 600,  defaultHeight: 720, defaultDepth: 330, widthOptions: [600],                          basePrice: 145, hasDoor: true,  hasDrawer: false },
  wall_hotte:     { name: 'Caisson hotte',       icon: '💨', category: 'wall', defaultWidth: 600,  defaultHeight: 400, defaultDepth: 330, widthOptions: [600, 900],                    basePrice: 110, hasDoor: true,  hasDrawer: false },
};

// Kitchen tall cabinets (Colonnes)
export const KITCHEN_TALL_CABINETS: Record<string, KitchenCabinetCatalogItem> = {
  tall_pantry:    { name: 'Colonne',            icon: '🏛️', category: 'tall', defaultWidth: 600,  defaultHeight: 2200, defaultDepth: 580, widthOptions: [400, 500, 600],              basePrice: 320, hasDoor: true,  hasDrawer: false },
  tall_oven:      { name: 'Colonne four',        icon: '🔥', category: 'tall', defaultWidth: 600,  defaultHeight: 2200, defaultDepth: 580, widthOptions: [600],                        basePrice: 350, hasDoor: true,  hasDrawer: true },
  tall_fridge:    { name: 'Colonne frigo',       icon: '❄️', category: 'tall', defaultWidth: 600,  defaultHeight: 2200, defaultDepth: 580, widthOptions: [600],                        basePrice: 280, hasDoor: true,  hasDrawer: false },
};

// Kitchen layouts
export const KITCHEN_LAYOUTS: Record<KitchenLayoutShape, { name: string; description: string; icon: string }> = {
  I:      { name: 'Linéaire (I)',   description: 'Un seul mur, idéal pour les espaces étroits', icon: '━' },
  L:      { name: 'Angle (L)',      description: 'Deux murs adjacents, classique et fonctionnel', icon: '┗' },
  U:      { name: 'U',             description: 'Trois murs, maximum de rangement',              icon: '┗┛' },
  island: { name: 'Îlot central',  description: 'Cuisine ouverte avec îlot',                     icon: '╋' },
};

// Kitchen standard dimensions (mm)
export const KITCHEN_STANDARDS = {
  baseHeight: 720,
  kickHeight: 150,
  countertopHeight: 900,
  wallCabinetBottom: 1400,
  wallCabinetHeight: 720,
  standardDepthBase: 580,
  standardDepthWall: 330,
  countertopDepth: 650,
};

// Meuble templates
export const MEUBLE_TEMPLATES: Record<string, MeubleTemplateDef> = {
  sur_mesure: {
    name: 'Sur-mesure',
    description: 'Partez de zéro',
    icon: '🎨',
    cabinets: [{ id: 1, width: 800, height: 2200, depth: 600, thickness: 18, position: { x: 0, y: 0, z: 0 } }],
  },
  bibliotheque: {
    name: 'Bibliothèque',
    description: '3 colonnes pour livres et objets',
    icon: '📚',
    cabinets: [
      { id: 1, width: 400, height: 2200, depth: 350, thickness: 18, position: { x: 0, y: 0, z: 0 } },
      { id: 2, width: 400, height: 2200, depth: 350, thickness: 18, position: { x: 0.42, y: 0, z: 0 } },
      { id: 3, width: 400, height: 2200, depth: 350, thickness: 18, position: { x: 0.84, y: 0, z: 0 } },
    ],
  },
  dressing: {
    name: 'Dressing',
    description: '3 caissons larges avec penderie',
    icon: '👔',
    cabinets: [
      { id: 1, width: 600, height: 2400, depth: 600, thickness: 18, position: { x: 0, y: 0, z: 0 } },
      { id: 2, width: 800, height: 2400, depth: 600, thickness: 18, position: { x: 0.62, y: 0, z: 0 } },
      { id: 3, width: 600, height: 2400, depth: 600, thickness: 18, position: { x: 1.44, y: 0, z: 0 } },
    ],
  },
  meuble_tv: {
    name: 'Meuble TV',
    description: 'Bas et large avec niches',
    icon: '📺',
    cabinets: [{ id: 1, width: 1800, height: 500, depth: 450, thickness: 18, position: { x: 0, y: 0, z: 0 } }],
  },
  rangement: {
    name: 'Rangement',
    description: 'Placard multi-usage avec portes',
    icon: '📦',
    cabinets: [
      { id: 1, width: 600, height: 2200, depth: 500, thickness: 18, position: { x: 0, y: 0, z: 0 } },
      { id: 2, width: 600, height: 2200, depth: 500, thickness: 18, position: { x: 0.62, y: 0, z: 0 } },
    ],
  },
};

// Planche standard thicknesses (mm)
export const PLANCHE_THICKNESSES = [18, 22, 25, 30, 40];

// Auth error messages (French)
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email ou mot de passe incorrect',
  email_taken: 'Un compte existe déjà avec cet email',
  email_not_confirmed: 'Veuillez confirmer votre email avant de vous connecter',
  weak_password: 'Le mot de passe doit contenir au moins 6 caractères',
  rate_limited: 'Trop de tentatives. Veuillez réessayer dans quelques minutes',
  server_error: 'Erreur serveur. Veuillez réessayer',
  unauthorized: 'Vous devez être connecté pour accéder à cette page',
  forbidden: 'Accès réservé aux administrateurs',
};
