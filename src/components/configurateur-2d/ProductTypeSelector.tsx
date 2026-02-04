'use client';

import type { ConfigurateurProductType, ConfigurateurProductSlug } from '@/lib/types';

const ICONS: Record<string, string> = {
  meuble: 'M4 6h16v12H4z M8 6V4h8v2 M8 12h8',
  meuble_tv: 'M2 8h20v8H2z M8 16v2 M16 16v2 M6 20h12',
  bibliotheque: 'M3 2h18v20H3z M9 2v20 M15 2v20 M3 8h6 M9 8h6 M15 8h6 M3 14h6 M9 14h6 M15 14h6',
  dressing: 'M2 2h20v20H2z M12 2v20 M2 10h10 M14 4v4 M14 14h6',
  bureau: 'M2 8h20v2H2z M4 10v8 M18 10v8 M4 14h6v4H4z',
  plan_travail: 'M1 10h22v3H1z M5 7v3 M19 7v3',
  etagere: 'M4 2h16v20H4z M4 7h16 M4 12h16 M4 17h16',
};

interface Props {
  types: ConfigurateurProductType[];
  selected: ConfigurateurProductSlug;
  onChange: (slug: ConfigurateurProductSlug) => void;
}

export function ProductTypeSelector({ types, selected, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {types.map((t) => {
        const isActive = t.slug === selected;
        return (
          <button
            key={t.slug}
            onClick={() => onChange(t.slug)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
              isActive
                ? 'border-[#2C5F2D] bg-[#2C5F2D]/5 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className={`w-7 h-7 ${isActive ? 'stroke-[#2C5F2D]' : 'stroke-gray-500'}`} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d={ICONS[t.icon] || ICONS.meuble} />
            </svg>
            <span className={`text-xs font-medium text-center leading-tight ${isActive ? 'text-[#2C5F2D]' : 'text-gray-600'}`}>
              {t.nom}
            </span>
          </button>
        );
      })}
    </div>
  );
}
