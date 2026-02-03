'use client';

import type { PlancheConfig } from '@/lib/types';
import { PLANCHE_THICKNESSES } from '@/lib/constants';

interface Props {
  config: PlancheConfig;
  dispatch: React.Dispatch<any>;
}

export function StepPlancheDimensions({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-noir">Dimensions</h2>
          <p className="text-sm text-gray-500">{config.boards.length} planche{config.boards.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'ADD_BOARD' })}
          className="px-3 py-1.5 bg-vert-foret text-white text-sm rounded-lg hover:bg-vert-foret-dark"
        >
          + Planche
        </button>
      </div>

      <div className="space-y-4">
        {config.boards.map((board, i) => (
          <div key={board.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-noir">Planche {i + 1}</h3>
              {config.boards.length > 1 && (
                <button
                  onClick={() => dispatch({ type: 'REMOVE_BOARD', boardId: board.id })}
                  className="text-red-500 text-xs hover:underline"
                >
                  Supprimer
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Longueur (mm)</label>
                <input
                  type="number"
                  value={board.length}
                  onChange={(e) => dispatch({ type: 'UPDATE_BOARD', boardId: board.id, updates: { length: Number(e.target.value) } })}
                  min={100} max={3000} step={10}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Largeur (mm)</label>
                <input
                  type="number"
                  value={board.width}
                  onChange={(e) => dispatch({ type: 'UPDATE_BOARD', boardId: board.id, updates: { width: Number(e.target.value) } })}
                  min={50} max={1200} step={10}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Epaisseur</label>
              <div className="flex gap-2">
                {PLANCHE_THICKNESSES.map((t) => (
                  <button
                    key={t}
                    onClick={() => dispatch({ type: 'UPDATE_BOARD', boardId: board.id, updates: { thickness: t } })}
                    className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                      board.thickness === t ? 'bg-vert-foret text-white border-vert-foret' : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {t}mm
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Quantite</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dispatch({ type: 'UPDATE_BOARD', boardId: board.id, updates: { quantity: Math.max(1, board.quantity - 1) } })}
                  className="w-8 h-8 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  -
                </button>
                <span className="text-sm font-medium w-8 text-center">{board.quantity}</span>
                <button
                  onClick={() => dispatch({ type: 'UPDATE_BOARD', boardId: board.id, updates: { quantity: board.quantity + 1 } })}
                  className="w-8 h-8 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-400 mt-3">
              {board.length} × {board.width} × {board.thickness}mm — {board.quantity} piece{board.quantity > 1 ? 's' : ''}
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
