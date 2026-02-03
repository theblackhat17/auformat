'use client';

import type { MeubleConfig } from '@/lib/types';

interface Props {
  config: MeubleConfig;
  dispatch: React.Dispatch<any>;
}

export function StepMeubleStructure({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-noir">Structure</h2>
          <p className="text-sm text-gray-500">{config.cabinets.length} caisson{config.cabinets.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'ADD_CABINET' })}
          className="px-3 py-1.5 bg-vert-foret text-white text-sm rounded-lg hover:bg-vert-foret-dark"
        >
          + Caisson
        </button>
      </div>

      <div className="space-y-4">
        {config.cabinets.map((cab, i) => (
          <div key={cab.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-noir">Caisson {i + 1}</h3>
              {config.cabinets.length > 1 && (
                <button
                  onClick={() => dispatch({ type: 'REMOVE_CABINET', cabinetId: cab.id })}
                  className="text-red-500 text-xs hover:underline"
                >
                  Supprimer
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Largeur (mm)</label>
                <input
                  type="number"
                  value={cab.width}
                  onChange={(e) => dispatch({ type: 'UPDATE_CABINET', cabinetId: cab.id, updates: { width: Number(e.target.value) } })}
                  min={200} max={2400} step={10}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hauteur (mm)</label>
                <input
                  type="number"
                  value={cab.height}
                  onChange={(e) => dispatch({ type: 'UPDATE_CABINET', cabinetId: cab.id, updates: { height: Number(e.target.value) } })}
                  min={200} max={3000} step={10}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Profondeur (mm)</label>
                <input
                  type="number"
                  value={cab.depth}
                  onChange={(e) => dispatch({ type: 'UPDATE_CABINET', cabinetId: cab.id, updates: { depth: Number(e.target.value) } })}
                  min={200} max={800} step={10}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Epaisseur panneau (mm)</label>
              <div className="flex gap-2">
                {[16, 18, 22, 25].map((t) => (
                  <button
                    key={t}
                    onClick={() => dispatch({ type: 'UPDATE_CABINET', cabinetId: cab.id, updates: { thickness: t } })}
                    className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                      cab.thickness === t ? 'bg-vert-foret text-white border-vert-foret' : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {t}mm
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-3 text-xs text-gray-500">
              <span>L: {cab.width}mm</span>
              <span>×</span>
              <span>H: {cab.height}mm</span>
              <span>×</span>
              <span>P: {cab.depth}mm</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet</label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
        />
      </div>
    </div>
  );
}
