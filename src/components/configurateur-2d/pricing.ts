import { TAX_RATE } from '@/lib/constants';
import type {
  Configurateur2DConfig,
  Configurateur2DPriceBreakdown,
  Configurateur2DLineItem,
  ConfigurateurMaterial,
  ConfigurateurOptionPrices,
  ConfigurateurProductType,
} from '@/lib/types';

export function calculatePrice2D(
  config: Configurateur2DConfig,
  materials: ConfigurateurMaterial[],
  optionPrices: ConfigurateurOptionPrices,
  productTypes: ConfigurateurProductType[],
): Configurateur2DPriceBreakdown {
  const lineItems: Configurateur2DLineItem[] = [];
  const material = materials[config.materialIndex] || materials[0];
  const productType = productTypes.find((t) => t.slug === config.productSlug);

  if (!material || !productType) {
    return { surfaceM2: 0, materialCost: 0, optionsCost: 0, subtotalHt: 0, tva: 0, totalTtc: 0, lineItems: [] };
  }

  // Calculate surface in m2
  const largeurM = config.largeur / 1000;
  const hauteurM = config.hauteur / 1000;
  const profondeurM = config.profondeur / 1000;

  let surfaceM2: number;

  if (productType.optionsCategorie === 'worktop') {
    // Worktop: surface = largeur x profondeur
    surfaceM2 = largeurM * profondeurM;
    if (config.worktopShape === 'L') surfaceM2 *= 1.5;
    if (config.worktopShape === 'U') surfaceM2 *= 2;
  } else if (productType.optionsCategorie === 'shelf') {
    // Shelf: surface of back + shelves
    surfaceM2 = largeurM * hauteurM + config.nbNiveaux * largeurM * profondeurM;
  } else {
    // Furniture: 2 sides + top/bottom + back
    surfaceM2 =
      2 * (hauteurM * profondeurM) + // sides
      2 * (largeurM * profondeurM) + // top + bottom
      (config.avecDos ? largeurM * hauteurM : 0); // back
  }

  // Material cost
  const materialCost = surfaceM2 * material.prixM2;
  lineItems.push({
    label: material.name,
    quantity: Math.round(surfaceM2 * 100) / 100,
    unitPrice: material.prixM2,
    total: Math.round(materialCost * 100) / 100,
  });

  let optionsCost = 0;

  if (productType.optionsCategorie === 'furniture') {
    // Shelves
    if (config.nbEtageres > 0) {
      const cost = config.nbEtageres * optionPrices.etagere;
      optionsCost += cost;
      lineItems.push({ label: 'Etagere(s)', quantity: config.nbEtageres, unitPrice: optionPrices.etagere, total: cost });
    }

    // Drawers
    if (config.nbTiroirs > 0) {
      const cost = config.nbTiroirs * optionPrices.tiroir;
      optionsCost += cost;
      lineItems.push({ label: 'Tiroir(s)', quantity: config.nbTiroirs, unitPrice: optionPrices.tiroir, total: cost });
    }

    // Doors
    if (config.porteType !== 'aucune' && config.nbPortes > 0) {
      const price = config.porteType === 'coulissante' ? optionPrices.coulissantes : optionPrices.porte;
      const cost = config.nbPortes * price;
      optionsCost += cost;
      lineItems.push({
        label: config.porteType === 'coulissante' ? 'Porte(s) coulissante(s)' : 'Porte(s) battante(s)',
        quantity: config.nbPortes,
        unitPrice: price,
        total: cost,
      });
    }

    // Feet
    if (config.piedType !== 'sans') {
      const nbPieds = 4;
      const cost = nbPieds * optionPrices.pied;
      optionsCost += cost;
      lineItems.push({ label: 'Pieds', quantity: nbPieds, unitPrice: optionPrices.pied, total: cost });
    }

    // Back panel
    if (config.avecDos) {
      optionsCost += optionPrices.dos;
      lineItems.push({ label: 'Panneau de dos', quantity: 1, unitPrice: optionPrices.dos, total: optionPrices.dos });
    }
  } else if (productType.optionsCategorie === 'worktop') {
    // Edge type
    if (config.edgeType === 'arrondi') {
      optionsCost += optionPrices.bord_arrondi;
      lineItems.push({ label: 'Bord arrondi', quantity: 1, unitPrice: optionPrices.bord_arrondi, total: optionPrices.bord_arrondi });
    } else if (config.edgeType === 'chanfrein') {
      optionsCost += optionPrices.bord_chanfrein;
      lineItems.push({ label: 'Bord chanfrein', quantity: 1, unitPrice: optionPrices.bord_chanfrein, total: optionPrices.bord_chanfrein });
    }

    // Cutouts
    if (config.nbDecoupesRondes > 0) {
      const cost = config.nbDecoupesRondes * optionPrices.decoupe_ronde;
      optionsCost += cost;
      lineItems.push({ label: 'Decoupe(s) ronde(s)', quantity: config.nbDecoupesRondes, unitPrice: optionPrices.decoupe_ronde, total: cost });
    }
    if (config.nbDecoupesRect > 0) {
      const cost = config.nbDecoupesRect * optionPrices.decoupe_rectangulaire;
      optionsCost += cost;
      lineItems.push({ label: 'Decoupe(s) rectangulaire(s)', quantity: config.nbDecoupesRect, unitPrice: optionPrices.decoupe_rectangulaire, total: cost });
    }
  } else if (productType.optionsCategorie === 'shelf') {
    // Shelves/levels
    if (config.nbNiveaux > 0) {
      const cost = config.nbNiveaux * optionPrices.etagere;
      optionsCost += cost;
      lineItems.push({ label: 'Niveau(x)', quantity: config.nbNiveaux, unitPrice: optionPrices.etagere, total: cost });
    }

    // Separators
    if (config.nbSeparateurs > 0) {
      const cost = config.nbSeparateurs * optionPrices.separateur;
      optionsCost += cost;
      lineItems.push({ label: 'Separateur(s)', quantity: config.nbSeparateurs, unitPrice: optionPrices.separateur, total: cost });
    }

    // Mounting
    if (config.mountingType === 'murale') {
      optionsCost += optionPrices.fixation_murale;
      lineItems.push({ label: 'Fixation murale', quantity: 1, unitPrice: optionPrices.fixation_murale, total: optionPrices.fixation_murale });
    } else if (config.mountingType === 'sol') {
      optionsCost += optionPrices.fixation_sol;
      lineItems.push({ label: 'Fixation au sol', quantity: 1, unitPrice: optionPrices.fixation_sol, total: optionPrices.fixation_sol });
    }
  }

  const subtotalHt = Math.round((materialCost + optionsCost) * 100) / 100;
  const tva = Math.round(subtotalHt * TAX_RATE * 100) / 100;
  const totalTtc = Math.round((subtotalHt + tva) * 100) / 100;

  return {
    surfaceM2: Math.round(surfaceM2 * 100) / 100,
    materialCost: Math.round(materialCost * 100) / 100,
    optionsCost: Math.round(optionsCost * 100) / 100,
    subtotalHt,
    tva,
    totalTtc,
    lineItems,
  };
}
