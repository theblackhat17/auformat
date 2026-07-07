import { describe, it, expect } from 'vitest';
import { calculatePrice2D } from './pricing';
import { TAX_RATE } from '@/lib/constants';
import type {
  Configurateur2DConfig,
  ConfigurateurMaterial,
  ConfigurateurOptionPrices,
  ConfigurateurProductType,
} from '@/lib/types';

const materials: ConfigurateurMaterial[] = [
  { name: 'Chêne', colorHex: '#c9a', prixM2: 100, sortOrder: 0, image: null },
];

const productTypes: ConfigurateurProductType[] = [
  {
    slug: 'meuble',
    nom: 'Meuble',
    icon: '',
    dimensionsMin: { largeur: 100, hauteur: 100, profondeur: 100, epaisseur: 18 },
    dimensionsMax: { largeur: 3000, hauteur: 3000, profondeur: 800, epaisseur: 40 },
    optionsCategorie: 'furniture',
  } as ConfigurateurProductType,
];

const optionPrices: ConfigurateurOptionPrices = {
  tiroir: 50, porte: 40, pied: 10, coulissantes: 120, etagere: 20, dos: 30,
  decoupe_ronde: 15, decoupe_rectangulaire: 15, bord_arrondi: 25, bord_chanfrein: 25,
  bord_droit: 0, fixation_murale: 12, fixation_sol: 12, separateur: 18,
};

function baseConfig(): Configurateur2DConfig {
  return {
    productSlug: 'meuble',
    largeur: 1000, hauteur: 1000, profondeur: 400, epaisseur: 18,
    materialIndex: 0,
    nbEtageres: 0, nbTiroirs: 0, porteType: 'aucune', nbPortes: 0, piedType: 'sans', avecDos: false,
    worktopShape: 'rectangle', edgeType: 'droit', nbDecoupesRondes: 0, nbDecoupesRect: 0,
    nbNiveaux: 0, nbSeparateurs: 0, mountingType: 'aucune',
    optionSelections: {},
  } as Configurateur2DConfig;
}

describe('calculatePrice2D', () => {
  it('chiffre la surface de panneaux d\'un caisson sans dos (2 côtés + 2 dessus/dessous)', () => {
    // surface = 2*(h*p) + 2*(l*p) = 2*(1*0.4) + 2*(1*0.4) = 1.6 m² ; coût = 160 €
    const price = calculatePrice2D(baseConfig(), materials, optionPrices, productTypes, []);
    expect(price.surfaceM2).toBeCloseTo(1.6, 2);
    expect(price.subtotalHt).toBeCloseTo(160, 2);
    expect(price.tva).toBeCloseTo(round2(160 * TAX_RATE), 2);
    expect(price.totalTtc).toBeCloseTo(round2(160 * (1 + TAX_RATE)), 2);
  });

  it('ajoute le coût des étagères en ligne séparée', () => {
    const cfg = baseConfig();
    cfg.nbEtageres = 2; // 2 * 20 € = 40 €
    const price = calculatePrice2D(cfg, materials, optionPrices, productTypes, []);
    expect(price.optionsCost).toBeCloseTo(40, 2);
    expect(price.subtotalHt).toBeCloseTo(200, 2);
    const etagereLine = price.lineItems.find((l) => /tag/i.test(l.label));
    expect(etagereLine?.total).toBeCloseTo(40, 2);
  });

  it('retourne un devis nul si le type de produit est inconnu', () => {
    const cfg = baseConfig();
    (cfg as { productSlug: string }).productSlug = 'inexistant';
    const price = calculatePrice2D(cfg, materials, optionPrices, productTypes, []);
    expect(price.subtotalHt).toBe(0);
    expect(price.lineItems).toHaveLength(0);
  });

  it('n\'accepte jamais un total négatif via des dimensions nulles', () => {
    const cfg = baseConfig();
    cfg.largeur = 0; cfg.hauteur = 0; cfg.profondeur = 0;
    const price = calculatePrice2D(cfg, materials, optionPrices, productTypes, []);
    expect(price.subtotalHt).toBeGreaterThanOrEqual(0);
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
