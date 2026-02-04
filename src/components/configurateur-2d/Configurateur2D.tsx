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
  const { materials, product_types: productTypes, option_prices: optionPrices, labels } = settings;
  const { config, setProduct, setDimension, setMaterial, setOption } = useConfigurateur2D();
  const [quoteOpen, setQuoteOpen] = useState(false);

  const price = useMemo(
    () => calculatePrice2D(config, materials, optionPrices, productTypes),
    [config, materials, optionPrices, productTypes],
  );

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-lg font-bold text-[#2C5F2D] hover:text-[#234a24] transition-colors">
            Au Format
          </a>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-medium text-gray-700">{labels.titre}</h1>
        </div>
      </div>

      {/* Subtitle */}
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">{labels.sousTitre}</p>
      </div>

      {/* Main layout */}
      <div className="max-w-[1400px] mx-auto px-4 pb-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* SVG preview - 60% */}
          <div className="lg:w-[60%]">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:sticky lg:top-4" style={{ minHeight: '400px' }}>
              <SVGRenderer
                config={config}
                materials={materials}
                productTypes={productTypes}
              />
            </div>
          </div>

          {/* Config panel - 40% */}
          <div className="lg:w-[40%]">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <ConfigPanel
                config={config}
                materials={materials}
                productTypes={productTypes}
                optionPrices={optionPrices}
                labels={labels}
                price={price}
                onChangeProduct={(slug) => setProduct(slug, productTypes)}
                onChangeDimension={setDimension}
                onChangeMaterial={setMaterial}
                onChangeOption={setOption}
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
