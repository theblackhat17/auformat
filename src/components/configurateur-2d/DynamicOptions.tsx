'use client';

import type { ConfigurateurOption } from '@/lib/types';

interface Props {
  options: ConfigurateurOption[];
  selections: Record<string, number>;
  onSelect: (slug: string, value: number) => void;
}

export function DynamicOptions({ options, selections, onSelect }: Props) {
  const activeOptions = options.filter((o) => o.actif).sort((a, b) => a.sortOrder - b.sortOrder);

  // Group choice options by groupe
  const groups: Record<string, ConfigurateurOption[]> = {};
  const standalone: ConfigurateurOption[] = [];

  for (const opt of activeOptions) {
    if (opt.type === 'choix' && opt.groupe) {
      if (!groups[opt.groupe]) groups[opt.groupe] = [];
      groups[opt.groupe].push(opt);
    } else {
      standalone.push(opt);
    }
  }

  // Render order: standalone items interleaved with groups at the position of the first group member
  const rendered: React.ReactNode[] = [];
  const renderedGroups = new Set<string>();
  let itemIndex = 0;

  for (const opt of activeOptions) {
    if (opt.type === 'choix' && opt.groupe) {
      if (!renderedGroups.has(opt.groupe)) {
        renderedGroups.add(opt.groupe);
        const groupOptions = groups[opt.groupe];
        rendered.push(
          <ChoiceGroup
            key={`group-${opt.groupe}`}
            label={getGroupLabel(opt.groupe)}
            options={groupOptions}
            selections={selections}
            onSelect={onSelect}
          />
        );
      }
    } else if (opt.type === 'compteur') {
      rendered.push(
        <CounterRow
          key={opt.slug}
          option={opt}
          value={selections[opt.slug] || 0}
          onChange={(v) => onSelect(opt.slug, v)}
        />
      );
    } else if (opt.type === 'toggle') {
      rendered.push(
        <ToggleRow
          key={opt.slug}
          option={opt}
          active={!!(selections[opt.slug])}
          onChange={(v) => onSelect(opt.slug, v ? 1 : 0)}
        />
      );
    }
    itemIndex++;
  }

  if (rendered.length === 0) {
    return <p className="text-sm text-gray-400 italic">Aucune option disponible</p>;
  }

  return <div className="space-y-3">{rendered}</div>;
}

function getGroupLabel(groupe: string): string {
  const labels: Record<string, string> = {
    pieds: 'Pieds',
    bord: 'Type de bord',
    fixation: 'Fixation',
  };
  return labels[groupe] || groupe.charAt(0).toUpperCase() + groupe.slice(1);
}

function CounterRow({
  option,
  value,
  onChange,
}: {
  option: ConfigurateurOption;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-gray-700">{option.nom}</span>
        <span className="text-xs text-gray-400 ml-2">{option.prix.toFixed(2)} EUR</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
        >
          -
        </button>
        <span className="w-8 text-center text-sm font-medium">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  option,
  active,
  onChange,
}: {
  option: ConfigurateurOption;
  active: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-gray-700">{option.nom}</span>
        <span className="text-xs text-gray-400 ml-2">{option.prix.toFixed(2)} EUR</span>
      </div>
      <button
        onClick={() => onChange(!active)}
        className={`w-10 h-5 rounded-full transition-colors relative ${
          active ? 'bg-[#2C5F2D]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            active ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function ChoiceGroup({
  label,
  options,
  selections,
  onSelect,
}: {
  label: string;
  options: ConfigurateurOption[];
  selections: Record<string, number>;
  onSelect: (slug: string, value: number) => void;
}) {
  const selectedSlug = options.find((o) => (selections[o.slug] || 0) > 0)?.slug || null;

  const handleSelect = (slug: string) => {
    // Deselect all in group, then select the clicked one (or deselect if same)
    for (const opt of options) {
      if (opt.slug !== slug) {
        onSelect(opt.slug, 0);
      }
    }
    onSelect(slug, selectedSlug === slug ? 0 : 1);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.slug}
            onClick={() => handleSelect(opt.slug)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              selectedSlug === opt.slug
                ? 'border-[#2C5F2D] bg-[#2C5F2D]/5 text-[#2C5F2D] font-medium'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {opt.nom}
            <span className="text-[10px] text-gray-400 ml-1">{opt.prix > 0 ? `+${opt.prix.toFixed(0)}` : ''}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
