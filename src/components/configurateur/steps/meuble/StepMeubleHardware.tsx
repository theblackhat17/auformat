'use client';

import type { MeubleConfig, PriceBreakdown } from '@/lib/types';
import {
  HINGES_CATALOG, DRAWER_SLIDES_CATALOG, SHELF_SUPPORTS_CATALOG,
  EDGE_BANDING_CATALOG, FINISHES_CATALOG,
} from '@/lib/constants';

interface Props {
  config: MeubleConfig;
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

export function StepMeubleHardware({ config, dispatch, price }: Props) {
  const doorCount = config.cabinets.reduce((s, c) => s + c.modules.filter((m) => m.type === 'porte').length, 0);
  const drawerCount = config.cabinets.reduce((s, c) => s + c.modules.filter((m) => m.type === 'tiroir').length, 0);
  const shelfCount = config.cabinets.reduce((s, c) => s + c.modules.filter((m) => m.type === 'etagere').length, 0);

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Quincaillerie & Finitions</h2>
      <p className="text-sm text-gray-500 mb-6">
        {doorCount} porte{doorCount !== 1 ? 's' : ''}, {drawerCount} tiroir{drawerCount !== 1 ? 's' : ''}, {shelfCount} etagere{shelfCount !== 1 ? 's' : ''}
      </p>

      {doorCount > 0 && (
        <CatalogSelect
          label={`Charnieres (${doorCount} portes × 3)`}
          catalog={HINGES_CATALOG}
          value={config.hardware.hingeType}
          onChange={(key) => dispatch({ type: 'SET_HARDWARE', updates: { hingeType: key } })}
        />
      )}

      {drawerCount > 0 && (
        <CatalogSelect
          label={`Coulisses tiroirs (${drawerCount} paires)`}
          catalog={DRAWER_SLIDES_CATALOG}
          value={config.hardware.drawerSlideType}
          onChange={(key) => dispatch({ type: 'SET_HARDWARE', updates: { drawerSlideType: key } })}
        />
      )}

      {shelfCount > 0 && (
        <CatalogSelect
          label={`Supports etagere (${shelfCount} jeux)`}
          catalog={SHELF_SUPPORTS_CATALOG}
          value={config.hardware.shelfSupportType}
          onChange={(key) => dispatch({ type: 'SET_HARDWARE', updates: { shelfSupportType: key } })}
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
