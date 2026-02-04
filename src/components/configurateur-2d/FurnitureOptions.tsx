'use client';

import type { Configurateur2DConfig, DoorType, FeetType } from '@/lib/types';

interface Props {
  config: Configurateur2DConfig;
  onChange: (field: keyof Configurateur2DConfig, value: unknown) => void;
}

const DOOR_TYPES: { value: DoorType; label: string }[] = [
  { value: 'aucune', label: 'Sans porte' },
  { value: 'battante', label: 'Battante' },
  { value: 'coulissante', label: 'Coulissante' },
];

const FEET_TYPES: { value: FeetType; label: string }[] = [
  { value: 'sans', label: 'Sans' },
  { value: 'rond', label: 'Rond' },
  { value: 'carre', label: 'Carre' },
  { value: 'oblique', label: 'Oblique' },
];

export function FurnitureOptions({ config, onChange }: Props) {
  return (
    <div className="space-y-4">
      {/* Shelves */}
      <OptionRow label="Etageres" value={config.nbEtageres} min={0} max={10}
        onChange={(v) => onChange('nbEtageres', v)} />

      {/* Drawers */}
      <OptionRow label="Tiroirs" value={config.nbTiroirs} min={0} max={8}
        onChange={(v) => onChange('nbTiroirs', v)} />

      {/* Door type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type de porte</label>
        <div className="flex gap-1">
          {DOOR_TYPES.map((dt) => (
            <button
              key={dt.value}
              onClick={() => onChange('porteType', dt.value)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                config.porteType === dt.value
                  ? 'border-[#2C5F2D] bg-[#2C5F2D]/5 text-[#2C5F2D] font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Number of doors */}
      {config.porteType !== 'aucune' && (
        <OptionRow label="Nombre de portes" value={config.nbPortes} min={1} max={4}
          onChange={(v) => onChange('nbPortes', v)} />
      )}

      {/* Feet */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pieds</label>
        <div className="flex gap-1">
          {FEET_TYPES.map((ft) => (
            <button
              key={ft.value}
              onClick={() => onChange('piedType', ft.value)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                config.piedType === ft.value
                  ? 'border-[#2C5F2D] bg-[#2C5F2D]/5 text-[#2C5F2D] font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* Back panel */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Panneau de dos</label>
        <button
          onClick={() => onChange('avecDos', !config.avecDos)}
          className={`w-10 h-5 rounded-full transition-colors relative ${
            config.avecDos ? 'bg-[#2C5F2D]' : 'bg-gray-300'
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            config.avecDos ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
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
