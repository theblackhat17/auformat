'use client';

import type { Configurateur2DConfig, MountingType } from '@/lib/types';

interface Props {
  config: Configurateur2DConfig;
  onChange: (field: keyof Configurateur2DConfig, value: unknown) => void;
}

const MOUNTING_TYPES: { value: MountingType; label: string }[] = [
  { value: 'aucune', label: 'Aucune' },
  { value: 'murale', label: 'Murale' },
  { value: 'sol', label: 'Au sol' },
];

export function ShelfOptions({ config, onChange }: Props) {
  return (
    <div className="space-y-4">
      {/* Levels */}
      <OptionRow label="Niveaux" value={config.nbNiveaux} min={1} max={12}
        onChange={(v) => onChange('nbNiveaux', v)} />

      {/* Separators */}
      <OptionRow label="Separateurs verticaux" value={config.nbSeparateurs} min={0} max={5}
        onChange={(v) => onChange('nbSeparateurs', v)} />

      {/* Mounting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fixation</label>
        <div className="flex gap-1">
          {MOUNTING_TYPES.map((mt) => (
            <button
              key={mt.value}
              onClick={() => onChange('mountingType', mt.value)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                config.mountingType === mt.value
                  ? 'border-[#2C5F2D] bg-[#2C5F2D]/5 text-[#2C5F2D] font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {mt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OptionRow({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
        >
          -
        </button>
        <span className="w-8 text-center text-sm font-medium">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
