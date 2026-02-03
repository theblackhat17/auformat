'use client';

import type { CuisineConfig } from '@/lib/types';
import { COUNTERTOP_MATERIALS } from '@/lib/constants';

interface Props {
  config: CuisineConfig;
  dispatch: React.Dispatch<any>;
}

export function StepCuisineCountertop({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Plan de travail</h2>
      <p className="text-sm text-gray-500 mb-6">Choisissez le materiau et les dimensions</p>

      {/* Material selection */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-noir mb-3">Materiau</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(COUNTERTOP_MATERIALS).map(([key, mat]) => {
            const isSelected = config.countertop.material === key;
            const colorHex = '#' + mat.color.toString(16).padStart(6, '0');
            return (
              <button
                key={key}
                onClick={() => dispatch({ type: 'SET_COUNTERTOP', updates: { material: key, thickness: mat.defaultThickness } })}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  isSelected ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="w-full h-8 rounded-lg mb-2 border border-gray-200"
                  style={{ backgroundColor: colorHex }}
                />
                <p className={`text-xs font-medium ${isSelected ? 'text-vert-foret' : 'text-noir'}`}>{mat.name}</p>
                <p className="text-[10px] text-gray-400">{mat.pricePerSqm} €/m²</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Epaisseur (mm)</label>
          <div className="flex gap-2">
            {[20, 30, 38, 40].map((t) => (
              <button
                key={t}
                onClick={() => dispatch({ type: 'SET_COUNTERTOP', updates: { thickness: t } })}
                className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                  config.countertop.thickness === t ? 'bg-vert-foret text-white border-vert-foret' : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {t}mm
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Debord avant (mm)</label>
          <input
            type="number"
            value={config.countertop.overhang}
            onChange={(e) => dispatch({ type: 'SET_COUNTERTOP', updates: { overhang: Number(e.target.value) } })}
            min={0} max={100} step={5}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Hauteur de credence (mm) — 0 = sans</label>
          <input
            type="number"
            value={config.countertop.backsplashHeight}
            onChange={(e) => dispatch({ type: 'SET_COUNTERTOP', updates: { backsplashHeight: Number(e.target.value) } })}
            min={0} max={200} step={10}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
          />
        </div>
      </div>
    </div>
  );
}
