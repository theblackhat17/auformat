'use client';

import type { MeubleConfig } from '@/lib/types';
import { WOOD_MATERIALS, HANDLE_TYPES } from '@/lib/constants';

interface Props {
  config: MeubleConfig;
  dispatch: React.Dispatch<any>;
}

export function StepMeubleMaterials({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Materiaux</h2>
      <p className="text-sm text-gray-500 mb-6">Choisissez le bois et les poignees</p>

      {/* Wood material selection */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-noir mb-3">Materiau des panneaux</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(WOOD_MATERIALS).map(([key, mat]) => {
            const isSelected = config.material === key;
            const colorHex = '#' + mat.color.toString(16).padStart(6, '0');
            return (
              <button
                key={key}
                onClick={() => dispatch({ type: 'SET_MATERIAL', material: key })}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  isSelected ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="w-full h-10 rounded-lg mb-2 border border-gray-200"
                  style={{ backgroundColor: colorHex }}
                />
                <p className={`text-xs font-medium ${isSelected ? 'text-vert-foret' : 'text-noir'}`}>{mat.name}</p>
                <p className="text-[10px] text-gray-400">{mat.price} €/m²</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Handle selection */}
      <div>
        <h3 className="text-sm font-semibold text-noir mb-3">Poignees</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(HANDLE_TYPES).map(([key, handle]) => {
            const isSelected = config.globalHandle === key;
            return (
              <button
                key={key}
                onClick={() => dispatch({ type: 'SET_HANDLE', handle: key })}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{handle.icon}</span>
                  <div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-vert-foret' : 'text-noir'}`}>{handle.name}</p>
                    <p className="text-xs text-gray-400">{handle.price} €/unite</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
