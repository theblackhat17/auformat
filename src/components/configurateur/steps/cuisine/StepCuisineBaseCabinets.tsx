'use client';

import type { CuisineConfig } from '@/lib/types';
import { KITCHEN_BASE_CABINETS } from '@/lib/constants';

interface Props {
  config: CuisineConfig;
  dispatch: React.Dispatch<any>;
}

export function StepCuisineBaseCabinets({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Elements bas</h2>
      <p className="text-sm text-gray-500 mb-6">{config.baseCabinets.length} element{config.baseCabinets.length !== 1 ? 's' : ''} place{config.baseCabinets.length !== 1 ? 's' : ''}</p>

      {/* Catalog */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-noir mb-2">Catalogue</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(KITCHEN_BASE_CABINETS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => dispatch({
                type: 'ADD_KITCHEN_CABINET',
                zone: 'base',
                catalogKey: key,
                width: item.defaultWidth,
                wallId: config.walls[0]?.id || 1,
              })}
              className="p-3 rounded-lg border border-gray-200 hover:border-vert-foret hover:bg-vert-foret/5 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-xs font-medium text-noir">{item.name}</p>
                  <p className="text-[10px] text-gray-400">{item.defaultWidth}mm — {item.basePrice} €</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Placed cabinets */}
      {config.baseCabinets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-noir mb-2">Elements places</h3>
          <div className="space-y-2">
            {config.baseCabinets.map((cab) => {
              const catItem = KITCHEN_BASE_CABINETS[cab.catalogKey];
              return (
                <div key={cab.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span>{catItem?.icon || '📦'}</span>
                    <div>
                      <p className="text-sm text-noir">{catItem?.name || cab.catalogKey}</p>
                      <p className="text-xs text-gray-400">Mur {cab.wallId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={cab.width}
                      onChange={(e) => dispatch({ type: 'UPDATE_KITCHEN_CABINET', zone: 'base', cabinetId: cab.id, updates: { width: Number(e.target.value) } })}
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      {(catItem?.widthOptions || [cab.width]).map((w) => (
                        <option key={w} value={w}>{w}mm</option>
                      ))}
                    </select>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_KITCHEN_CABINET', zone: 'base', cabinetId: cab.id })}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
