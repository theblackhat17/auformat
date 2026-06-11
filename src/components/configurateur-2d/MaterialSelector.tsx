'use client';

import Image from 'next/image';
import type { ConfigurateurMaterial } from '@/lib/types';

interface Props {
  materials: ConfigurateurMaterial[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function MaterialSelector({ materials, selectedIndex, onChange }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {materials.map((m, i) => {
        const isActive = i === selectedIndex;
        return (
          <button
            key={i}
            onClick={() => onChange(i)}
            className="flex flex-col items-center gap-1 group"
            title={`${m.name} - ${m.prixM2} EUR/m2`}
            aria-pressed={isActive}
          >
            <span
              className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                isActive
                  ? 'border-vert-foret scale-105 shadow-md'
                  : 'border-noir/10 group-hover:border-noir/30'
              }`}
              style={{ backgroundColor: m.colorHex }}
            >
              {m.image && <Image src={m.image} alt="" fill sizes="80px" className="object-cover" />}
              {isActive && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-vert-foret text-white flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
                </span>
              )}
            </span>
            <span className={`text-[10px] text-center leading-tight ${isActive ? 'text-vert-foret font-semibold' : 'text-noir/60'}`}>
              {m.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
