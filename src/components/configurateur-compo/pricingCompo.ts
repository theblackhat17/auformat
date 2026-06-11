import type {
  CompositionConfig,
  CompositionPriceBreakdown,
  CompositionPriceModuleLine,
  Configurateur2DLineItem,
  ConfigurateurMaterial,
  ConfigurateurModuleType,
  ConfigurateurUnivers,
} from '@/lib/types';
import { TAX_RATE } from '@/lib/constants';

/** Surface de panneaux d'un caisson en m² : 2 côtés + dessus/dessous + fond. */
function caissonSurfaceM2(largeur: number, hauteur: number, profondeur: number): number {
  const sides = 2 * (profondeur * hauteur);
  const topBottom = 2 * (largeur * profondeur);
  const back = largeur * hauteur;
  return (sides + topBottom + back) / 1_000_000;
}

export function getModuleType(types: ConfigurateurModuleType[], slug: string): ConfigurateurModuleType | undefined {
  return types.find((t) => t.slug === slug);
}

export function moduleMaterial(
  materials: ConfigurateurMaterial[],
  config: CompositionConfig,
  materialIndex: number | null
): ConfigurateurMaterial | undefined {
  return materials[materialIndex ?? config.materialIndex] ?? materials[0];
}

export function computeCompositionPrice(
  config: CompositionConfig,
  moduleTypes: ConfigurateurModuleType[],
  materials: ConfigurateurMaterial[],
  univers: ConfigurateurUnivers | undefined
): CompositionPriceBreakdown {
  const moduleLines: CompositionPriceModuleLine[] = [];
  const lineItems: Configurateur2DLineItem[] = [];

  for (const mod of config.modules) {
    const type = getModuleType(moduleTypes, mod.typeSlug);
    if (!type) continue;
    const material = moduleMaterial(materials, config, mod.materialIndex);
    const surface = caissonSurfaceM2(mod.largeur, mod.hauteur, mod.profondeur);
    const materialCost = surface * (material?.prixM2 || 0);
    const baseTotal = type.prixBase + materialCost;

    const details: Configurateur2DLineItem[] = [
      {
        label: `${type.nom} ${mod.largeur}×${mod.hauteur}×${mod.profondeur} mm — ${material?.name || 'Matériau'}`,
        quantity: 1,
        unitPrice: round2(baseTotal),
        total: round2(baseTotal),
      },
    ];

    for (const opt of type.options) {
      const qty = mod.options[opt.slug] ?? 0;
      if (qty <= 0 || opt.prix <= 0) continue;
      details.push({
        label: `— ${opt.nom}`,
        quantity: qty,
        unitPrice: opt.prix,
        total: round2(qty * opt.prix),
      });
    }

    const total = round2(details.reduce((s, d) => s + d.total, 0));
    moduleLines.push({ moduleId: mod.id, label: type.nom, total, details });
    lineItems.push(...details);
  }

  // Plan de travail : au mètre linéaire sur la largeur cumulée des modules bas
  let planTravailLine: Configurateur2DLineItem | null = null;
  if (config.planTravail && univers?.planTravail?.disponible) {
    const basWidth = config.modules.reduce((sum, mod) => {
      const type = getModuleType(moduleTypes, mod.typeSlug);
      return type?.zone === 'bas' || type?.zone === 'ilot' ? sum + mod.largeur : sum;
    }, 0);
    if (basWidth > 0) {
      const ml = basWidth / 1000;
      planTravailLine = {
        label: `Plan de travail (${ml.toFixed(2).replace('.', ',')} ml)`,
        quantity: 1,
        unitPrice: round2(ml * univers.planTravail.prixMl),
        total: round2(ml * univers.planTravail.prixMl),
      };
      lineItems.push(planTravailLine);
    }
  }

  // Façade coulissante d'ensemble (dressing) : au mètre linéaire de la composition
  if (config.facadeCoulissante && univers?.facadeCoulissante?.disponible) {
    const linWidth = config.modules.reduce((sum, mod) => {
      const type = getModuleType(moduleTypes, mod.typeSlug);
      return type && type.zone !== 'haut' ? sum + mod.largeur : sum;
    }, 0);
    if (linWidth > 0) {
      const ml = linWidth / 1000;
      const line: Configurateur2DLineItem = {
        label: `Façade coulissante (${ml.toFixed(2).replace('.', ',')} ml)`,
        quantity: 1,
        unitPrice: round2(ml * univers.facadeCoulissante.prixMl),
        total: round2(ml * univers.facadeCoulissante.prixMl),
      };
      lineItems.push(line);
    }
  }

  const subtotalHt = round2(lineItems.reduce((s, li) => s + li.total, 0));
  const tva = round2(subtotalHt * TAX_RATE);
  const totalTtc = round2(subtotalHt + tva);

  return { moduleLines, planTravailLine, subtotalHt, tva, totalTtc, lineItems };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatEur(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}
