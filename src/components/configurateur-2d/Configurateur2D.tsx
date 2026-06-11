'use client';

import { useState, useMemo } from 'react';
import type {
  ConfigurateurSettings,
} from '@/lib/types';
import { SVGRenderer } from './svg/SVGRenderer';
import { ConfigPanel } from './ConfigPanel';
import { QuoteModal } from './QuoteModal';
import { useConfigurateur2D } from './useConfigurateur2D';
import { calculatePrice2D } from './pricing';

interface Props {
  settings: ConfigurateurSettings;
}

export function Configurateur2D({ settings }: Props) {
  const { materials, product_types: productTypes, option_prices: optionPrices, options = [], labels } = settings;
  const { config, setProduct, setDimension, setMaterial, setOption, setOptionSelection } = useConfigurateur2D();
  const [quoteOpen, setQuoteOpen] = useState(false);

  const price = useMemo(
    () => calculatePrice2D(config, materials, optionPrices, productTypes, options),
    [config, materials, optionPrices, productTypes, options],
  );

  return (
    <div className="min-h-screen bg-beige/40">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-5">
        <h1 className="font-display text-xl sm:text-2xl text-noir">{labels.titre}</h1>
        <p className="text-sm text-noir/60 mt-1">{labels.sousTitre}</p>
      </div>

      {/* Main layout */}
      <div className="max-w-[1400px] mx-auto px-4 pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* SVG preview - 60% */}
          <div className="lg:w-[60%]">
            <div className="bg-white rounded-2xl ring-1 ring-noir/8 p-4 lg:sticky lg:top-28 flex items-center justify-center" style={{ height: 'min(55vh, 500px)' }}>
              <SVGRenderer
                config={config}
                materials={materials}
                productTypes={productTypes}
              />
            </div>
          </div>

          {/* Config panel - 40% */}
          <div className="lg:w-[40%]">
            <div className="bg-white rounded-2xl ring-1 ring-noir/8">
              <ConfigPanel
                config={config}
                materials={materials}
                productTypes={productTypes}
                optionPrices={optionPrices}
                options={options}
                labels={labels}
                price={price}
                onChangeProduct={(slug) => setProduct(slug, productTypes)}
                onChangeDimension={setDimension}
                onChangeMaterial={setMaterial}
                onChangeOption={setOption}
                onChangeOptionSelection={setOptionSelection}
                onRequestQuote={() => setQuoteOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quote modal */}
      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        config={config}
        price={price}
        materials={materials}
        productTypes={productTypes}
        labels={labels}
      />
    </div>
  );
}
