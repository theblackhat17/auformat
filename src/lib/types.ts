// Database row types (snake_case from PostgreSQL)
export interface ProfileRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  role: 'client' | 'admin';
  avatar_url: string | null;
  discount_rate: number;
  created_at: string;
  updated_at: string;
}

// Frontend types (camelCase)
export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  companyName: string | null;
  phone: string | null;
  address: string | null;
  role: 'client' | 'admin';
  avatarUrl: string | null;
  discountRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  type: string;
  config: ConfiguratorConfig | FurnitureConfig;
  status: ProjectStatus;
  thumbnailUrl: string | null;
  notes: string | null;
  /** Modèle de composition proposé au démarrage du configurateur (admin) */
  isTemplate?: boolean;
  /** Dossier de chantier regroupant plusieurs projets */
  folderId?: string | null;
  /** Demande d'avis Google envoyée après la fin du chantier */
  reviewRequestSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Dossier de chantier : regroupe plusieurs projets qui vont ensemble */
export interface ProjectFolder {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
}

/** Message de la discussion client ↔ atelier (rattachée à un projet ou à un dossier) */
export interface ChatMessage {
  id: string;
  projectId: string | null;
  folderId: string | null;
  senderId: string | null;
  senderRole: 'client' | 'admin';
  body: string | null;
  attachments: { name: string; url: string }[];
  readAt: string | null;
  createdAt: string;
}

export type ProjectStatus = 'draft' | 'quote_requested' | 'quoted' | 'accepted' | 'in_production' | 'finishing' | 'installation' | 'completed';

/** Étape de la timeline de fabrication d'un projet (note + photos d'atelier) */
export interface ProjectUpdate {
  id: string;
  projectId: string;
  status: ProjectStatus | null;
  note: string | null;
  photos: string[];
  createdBy: string | null;
  createdAt: string;
}

export interface Quote {
  id: string;
  userId: string;
  quoteNumber: string;
  title: string;
  description: string | null;
  items: QuoteItem[];
  subtotalHt: number;
  taxRate: number;
  taxAmount: number;
  totalTtc: number;
  status: QuoteStatus;
  validUntil: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  refusedAt: string | null;
  adminNotes: string | null;
  clientNotes: string | null;
  /** Relances automatiques (cron) */
  reminderSentAt?: string | null;
  expiryReminderSentAt?: string | null;
  /** Demande de modification par le client */
  revisionRequestedAt?: string | null;
  revisionMessage?: string | null;
  pdfUrl: string | null;
  configData: QuoteConfigData | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteConfigData {
  productType: string;
  productSlug: string;
  dimensions: { largeur: number; hauteur: number; profondeur: number; epaisseur: number };
  materiau: { name: string; colorHex: string };
  options: Record<string, unknown>;
}

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'refused' | 'expired';

export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  actionType: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
  // Joined fields (from profiles)
  fullName?: string | null;
  email?: string | null;
}

