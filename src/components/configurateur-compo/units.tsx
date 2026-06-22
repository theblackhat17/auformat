'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Préférence d'unité d'affichage du configurateur (mm ↔ cm). Le stockage interne
 * des compositions reste TOUJOURS en millimètres ; seul l'affichage et la saisie changent.
 */
export type Unit = 'mm' | 'cm';

const UnitContext = createContext<{ unit: Unit; setUnit: (u: Unit) => void }>({ unit: 'mm', setUnit: () => {} });

const STORAGE_KEY = 'auformat-unit';

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnitState] = useState<Unit>('mm');

  useEffect(() => {
    try {
      const u = localStorage.getItem(STORAGE_KEY);
      if (u === 'cm' || u === 'mm') setUnitState(u);
    } catch { /* stockage indisponible */ }
  }, []);

  const setUnit = useCallback((u: Unit) => {
    setUnitState(u);
    try { localStorage.setItem(STORAGE_KEY, u); } catch { /* ignore */ }
  }, []);

  return <UnitContext.Provider value={{ unit, setUnit }}>{children}</UnitContext.Provider>;
}

export function useUnit() {
  return useContext(UnitContext);
}

/** Valeur en mm → nombre à afficher dans l'unité courante (cm avec 1 décimale au besoin) */
export function toDisplay(mm: number, unit: Unit): number {
  if (unit === 'cm') return Math.round((mm / 10) * 10) / 10;
  return Math.round(mm);
}

/** Nombre saisi dans l'unité courante → mm (stockage interne) */
export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'cm' ? Math.round(value * 10) : Math.round(value);
}

/** Longueur en mm → chaîne formatée avec unité, ex. « 1200 mm » ou « 120 cm » */
export function fmtLen(mm: number, unit: Unit): string {
  if (unit === 'cm') {
    const v = mm / 10;
    return `${Number.isInteger(v) ? v : v.toFixed(1)} cm`;
  }
  return `${Math.round(mm)} mm`;
}

/** Suffixe court de l'unité courante */
export function unitLabel(unit: Unit): string {
  return unit === 'cm' ? 'cm' : 'mm';
}

/** Pas de réglage adapté à l'unité (10 mm ou 1 cm) */
export function step(unit: Unit): number {
  return unit === 'cm' ? 1 : 10;
}
