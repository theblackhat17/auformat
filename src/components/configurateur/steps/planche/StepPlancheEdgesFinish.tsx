'use client';

import type { PlancheConfig } from '@/lib/types';
import { EDGE_BANDING_CATALOG, FINISHES_CATALOG } from '@/lib/constants';

interface Props {
  config: PlancheConfig;
  dispatch: React.Dispatch<any>;
}

const SIDE_LABELS: Record<string, string> = {
  top: 'Haut (longueur)',
  bottom: 'Bas (longueur)',
  left: 'Gauche (largeur)',
  right: 'Droite (largeur)',
};

export function StepPlancheEdgesFinish({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Chants & Finitions</h2>
      <p className="text-sm text-gray-500 mb-6">Configurez les chants pour chaque planche</p>

      {/* Edge banding per board */}
      <div className="space-y-6 mb-8">
        {config.boards.map((board, i) => (
          <div key={board.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-sm text-noir mb-3">
              Planche {i + 1} — {board.length}×{board.width}mm
            </h3>

            {/* Visual board representation */}
            <div className="relative w-48 h-32 mx-auto mb-4">
              <div className="absolute inset-4 bg-bois-clair/20 border border-bois-clair rounded">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                  {board.length}×{board.width}
                </span>
              </div>
              {/* Side indicators */}
              {(['top', 'bottom', 'left', 'right'] as const).map((side) => {
                const hasEdge = board.edgeBanding[side] !== 'none';
                const pos = {
                  top: 'top-0 left-4 right-4 h-4',
                  bottom: 'bottom-0 left-4 right-4 h-4',
                  left: 'left-0 top-4 bottom-4 w-4',
                  right: 'right-0 top-4 bottom-4 w-4',
                };
                return (
                  <div
                    key={side}
                    className={`absolute ${pos[side]} rounded ${hasEdge ? 'bg-vert-foret/30' : 'bg-gray-200/50'}`}
                  />
                );
              })}
            </div>

            <div className="space-y-2">
              {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                <div key={side} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 w-32">{SIDE_LABELS[side]}</span>
                  <select
                    value={board.edgeBanding[side]}
                    onChange={(e) => dispatch({ type: 'SET_BOARD_EDGE', boardId: board.id, side, value: e.target.value })}
                    className="flex-1 ml-2 px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-vert-foret/20 focus:border-vert-foret"
                  >
                    {Object.entries(EDGE_BANDING_CATALOG).map(([key, band]) => (
                      <option key={key} value={key}>
                        {band.name} {band.pricePerMeter > 0 ? `(${band.pricePerMeter} €/m)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Finish */}
      <div>
        <h3 className="text-sm font-semibold text-noir mb-3">Finition de surface</h3>
        <div className="space-y-2">
          {Object.entries(FINISHES_CATALOG).map(([key, item]) => {
            const isSelected = config.finish.finish === key;
            return (
              <button
                key={key}
                onClick={() => dispatch({ type: 'SET_FINISH', updates: { finish: key } })}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected ? 'border-vert-foret bg-vert-foret/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-vert-foret' : 'text-noir'}`}>{item.name}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{item.pricePerSqm > 0 ? `${item.pricePerSqm} €/m²` : 'Gratuit'}</p>
                    {isSelected && <span className="text-vert-foret text-sm">✓</span>}
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
