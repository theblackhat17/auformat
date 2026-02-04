'use client';

import type { ConfigurateurMaterial } from '@/lib/types';

interface Props {
  materials: ConfigurateurMaterial[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function MaterialSelector({ materials, selectedIndex, onChange }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {materials.map((m, i) => {
        const isActive = i === selectedIndex;
        return (
          <button
            key={i}
            onClick={() => onChange(i)}
            className="flex flex-col items-center gap-1 group"
            title={`${m.name} - ${m.prixM2} EUR/m2`}
          >
            <div
              className={`w-10 h-10 rounded-full border-3 transition-all duration-200 ${
                isActive
                  ? 'border-[#2C5F2D] scale-110 shadow-md'
                  : 'border-gray-200 group-hover:border-gray-300 group-hover:scale-105'
              }`}
              style={{ backgroundColor: m.colorHex }}
            />
            <span className={`text-[10px] text-center leading-tight ${isActive ? 'text-[#2C5F2D] font-semibold' : 'text-gray-500'}`}>
              {m.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