export interface UserSession {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  loggedInAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

// Configurator types (legacy — kept for backward compat)
export interface FurnitureConfig {
  template: string;
  material: string;
  name: string;
  cabinets: Cabinet[];
  globalHandle: string;
  showDimensions: boolean;
  exploded: boolean;
}

export interface Cabinet {
  id: number;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  position: Position3D;
  modules: FurnitureModule[];
}

export interface FurnitureModule {
  id: number;
  type: 'etagere' | 'tiroir' | 'penderie' | 'niche' | 'porte';
  position: number;
  width: number;
  height: number;
  offsetX?: number;
}


export interface ModuleCatalogItem {
  name: string;
  icon: string;
  basePrice: number;
  height: number;
  width?: number;
}

export interface HandleType {
  name: string;
  icon: string;
  price: number;
  model: string;
}

// =============================================
// New Configurator v2 types (multi-product)
// =============================================

export type ProductType = 'meuble' | 'planche' | 'cuisine';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

// -- Shared sub-types --

export interface HardwareSelection {
  hingeType: string;
  drawerSlideType: string;
  shelfSupportType: string;
}

export interface FinishSelection {
  edgeBanding: string;
  finish: string;
}

// -- Meuble Config --

export interface MeubleConfig {
  productType: 'meuble';
  name: string;
  template: string;
  material: string;
  cabinets: Cabinet[];
  globalHandle: string;
  hardware: HardwareSelection;
  finish: FinishSelection;
  showDimensions: boolean;
  exploded: boolean;
}

// -- Planche Config --

export interface PlancheConfig {
  productType: 'planche';
  name: string;
  material: string;
  boards: PlancheBoard[];
  finish: FinishSelection;
}

export interface PlancheBoard {
  id: number;
  length: number;
  width: number;
  thickness: number;
  quantity: number;
  edgeBanding: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
}

// -- Cuisine Config --

export type KitchenLayoutShape = 'I' | 'L' | 'U' | 'island';

export interface CuisineConfig {
  productType: 'cuisine';
  name: string;
  layout: KitchenLayoutShape;
  walls: KitchenWall[];
  baseCabinets: KitchenCabinetItem[];
  wallCabinets: KitchenCabinetItem[];
  tallCabinets: KitchenCabinetItem[];
  countertop: CountertopConfig;
  facadeMaterial: string;
  carcassMaterial: string;
  globalHandle: string;
  hardware: HardwareSelection;
  finish: FinishSelection;
}

export interface KitchenWall {
  id: number;
  length: number;
  angle: number;
  startX: number;
  startY: number;
}

export interface KitchenCabinetItem {
  id: number;
  catalogKey: string;
  width: number;
  wallId: number;
  positionOnWall: number;
}

export interface CountertopConfig {
  material: string;
  thickness: number;
  overhang: number;
  backsplashHeight: number;
}

// -- Union type --

export type ConfiguratorConfig = MeubleConfig | PlancheConfig | CuisineConfig;

// -- Pricing --

export interface PriceBreakdown {
  materialCost: number;
  modulesCost: number;
  hardwareCost: number;
  edgeBandingCost: number;
  finishCost: number;
  countertopCost: number;
  subtotalHt: number;
  tva: number;
  totalTtc: number;
  lineItems: PriceLineItem[];
}

export interface PriceLineItem {
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: 'material' | 'module' | 'hardware' | 'edge' | 'finish' | 'countertop';
}

// -- Wizard state --

export interface WizardStepDef {
  key: string;
  label: string;
}

export interface WizardState {
  currentStep: number;
  maxReachedStep: number;
  config: ConfiguratorConfig;
  isDirty: boolean;
  projectId: string | null;
}

// -- Hardware catalog types --

export interface HingeCatalogItem {
  name: string;
  description: string;
  price: number;
  openAngle: number;
}

export interface DrawerSlideCatalogItem {
  name: string;
  description: string;
  pricePerPair: number;
  extension: 'partial' | 'full';
  weightCapacity: number;
}

export interface EdgeBandingCatalogItem {
  name: string;
  description: string;
  pricePerMeter: number;
  thickness: number;
}

export interface FinishCatalogItem {
  name: string;
  description: string;
  pricePerSqm: number;
  sheenLevel: string;
}

export interface ShelfSupportCatalogItem {
  name: string;
  description: string;
  pricePerSet: number;
}

export interface CountertopMaterialItem {
  name: string;
  color: number;
  pricePerSqm: number;
  defaultThickness: number;
}

export interface KitchenCabinetCatalogItem {
  name: string;
  icon: string;
  category: 'base' | 'wall' | 'tall';
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
  widthOptions: number[];
  basePrice: number;
  hasDoor: boolean;
  hasDrawer: boolean;
}

export interface MeubleTemplateDef {
  name: string;
  description: string;
  icon: string;
  cabinets: Omit<Cabinet, 'modules'>[];
}

// CMS content types
export interface Realisation {
  id: string;
  title: string;
  slug: string;
  categoryId: string | null;
  category: string; // category slug for backwards compat
  categoryLabel?: string;
  date: string;
  image: string;
  gallery?: { image: string }[];
  description: string;
  body?: string;
  duration?: string;
  surface?: string;
  material?: string;
  materialId?: string;
  materialName?: string;
  location?: string;
  features?: { feature: string }[];
  published: boolean;
  sortOrder?: number;
}

export interface Avis {
  id: string;
  name: string;
  location: string;
  clientType: string;
  rating: number;
  projectType: string;
  testimonial: string;
  date: string;
  verified: boolean;
  published: boolean;
}

export interface Materiau {
  id: string;
  name: string;
  latinName?: string;
  image: string;
  categoryId: string | null;
  category: string; // category slug for backwards compat
  categoryLabel?: string;
  tag?: string;
  description: string;
  hardness: number;
  stability: number;
  origin: string;
  color: string;
  colorHex?: string;
  prixM2?: number;
  features?: { feature: string }[];
  usages?: { usage: string }[];
  published: boolean;
  sortOrder?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo?: string;
  description?: string;
  sortOrder?: number;
  published: boolean;
}

export interface SiteSettings {
  id: string;
  companyName: string;
  slogan: string;
  address: string;
  zipcode: string;
  city: string;
  phone: string;
  email: string;
  hoursWeekdays: string;
  hoursSaturday: string;
  hoursSunday: string;
  instagram: string | null;
  facebook: string | null;
  heroBackground: string | null;
  configurateurEnabled: boolean;
  /** Lien direct « laisser un avis » de la fiche Google Business (demande d'avis automatique) */
  googleReviewUrl?: string | null;
  /** 'moderne' (Young Serif + Hanken Grotesk) ou 'classique' (polices système, ancien site) */
  fontTheme: string;
  colorBoisClair: string;
  colorBoisFonce: string;
  colorVertForet: string;
  colorVertForetDark: string;
  colorBeige: string;
  colorNoir: string;
  colorBlanc: string;
}

export const DEFAULT_THEME_COLORS = {
  colorBoisClair: '#D4A574',
  colorBoisFonce: '#8B6F47',
  colorVertForet: '#2C5F2D',
  colorVertForetDark: '#234a24',
  colorBeige: '#F5F1E8',
  colorNoir: '#2B2B2B',
  colorBlanc: '#FFFFFF',
} as const;

export type ThemeColors = typeof DEFAULT_THEME_COLORS;

export interface Category {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  type: string;
  sortOrder: number;
  published: boolean;
}

export interface PageContent {
  id: string;
  pageKey: string;
  sectionKey: string;
  content: Record<string, unknown>;
  sortOrder: number;
}

export interface Upload {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  path: string;
  uploadedBy: string | null;
  createdAt: string;
}

// =============================================
// Services
// =============================================

export interface Service {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  icon: string | null;
  shortDescription: string | null;
  image: string | null;
  content: {
    intro?: string;
    features?: { title: string; desc: string }[];
    body?: string;
    cta_title?: string;
    cta_text?: string;
  };
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Blog articles
// =============================================

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string; // markdown
  coverImage: string | null;
  categoryId: string | null;
  authorId: string | null;
  readingTime: number;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  published: boolean;
  publishedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // joined fields
  categorySlug?: string | null;
  categoryLabel?: string | null;
  categoryIcon?: string | null;
  authorName?: string | null;
}

// =============================================
// Configurateur 2D types
// =============================================

export type ConfigurateurProductSlug =
  | 'meuble'
  | 'meuble_tv'
  | 'bibliotheque'
  | 'dressing'
  | 'bureau'
  | 'plan_travail'
  | 'etagere';

export type DoorType = 'battante' | 'coulissante' | 'aucune';
export type FeetType = 'sans' | 'rond' | 'carre' | 'oblique';
export type EdgeType = 'droit' | 'arrondi' | 'chanfrein';
export type WorktopShape = 'rectangle' | 'L' | 'U';
export type MountingType = 'murale' | 'sol' | 'aucune';

export interface ConfigurateurMaterial {
  name: string;
  colorHex: string;
  prixM2: number;
  sortOrder: number;
  /** Photo de l'essence (table materiaux) pour la sélection visuelle */
  image?: string | null;
  /** Rendu 3D : texture procédurale 'uni' (panneau teinté) ou 'bois' (veinage) — prime sur la photo */
  renderType?: 'uni' | 'bois' | null;
  /** Couleur du veinage pour le rendu 'bois' */
  grainHex?: string | null;
}

export interface ConfigurateurProductType {
  slug: ConfigurateurProductSlug;
  nom: string;
  icon: string;
  dimensionsMin: { largeur: number; hauteur: number; profondeur: number; epaisseur: number };
  dimensionsMax: { largeur: number; hauteur: number; profondeur: number; epaisseur: number };
  optionsCategorie: 'furniture' | 'worktop' | 'shelf';
}

export interface ConfigurateurOptionPrices {
  tiroir: number;
  porte: number;
  pied: number;
  coulissantes: number;
  etagere: number;
  dos: number;
  decoupe_ronde: number;
  decoupe_rectangulaire: number;
  bord_arrondi: number;
  bord_chanfrein: number;
  bord_droit: number;
  fixation_murale: number;
  fixation_sol: number;
  separateur: number;
}

export interface ConfigurateurLabels {
  titre: string;
  sousTitre: string;
  boutonDevis: string;
  prixEstimatif: string;
  etape1: string;
  etape2: string;
  etape3: string;
  etape4: string;
  recapTitre: string;
  modalTitre: string;
  modalDescription: string;
}

export interface ConfigurateurOption {
  slug: string;
  nom: string;
  prix: number;
  categorie: 'furniture' | 'worktop' | 'shelf';
  type: 'compteur' | 'toggle' | 'choix';
  groupe?: string;
  actif: boolean;
  sortOrder: number;
}

export interface ConfigurateurSettings {
  materials: ConfigurateurMaterial[];
  product_types: ConfigurateurProductType[];
  option_prices: ConfigurateurOptionPrices;
  options: ConfigurateurOption[];
  labels: ConfigurateurLabels;
  univers?: ConfigurateurUnivers[];
  module_types?: ConfigurateurModuleType[];
  /** true si l'assistant IA est configuré côté serveur (ANTHROPIC_API_KEY) */
  ai_enabled?: boolean;
  /** 'masque' (défaut) : le client ne voit aucun prix, chiffrage par devis · 'estimation' : prix indicatifs affichés */
  pricing_mode?: 'masque' | 'estimation';
}

/* ── Configurateur v2 : composition multi-modules (cuisine, dressing, salle de bain) ── */

export interface ConfigurateurUnivers {
  slug: string;                  // 'cuisine' | 'dressing' | 'salle_de_bain'
  nom: string;
  description: string;
  actif: boolean;
  sortOrder: number;
  /** Modules pré-posés au démarrage (slugs de module_types) */
  starterModules: string[];
  /** Plan de travail automatique au-dessus des modules bas (cuisine/sdb), prix HT au mètre linéaire */
  planTravail?: { disponible: boolean; prixMl: number };
  /** Façade coulissante couvrant toute la composition (dressing), prix HT au mètre linéaire */
  facadeCoulissante?: { disponible: boolean; prixMl: number };
}

export type ModuleZone = 'bas' | 'haut' | 'colonne' | 'ilot';

export interface ConfigurateurModuleOption {
  slug: string;                  // 'porte', 'tiroir', 'etagere', 'tringle', 'vasque', ...
  nom: string;
  /** 'choix' = sélection exclusive au sein d'un même groupe (ex. style de poignée) */
  type: 'compteur' | 'toggle' | 'choix';
  /** Groupe d'exclusivité pour les options 'choix' (ex. 'poignee') */
  groupe?: string;
  prix: number;                  // € HT unitaire
  max?: number;                  // borne haute des compteurs
  defaut: number;                // quantité par défaut à l'ajout du module
}

export interface ConfigurateurModuleType {
  slug: string;
  nom: string;
  univers: string[];             // univers où ce module est proposé
  zone: ModuleZone;              // position en élévation : posé au sol, suspendu, ou toute hauteur
  description?: string;
  dimensionsDefault: { largeur: number; hauteur: number; profondeur: number };
  dimensionsMin: { largeur: number; hauteur: number; profondeur: number };
  dimensionsMax: { largeur: number; hauteur: number; profondeur: number };
  prixBase: number;              // € HT : caisson + quincaillerie de base
  options: ConfigurateurModuleOption[];
  /** Hauteur de pose par défaut (mm du sol) pour les modules suspendus */
  posYDefaut?: number;
  /** Élément d'environnement (fenêtre, porte, radiateur…) : dessiné pour situer la pièce, jamais chiffré */
  decor?: boolean;
  actif: boolean;
  sortOrder: number;
}

export type StyleFacade = 'lisse' | 'cadre' | 'rainuree' | 'cannage';
export type PoigneeFinition = 'noir' | 'inox' | 'laiton';

export interface CompositionModule {
  id: string;                    // identifiant client (croissant)
  typeSlug: string;
  largeur: number;               // mm
  hauteur: number;
  profondeur: number;
  /** null = matériau principal de la composition */
  materialIndex: number | null;
  options: Record<string, number>;
  /** Modules suspendus (zone 'haut') : position libre. null = placement automatique. */
  posX?: number | null;          // mm depuis la gauche de la composition
  posY?: number | null;          // mm du sol au bas du module
  /** Modules posés : espace laissé à gauche du module (décalage dans la rangée), mm */
  ecartGauche?: number;
  /** Hauteur totale de la zone de tiroirs en mm (null = automatique) */
  tiroirsHauteur?: number | null;
  /** Position de chaque étagère en mm depuis le bas (null = répartition automatique) */
  etageresPos?: (number | null)[];
  /** Matériau des façades (portes, tiroirs) — null = même matériau que le caisson */
  facadeMaterialIndex?: number | null;
  /** Style des façades : lisse (défaut), cadre (shaker), rainurée verticale, cannage */
  styleFacade?: StyleFacade;
  /** Mur sur lequel le module est posé : principal (défaut) ou retour en L à gauche/droite */
  mur?: 'principal' | 'retour_gauche' | 'retour_droit';
}

export interface CompositionConfig {
  version: 2;
  univers: string;
  materialIndex: number;         // matériau principal
  planTravail: boolean;
  /** Façade coulissante sur toute la composition (dressing) */
  facadeCoulissante?: boolean;
  /** Nombre de vantaux de la façade coulissante (2 à 4, défaut 2) */
  facadeVantaux?: number;
  /** Matériau du plan de travail (null = teinte foncée du matériau principal) */
  planMaterialIndex?: number | null;
  /** Matériau des chants du plan de travail (null = assorti au plateau) */
  planChantMaterialIndex?: number | null;
  /** Débord du plan de travail de chaque côté, mm (défaut 20) */
  planDebord?: number;
  /** Épaisseur du plan de travail, mm (défaut 40) */
  planEpaisseur?: number;
  /** Matériau des plinthes (null = teinte foncée du matériau de chaque module) */
  plintheMaterialIndex?: number | null;
  /** Largeur de mur disponible (mm) — alerte si la composition dépasse. null = libre. */
  lineaireMax?: number | null;
  /** Finition des poignées et de la quincaillerie visible (défaut : noir) */
  poigneeFinition?: PoigneeFinition;
  /** Température des éclairages LED (défaut : chaud) */
  ledTemp?: 'chaud' | 'neutre';
  modules: CompositionModule[];
}

export interface CompositionPriceModuleLine {
  moduleId: string;
  label: string;
  total: number;
  details: Configurateur2DLineItem[];
}

export interface CompositionPriceBreakdown {
  moduleLines: CompositionPriceModuleLine[];
  planTravailLine: Configurateur2DLineItem | null;
  subtotalHt: number;
  tva: number;
  totalTtc: number;
  lineItems: Configurateur2DLineItem[];
}

export interface ConfigurateurSettingsRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface Configurateur2DConfig {
  productSlug: ConfigurateurProductSlug;
  largeur: number;
  hauteur: number;
  profondeur: number;
  epaisseur: number;
  materialIndex: number;
  // Furniture options
  nbEtageres: number;
  nbTiroirs: number;
  porteType: DoorType;
  nbPortes: number;
  piedType: FeetType;
  avecDos: boolean;
  // Worktop options
  worktopShape: WorktopShape;
  edgeType: EdgeType;
  nbDecoupesRondes: number;
  nbDecoupesRect: number;
  // Shelf options
  nbNiveaux: number;
  nbSeparateurs: number;
  mountingType: MountingType;
  // Dynamic options selections: slug -> quantity (0 = not selected)
  optionSelections: Record<string, number>;
}

export interface Configurateur2DLineItem {
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Configurateur2DPriceBreakdown {
  surfaceM2: number;
  materialCost: number;
  optionsCost: number;
  subtotalHt: number;
  tva: number;
  totalTtc: number;
  lineItems: Configurateur2DLineItem[];
}

export interface QuoteFormData {
  nom: string;
  email: string;
  telephone: string;
  message: string;
}

// Legacy compat aliases
export interface GeneralSettings {
  companyName: string;
  slogan: string;
  contact: {
    address: string;
    zipcode: string;
    city: string;
    phone: string;
    email: string;
  };
  hours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  social?: {
    instagram?: string;
    facebook?: string;
  };
}

export interface HomepageSettings {
  heroTitle: string;
  heroSubtitle: string;
  ctaButton: string;
  secondaryButton: string;
}

// Admin aggregated types
export interface DashboardStats {
  totalClients: number;
  pendingQuotes: number;
  monthlyRevenue: number;
  activeProjects: number;
  totalOrders: number;
}

export interface ClientWithStats extends Profile {
  totalProjects: number;
  totalQuotes: number;
  acceptedQuotes: number;
  totalRevenue: number;
  totalLogins: number;
  lastLogin: string | null;
  draftProjects: number;
  quoteRequestedProjects: number;
}

// Auth types
export interface JwtPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  profile: Profile | null;
  isLoading: boolean;
}

export interface LoginResponse {
  success: boolean;
  profile?: Profile;
  error?: string;
}
