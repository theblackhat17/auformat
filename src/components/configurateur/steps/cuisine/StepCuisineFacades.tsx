'use client';

import type { CuisineConfig } from '@/lib/types';
import { WOOD_MATERIALS, HANDLE_TYPES } from '@/lib/constants';

interface Props {
  config: CuisineConfig;
  dispatch: React.Dispatch<any>;
}

export function StepCuisineFacades({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Facades & Poignees</h2>
      <p className="text-sm text-gray-500 mb-6">Choisissez les materiaux de facade et de carcasse</p>

      {/* Facade material */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-noir mb-3">Materiau des facades</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(WOOD_MATERIALS).map(([key, mat]) => {
            const isSelected = config.facadeMaterial === key;
            const colorHex = '#' + mat.color.toString(16).padStart(6, '0');
            return (
              <button
                key={key}
                onClick={() => dispatch({ type: 'SET_FACADE_MATERIAL', material: key })}
                className={`p-2 rounded-xl border-2 text-center transition-all ${
                  isSelected ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-full h-8 rounded-lg mb-1 border border-gray-200" style={{ backgroundColor: colorHex }} />
                <p className={`text-[10px] font-medium ${isSelected ? 'text-vert-foret' : 'text-noir'}`}>{mat.name}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Carcass material */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-noir mb-3">Materiau de carcasse</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(WOOD_MATERIALS).filter(([k]) => ['blanc', 'noir', 'mdf_brut', 'mdf_laque', 'contreplaque'].includes(k)).map(([key, mat]) => {
            const isSelected = config.carcassMaterial === key;
            const colorHex = '#' + mat.color.toString(16).padStart(6, '0');
            return (
              <button
                key={key}
                onClick={() => dispatch({ type: 'SET_CARCASS_MATERIAL', material: key })}
                className={`p-2 rounded-xl border-2 text-center transition-all ${
                  isSelected ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-full h-8 rounded-lg mb-1 border border-gray-200" style={{ backgroundColor: colorHex }} />
                <p className={`text-[10px] font-medium ${isSelected ? 'text-vert-foret' : 'text-noir'}`}>{mat.name}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Handles */}
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
