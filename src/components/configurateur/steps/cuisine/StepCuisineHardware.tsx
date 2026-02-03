'use client';

import type { CuisineConfig, PriceBreakdown } from '@/lib/types';
import {
  HINGES_CATALOG, DRAWER_SLIDES_CATALOG,
  EDGE_BANDING_CATALOG, FINISHES_CATALOG,
  KITCHEN_BASE_CABINETS, KITCHEN_WALL_CABINETS, KITCHEN_TALL_CABINETS,
} from '@/lib/constants';

interface Props {
  config: CuisineConfig;
  dispatch: React.Dispatch<any>;
  price: PriceBreakdown;
}

function CatalogSelect<T extends { name: string; description: string }>({
  label,
  catalog,
  value,
  onChange,
}: {
  label: string;
  catalog: Record<string, T>;
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-noir mb-2">{label}</h3>
      <div className="space-y-2">
        {Object.entries(catalog).map(([key, item]) => {
          const isSelected = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                isSelected ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isSelected ? 'text-vert-foret' : 'text-noir'}`}>{item.name}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                {isSelected && <span className="text-vert-foret">✓</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StepCuisineHardware({ config, dispatch }: Props) {
  const allCabs = [...config.baseCabinets, ...config.wallCabinets, ...config.tallCabinets];
  let totalDoors = 0;
  let totalDrawers = 0;

  allCabs.forEach((cab) => {
    const cats = { ...KITCHEN_BASE_CABINETS, ...KITCHEN_WALL_CABINETS, ...KITCHEN_TALL_CABINETS };
    const catItem = cats[cab.catalogKey];
    if (catItem?.hasDoor) totalDoors++;
    if (catItem?.hasDrawer) totalDrawers++;
  });

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Quincaillerie & Finitions</h2>
      <p className="text-sm text-gray-500 mb-6">
        {totalDoors} porte{totalDoors !== 1 ? 's' : ''}, {totalDrawers} tiroir{totalDrawers !== 1 ? 's' : ''}
      </p>

      <CatalogSelect
        label={`Charnieres (${totalDoors} portes × 3)`}
        catalog={HINGES_CATALOG}
        value={config.hardware.hingeType}
        onChange={(key) => dispatch({ type: 'SET_HARDWARE', updates: { hingeType: key } })}
      />

      {totalDrawers > 0 && (
        <CatalogSelect
          label={`Coulisses tiroirs (${totalDrawers} paires)`}
          catalog={DRAWER_SLIDES_CATALOG}
          value={config.hardware.drawerSlideType}
          onChange={(key) => dispatch({ type: 'SET_HARDWARE', updates: { drawerSlideType: key } })}
        />
      )}

      <CatalogSelect
        label="Chants"
        catalog={EDGE_BANDING_CATALOG}
        value={config.finish.edgeBanding}
        onChange={(key) => dispatch({ type: 'SET_FINISH', updates: { edgeBanding: key } })}
      />

      <CatalogSelect
        label="Finition de surface"
        catalog={FINISHES_CATALOG}
        value={config.finish.finish}
        onChange={(key) => dispatch({ type: 'SET_FINISH', updates: { finish: key } })}
      />
    </div>
  );
}
