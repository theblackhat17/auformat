'use client';

import type { Configurateur2DConfig, WorktopShape, EdgeType } from '@/lib/types';

interface Props {
  config: Configurateur2DConfig;
  onChange: (field: keyof Configurateur2DConfig, value: unknown) => void;
}

const SHAPES: { value: WorktopShape; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'L', label: 'Forme en L' },
  { value: 'U', label: 'Forme en U' },
];

const EDGES: { value: EdgeType; label: string }[] = [
  { value: 'droit', label: 'Droit' },
  { value: 'arrondi', label: 'Arrondi' },
  { value: 'chanfrein', label: 'Chanfrein' },
];

export function WorktopOptions({ config, onChange }: Props) {
  return (
    <div className="space-y-4">
      {/* Shape */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Forme</label>
        <div className="flex gap-1">
          {SHAPES.map((s) => (
            <button
              key={s.value}
              onClick={() => onChange('worktopShape', s.value)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                config.worktopShape === s.value
                  ? 'border-[#2C5F2D] bg-[#2C5F2D]/5 text-[#2C5F2D] font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edge type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type de bord</label>
        <div className="flex gap-1">
          {EDGES.map((e) => (
            <button
              key={e.value}
              onClick={() => onChange('edgeType', e.value)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                config.edgeType === e.value
                  ? 'border-[#2C5F2D] bg-[#2C5F2D]/5 text-[#2C5F2D] font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Round cutouts */}
      <OptionRow label="Decoupes rondes" value={config.nbDecoupesRondes} min={0} max={4}
        onChange={(v) => onChange('nbDecoupesRondes', v)} />

      {/* Rectangular cutouts */}
      <OptionRow label="Decoupes rectangulaires" value={config.nbDecoupesRect} min={0} max={3}
        onChange={(v) => onChange('nbDecoupesRect', v)} />
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
