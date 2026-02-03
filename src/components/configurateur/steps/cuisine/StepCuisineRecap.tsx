'use client';

import type { CuisineConfig, PriceBreakdown } from '@/lib/types';
import {
  WOOD_MATERIALS, HANDLE_TYPES, COUNTERTOP_MATERIALS,
  KITCHEN_BASE_CABINETS, KITCHEN_WALL_CABINETS, KITCHEN_TALL_CABINETS,
  KITCHEN_LAYOUTS, HINGES_CATALOG, DRAWER_SLIDES_CATALOG,
  EDGE_BANDING_CATALOG, FINISHES_CATALOG,
} from '@/lib/constants';

interface Props {
  config: CuisineConfig;
  price: PriceBreakdown;
}

export function StepCuisineRecap({ config, price }: Props) {
  const formatPrice = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const layout = KITCHEN_LAYOUTS[config.layout];
  const facadeMat = WOOD_MATERIALS[config.facadeMaterial];
  const carcassMat = WOOD_MATERIALS[config.carcassMaterial];
  const countertopMat = COUNTERTOP_MATERIALS[config.countertop.material];
  const handle = HANDLE_TYPES[config.globalHandle];
  const hinge = HINGES_CATALOG[config.hardware.hingeType];
  const slide = DRAWER_SLIDES_CATALOG[config.hardware.drawerSlideType];
  const edge = EDGE_BANDING_CATALOG[config.finish.edgeBanding];
  const finish = FINISHES_CATALOG[config.finish.finish];

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-4">Recapitulatif</h2>

      {/* Layout & config */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-sm text-noir mb-2">Configuration</h3>
        <div className="grid grid-cols-2 gap-y-1 text-sm">
          <span className="text-gray-500">Nom</span>
          <span className="text-noir">{config.name}</span>
          <span className="text-gray-500">Disposition</span>
          <span className="text-noir">{layout?.name || config.layout}</span>
          <span className="text-gray-500">Elements bas</span>
          <span className="text-noir">{config.baseCabinets.length}</span>
          <span className="text-gray-500">Elements hauts</span>
          <span className="text-noir">{config.wallCabinets.length}</span>
          <span className="text-gray-500">Colonnes</span>
          <span className="text-noir">{config.tallCabinets.length}</span>
        </div>
      </div>

      {/* Materials */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-sm text-noir mb-2">Materiaux</h3>
        <div className="grid grid-cols-2 gap-y-1 text-sm">
          <span className="text-gray-500">Facades</span>
          <span className="text-noir">{facadeMat?.name || config.facadeMaterial}</span>
          <span className="text-gray-500">Carcasses</span>
          <span className="text-noir">{carcassMat?.name || config.carcassMaterial}</span>
          <span className="text-gray-500">Plan de travail</span>
          <span className="text-noir">{countertopMat?.name || config.countertop.material}</span>
          <span className="text-gray-500">Poignees</span>
          <span className="text-noir">{handle?.name || config.globalHandle}</span>
          <span className="text-gray-500">Charnieres</span>
          <span className="text-noir">{hinge?.name || '-'}</span>
          <span className="text-gray-500">Coulisses</span>
          <span className="text-noir">{slide?.name || '-'}</span>
          <span className="text-gray-500">Chants</span>
          <span className="text-noir">{edge?.name || '-'}</span>
          <span className="text-gray-500">Finition</span>
          <span className="text-noir">{finish?.name || '-'}</span>
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
