'use client';

import type { MeubleConfig } from '@/lib/types';
import { MEUBLE_TEMPLATES } from '@/lib/constants';

interface Props {
  config: MeubleConfig;
  dispatch: React.Dispatch<any>;
}

export function StepMeubleTemplate({ config, dispatch }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-noir mb-1">Choisissez un modele</h2>
      <p className="text-sm text-gray-500 mb-6">Partez d&apos;un modele ou creez sur-mesure</p>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(MEUBLE_TEMPLATES).map(([key, tpl]) => {
          const isSelected = config.template === key;
          return (
            <button
              key={key}
              onClick={() => dispatch({ type: 'SET_TEMPLATE', template: key })}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                isSelected
                  ? 'border-vert-foret bg-vert-foret/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl block mb-2">{tpl.icon}</span>
              <h3 className={`font-semibold text-sm ${isSelected ? 'text-vert-foret' : 'text-noir'}`}>{tpl.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{tpl.description}</p>
              <p className="text-xs text-gray-400 mt-1">{tpl.cabinets.length} caisson{tpl.cabinets.length > 1 ? 's' : ''}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
