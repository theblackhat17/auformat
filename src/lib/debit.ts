import type { CompositionConfig, ConfigurateurMaterial, ConfigurateurModuleType } from '@/lib/types';
import { getModuleType, moduleMaterial } from '@/components/configurateur-compo/pricingCompo';

/**
 * Débit atelier (estimatif) — décomposition approximative d'une composition v2
 * en liste de panneaux et quincaillerie. La méthode d'assemblage exacte
 * (tourillons, lamellos, vis…) et les ajustements restent à valider par l'atelier.
 * Toutes les dimensions sont en mm, épaisseur de panneau standard 18 mm.
 */

/** Épaisseur de panneau standard (mm) */
export const EP = 18;

/** Jeu de profondeur pour étagères, séparateurs et fonds de tiroir (mm) */
const JEU_PROFONDEUR = 20;

/** Hauteur standard des flancs/dos de caisson de tiroir (mm) */
const H_CAISSON_TIROIR = 150;

/** Slugs de modules jamais débités comme des caissons (traités à part par l'atelier) */
const SLUGS_HORS_DEBIT = new Set(['fileur', 'joue_finition', 'plan_de_travail']);

export interface DebitPanel {
  moduleLabel: string;
  piece: string;
  largeur: number;
  hauteur: number;
  quantite: number;
  materiau: string;
}

export interface DebitHardware {
  label: string;
  quantite: number;
}

export interface DebitResult {
  panels: DebitPanel[];
  hardware: DebitHardware[];
  surfaces: { materiau: string; m2: number }[];
  totalPanels: number;
}

const EMPTY_RESULT: DebitResult = { panels: [], hardware: [], surfaces: [], totalPanels: 0 };

function isCompositionV2(config: unknown): config is CompositionConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Partial<CompositionConfig>;
  return c.version === 2 && Array.isArray(c.modules);
}

/**
 * Calcule le débit estimatif (panneaux + quincaillerie) d'une composition.
 * Modules décor (fenêtre, porte, radiateur…), fileurs, joues de finition et
 * plans de travail sont exclus du débit caisson.
 */
