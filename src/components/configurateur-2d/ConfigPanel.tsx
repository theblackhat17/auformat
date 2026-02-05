'use client';

import type {
  Configurateur2DConfig,
  ConfigurateurMaterial,
  ConfigurateurProductType,
  ConfigurateurOptionPrices,
  ConfigurateurLabels,
  Configurateur2DPriceBreakdown,
  ConfigurateurProductSlug,
  ConfigurateurOption,
} from '@/lib/types';
import { ProductTypeSelector } from './ProductTypeSelector';
import { DimensionInputs } from './DimensionInputs';
import { MaterialSelector } from './MaterialSelector';
import { DynamicOptions } from './DynamicOptions';
import { PriceDisplay } from './PriceDisplay';

interface Props {
  config: Configurateur2DConfig;
  materials: ConfigurateurMaterial[];
  productTypes: ConfigurateurProductType[];
  optionPrices: ConfigurateurOptionPrices;
  options: ConfigurateurOption[];
  labels: ConfigurateurLabels;
  price: Configurateur2DPriceBreakdown;
  onChangeProduct: (slug: ConfigurateurProductSlug) => void;
  onChangeDimension: (field: 'largeur' | 'hauteur' | 'profondeur' | 'epaisseur', value: number) => void;
  onChangeMaterial: (index: number) => void;
  onChangeOption: (field: keyof Configurateur2DConfig, value: unknown) => void;
  onChangeOptionSelection: (slug: string, value: number) => void;
  onRequestQuote: () => void;
}

export function ConfigPanel({
  config,
  materials,
  productTypes,
  options,
  labels,
  price,
  onChangeProduct,
  onChangeDimension,
  onChangeMaterial,
  onChangeOptionSelection,
  onRequestQuote,
}: Props) {
  const productType = productTypes.find((t) => t.slug === config.productSlug);
  const optCat = productType?.optionsCategorie;

  // Filter options by current product category
  const categoryOptions = options.filter((o) => o.categorie === optCat);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      {/* Step 1: Product type */}
      <Section title={labels.etape1} number={1}>
        <ProductTypeSelector
          types={productTypes}
          selected={config.productSlug}
          onChange={onChangeProduct}
        />
      </Section>

      {/* Step 2: Dimensions */}
      {productType && (
        <Section title={labels.etape2} number={2}>
          <DimensionInputs
            largeur={config.largeur}
            hauteur={config.hauteur}
            profondeur={config.profondeur}
            epaisseur={config.epaisseur}
            productType={productType}
            onChange={onChangeDimension}
          />
        </Section>
      )}

      {/* Step 3: Material */}
      <Section title={labels.etape3} number={3}>
        <MaterialSelector
          materials={materials}
          selectedIndex={config.materialIndex}
          onChange={onChangeMaterial}
        />
      </Section>

      {/* Step 4: Options */}
      <Section title={labels.etape4} number={4}>
        <DynamicOptions
          options={categoryOptions}
          selections={config.optionSelections || {}}
          onSelect={onChangeOptionSelection}
        />
      </Section>

      {/* Price */}
      <PriceDisplay price={price} label={labels.prixEstimatif} />

      {/* Quote button */}
      <button
        onClick={onRequestQuote}
        className="w-full py-3 bg-[#D4A76A] text-white font-semibold rounded-xl hover:bg-[#c49555] transition-colors shadow-sm"
      >
        {labels.boutonDevis}
      </button>
    </div>
  );
}

function Section({ title, number, children }: { title: string; number: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-[#2C5F2D] text-white text-xs flex items-center justify-center font-bold">
          {number}
        </span>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}
