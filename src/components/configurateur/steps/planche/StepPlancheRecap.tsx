'use client';

import type { PlancheConfig, PriceBreakdown } from '@/lib/types';
import { WOOD_MATERIALS, EDGE_BANDING_CATALOG, FINISHES_CATALOG } from '@/lib/constants';

interface Props {
  config: PlancheConfig;
  price: PriceBreakdown;
}

export function StepPlancheRecap({ config, price }: Props) {
  const formatPrice = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const mat = WOOD_MATERIALS[config.material];
  const finish = FINISHES_CATALOG[config.finish.finish];
  const totalQty = config.boards.reduce((s, b) => s + b.quantity, 0);

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-4">Recapitulatif</h2>

      {/* Project info */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-sm text-noir mb-2">Projet</h3>
        <div className="grid grid-cols-2 gap-y-1 text-sm">
          <span className="text-gray-500">Nom</span>
          <span className="text-noir">{config.name}</span>
          <span className="text-gray-500">Materiau</span>
          <span className="text-noir">{mat?.name || config.material}</span>
          <span className="text-gray-500">Finition</span>
          <span className="text-noir">{finish?.name || '-'}</span>
          <span className="text-gray-500">Total pieces</span>
          <span className="text-noir">{totalQty}</span>
        </div>
      </div>

      {/* Board details */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-sm text-noir mb-2">Planches</h3>
        <div className="space-y-2">
          {config.boards.map((board, i) => {
            const edges = (['top', 'bottom', 'left', 'right'] as const)
              .filter((s) => board.edgeBanding[s] !== 'none')
              .map((s) => {
                const band = EDGE_BANDING_CATALOG[board.edgeBanding[s]];
                return band ? band.name : board.edgeBanding[s];
              });
            return (
              <div key={board.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-noir">Planche {i + 1}</span>
                  <span className="text-gray-500">x{board.quantity}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {board.length} × {board.width} × {board.thickness}mm
                </p>
                {edges.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">Chants: {edges.join(', ')}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-sm text-noir mb-3">Detail du prix</h3>
        <div className="space-y-1.5">
          {price.lineItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-600">{item.label}</span>
              <span className="text-noir font-medium">{formatPrice(item.total)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 mt-3 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Sous-total HT</span>
            <span className="text-noir">{formatPrice(price.subtotalHt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">TVA (20%)</span>
            <span className="text-noir">{formatPrice(price.tva)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span className="text-noir">Total TTC</span>
            <span className="text-vert-foret">{formatPrice(price.totalTtc)}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        Prix indicatif. Le devis final sera etabli apres validation par notre equipe.
      </p>
    </div>
  );
}