export function computeDebit(
  config: CompositionConfig | null | undefined,
  moduleTypes: ConfigurateurModuleType[],
  materials: ConfigurateurMaterial[]
): DebitResult {
  if (!isCompositionV2(config) || config.modules.length === 0) return EMPTY_RESULT;

  const panels: DebitPanel[] = [];

  // Quincaillerie agrégée sur l'ensemble des modules
  let charnieres = 0;
  let coulisses = 0;
  let poignees = 0;
  let pieds = 0;
  let tringles = 0;

  config.modules.forEach((mod, index) => {
    const type = getModuleType(moduleTypes, mod.typeSlug);
    if (type?.decor) return;
    if (SLUGS_HORS_DEBIT.has(mod.typeSlug)) return;

    const L = Math.round(mod.largeur);
    const H = Math.round(mod.hauteur);
    const P = Math.round(mod.profondeur);
    const opts = mod.options || {};
    const moduleLabel = `${index + 1}. ${type?.nom || mod.typeSlug}`;

    // Matériaux : caisson / façades / intérieur (étagères, séparateurs, tiroirs)
    const caissonMat = moduleMaterial(materials, config, mod.materialIndex)?.name || 'Matériau';
    const facadeMat =
      mod.facadeMaterialIndex != null
        ? materials[mod.facadeMaterialIndex]?.name || caissonMat
        : caissonMat;
    const interieurMat =
      mod.interieurMaterialIndex != null
        ? materials[mod.interieurMaterialIndex]?.name || caissonMat
        : caissonMat;

    const addPanel = (piece: string, largeur: number, hauteur: number, quantite: number, materiau: string) => {
      if (quantite <= 0 || largeur <= 0 || hauteur <= 0) return;
      panels.push({
        moduleLabel,
        piece,
        largeur: Math.round(largeur),
        hauteur: Math.round(hauteur),
        quantite,
        materiau,
      });
    };

    const innerW = L - 2 * EP;

    // Caisson standard : 2 côtés + 2 traverses + 1 fond
    addPanel('Côté', H, P, 2, caissonMat);
    addPanel('Traverse haut/bas', innerW, P, 2, caissonMat);
    addPanel('Fond', innerW, H - 2 * EP, 1, caissonMat);

    // Étagères — grille (bibliothèque à cases) ou compteur d'options
    const grille = mod.grille && mod.grille.colonnes >= 1 ? mod.grille : null;
    const nbEtageres = grille
      ? grille.etageresParColonne.reduce((sum, n) => sum + (n || 0), 0)
      : opts.etagere || 0;
    const largeurEtagere = grille ? innerW / grille.colonnes - 2 * EP : innerW;
    addPanel('Étagère', largeurEtagere, P - JEU_PROFONDEUR, nbEtageres, interieurMat);

    // Séparateurs verticaux
    const nbSeparateurs = grille ? grille.colonnes - 1 : opts.separateur_vertical || 0;
    addPanel('Séparateur', H - 2 * EP, P - JEU_PROFONDEUR, nbSeparateurs, interieurMat);

    // Refend vertical (séparation structurelle du caisson) — matériau du caisson
    addPanel('Refend', H - 2 * EP, P - JEU_PROFONDEUR, mod.refend ? 1 : 0, caissonMat);

    // Façades de portes — les portes basses/hautes couvrent une demi-hauteur (approx.)
    const nbPortesPleines = (opts.porte || 0) + (opts.porte_pleine || 0);
    const nbPortesDemi = (opts.porte_basse || 0) + (opts.porte_haute || 0);
    const nbPortes = nbPortesPleines + nbPortesDemi;
    if (nbPortes > 0) {
      const largeurVantail = L / nbPortes;
      addPanel('Façade porte', largeurVantail, H, nbPortesPleines, facadeMat);
      addPanel('Façade porte', largeurVantail, H / 2, nbPortesDemi, facadeMat);
    }

    // Tiroirs : façade + caisson de tiroir (2 côtés, 1 dos, 1 fond) par tiroir
    const nbTiroirs = opts.tiroir || 0;
    if (nbTiroirs > 0) {
      addPanel('Façade tiroir', L, Math.min(H, 200), nbTiroirs, facadeMat);
      addPanel('Côté tiroir', P - JEU_PROFONDEUR, H_CAISSON_TIROIR, 2 * nbTiroirs, interieurMat);
      addPanel('Dos tiroir', innerW, H_CAISSON_TIROIR, nbTiroirs, interieurMat);
      addPanel('Fond tiroir', innerW, P - JEU_PROFONDEUR, nbTiroirs, interieurMat);
    }

    // ── Quincaillerie ──
    charnieres += nbPortes * (H > 1400 ? 3 : 2);
    coulisses += nbTiroirs;
    if (!(opts.poignee_invisible > 0)) poignees += nbPortes + nbTiroirs;
    if ((opts.socle_pieds_metal || 0) > 0 || (opts.socle_pieds_bois || 0) > 0) pieds += 4;
    if ((opts.tringle || 0) > 0 || mod.typeSlug === 'module_penderie') tringles += 1;
  });

  const hardware: DebitHardware[] = [
    { label: 'Charnières', quantite: charnieres },
    { label: 'Coulisses (paires)', quantite: coulisses },
    { label: 'Poignées', quantite: poignees },
    { label: 'Pieds réglables', quantite: pieds },
    { label: 'Tringle penderie', quantite: tringles },
  ].filter((h) => h.quantite > 0);

  // Surface de panneaux par matériau (m²), pour la commande de plaques
  const surfaceParMateriau = new Map<string, number>();
  for (const panel of panels) {
    const area = (panel.largeur * panel.hauteur * panel.quantite) / 1_000_000;
    surfaceParMateriau.set(panel.materiau, (surfaceParMateriau.get(panel.materiau) || 0) + area);
  }
  const surfaces = Array.from(surfaceParMateriau.entries()).map(([materiau, m2]) => ({
    materiau,
    m2: Math.round(m2 * 100) / 100,
  }));

  const totalPanels = panels.reduce((sum, p) => sum + p.quantite, 0);

  return { panels, hardware, surfaces, totalPanels };
}
