'use client';

import type { PriceBreakdown } from '@/lib/types';

interface Props {
  price: PriceBreakdown;
}

export function WizardPriceSummary({ price }: Props) {
  const formatPrice = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <div className="border-t border-gray-200 bg-beige/30 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Estimation TTC</span>
        <span className="text-lg font-bold text-vert-foret">{formatPrice(price.totalTtc)}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400 mt-0.5">
        <span>HT: {formatPrice(price.subtotalHt)}</span>
        <span>TVA: {formatPrice(price.tva)}</span>
      </div>
    </div>
  );
}
