'use client';

import type { ConfigurateurProductType } from '@/lib/types';

interface Props {
  largeur: number;
  hauteur: number;
  profondeur: number;
  epaisseur: number;
  productType: ConfigurateurProductType;
  onChange: (field: 'largeur' | 'hauteur' | 'profondeur' | 'epaisseur', value: number) => void;
}

const DIM_LABELS = {
  largeur: 'Largeur',
  hauteur: 'Hauteur',
  profondeur: 'Profondeur',
  epaisseur: 'Epaisseur',
};

export function DimensionInputs({ largeur, hauteur, profondeur, epaisseur, productType, onChange }: Props) {
  const dims = [
    { key: 'largeur' as const, value: largeur },
    { key: 'hauteur' as const, value: hauteur },
    { key: 'profondeur' as const, value: profondeur },
    { key: 'epaisseur' as const, value: epaisseur },
  ];

  return (
    <div className="space-y-3">
      {dims.map(({ key, value }) => {
        const min = productType.dimensionsMin[key];
        const max = productType.dimensionsMax[key];
        return (
          <div key={key}>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-700">{DIM_LABELS[key]}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={value}
                  min={min}
                  max={max}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || min;
                    onChange(key, Math.max(min, Math.min(max, v)));
                  }}
                  className="w-20 px-2 py-1 text-sm border border-gray-200 rounded text-right"
                />
                <span className="text-xs text-gray-400">mm</span>
              </div>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={value}
              onChange={(e) => onChange(key, parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2C5F2D]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>{min}</span>
              <span>{max}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
