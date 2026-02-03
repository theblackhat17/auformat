'use client';

import type { CuisineConfig } from '@/lib/types';
import { KITCHEN_LAYOUTS } from '@/lib/constants';

interface Props {
  config: CuisineConfig;
  dispatch: React.Dispatch<any>;
}

export function StepCuisineLayout({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Forme de la cuisine</h2>
      <p className="text-sm text-gray-500 mb-6">Choisissez la disposition de votre cuisine</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {(Object.entries(KITCHEN_LAYOUTS) as [string, { name: string; description: string; icon: string }][]).map(([key, layout]) => {
          const isSelected = config.layout === key;
          return (
            <button
              key={key}
              onClick={() => dispatch({ type: 'SET_LAYOUT', layout: key })}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                isSelected ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-3xl block mb-2 font-mono">{layout.icon}</span>
              <h3 className={`font-semibold text-sm ${isSelected ? 'text-vert-foret' : 'text-noir'}`}>{layout.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{layout.description}</p>
            </button>
          );
        })}
      </div>

      {/* Wall dimensions */}
      <div>
        <h3 className="text-sm font-semibold text-noir mb-3">Dimensions des murs</h3>
        <div className="space-y-3">
          {config.walls.map((wall, i) => (
            <div key={wall.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
              <span className="text-sm font-medium text-gray-600 w-16">Mur {i + 1}</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Longueur (mm)</label>
                <input
                  type="number"
                  value={wall.length}
                  onChange={(e) => dispatch({ type: 'UPDATE_WALL', wallId: wall.id, updates: { length: Number(e.target.value) } })}
                  min={1200} max={6000} step={100}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
                />
              </div>
              <span className="text-xs text-gray-400">{(wall.length / 1000).toFixed(1)}m</span>
            </div>
          ))}
        </div>
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
