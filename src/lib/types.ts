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
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'draft' | 'quote_requested' | 'quoted' | 'in_production' | 'completed';

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
}

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
