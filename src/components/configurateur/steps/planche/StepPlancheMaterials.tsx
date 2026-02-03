'use client';

import type { PlancheConfig } from '@/lib/types';
import { WOOD_MATERIALS } from '@/lib/constants';

interface Props {
  config: PlancheConfig;
  dispatch: React.Dispatch<any>;
}

export function StepPlancheMaterials({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Materiau</h2>
      <p className="text-sm text-gray-500 mb-6">Choisissez le materiau pour vos planches</p>

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
  );
}
