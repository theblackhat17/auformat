'use client';

import type { MeubleConfig } from '@/lib/types';
import { MODULES_CATALOG } from '@/lib/constants';

interface Props {
  config: MeubleConfig;
  dispatch: React.Dispatch<any>;
}

export function StepMeubleModules({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Amenagement interieur</h2>
      <p className="text-sm text-gray-500 mb-6">Ajoutez des modules dans chaque caisson</p>

      <div className="space-y-6">
        {config.cabinets.map((cab, i) => (
          <div key={cab.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-sm text-noir mb-3">
              Caisson {i + 1} ({cab.width}×{cab.height}mm)
              <span className="text-gray-400 font-normal ml-2">{cab.modules.length} module{cab.modules.length !== 1 ? 's' : ''}</span>
            </h3>

            {/* Module catalog buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(MODULES_CATALOG).map(([key, mod]) => (
                <button
                  key={key}
                  onClick={() => dispatch({ type: 'ADD_MODULE', cabinetId: cab.id, moduleType: key })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-beige/50 border border-bois-clair/30 rounded-lg text-xs hover:bg-beige transition-colors"
                >
                  <span>{mod.icon}</span>
                  <span>{mod.name}</span>
                  <span className="text-gray-400">{mod.basePrice > 0 ? `${mod.basePrice}€` : ''}</span>
                </button>
              ))}
            </div>

            {/* Added modules list */}
            {cab.modules.length > 0 ? (
              <div className="space-y-2">
                {cab.modules.map((mod) => {
                  const catalog = MODULES_CATALOG[mod.type];
                  return (
                    <div key={mod.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{catalog?.icon}</span>
                        <span className="text-sm text-noir">{catalog?.name || mod.type}</span>
                        <span className="text-xs text-gray-400">pos: {Math.round(mod.position)}mm</span>
                      </div>
                      <button
                        onClick={() => dispatch({ type: 'REMOVE_MODULE', cabinetId: cab.id, moduleId: mod.id })}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Aucun module — ajoutez-en ci-dessus</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
