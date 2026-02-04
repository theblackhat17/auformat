'use client';

import { useState } from 'react';
import type { Configurateur2DPriceBreakdown } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface Props {
  price: Configurateur2DPriceBreakdown;
  label: string;
}

export function PriceDisplay({ price, label }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-2xl font-bold text-[#2C5F2D]">{formatPrice(price.totalTtc)}</span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-400 hover:text-gray-600 mt-2 flex items-center gap-1 transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 5l3 3 3-3" />
        </svg>
        {expanded ? 'Masquer le detail' : 'Voir le detail'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 animate-slide-down">
          {price.lineItems.map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-600">
                {item.label}
                {item.quantity > 1 && <span className="text-gray-400"> x{item.quantity}</span>}
              </span>
              <span className="text-gray-700">{formatPrice(item.total)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Sous-total HT</span>
              <span className="text-gray-700">{formatPrice(price.subtotalHt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">TVA (20%)</span>
              <span className="text-gray-700">{formatPrice(price.tva)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-700">Total TTC</span>
              <span className="text-[#2C5F2D]">{formatPrice(price.totalTtc)}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 pt-1">
            Surface estimee : {price.surfaceM2} m2
          </p>
        </div>
      )}
    </div>
  );
}
