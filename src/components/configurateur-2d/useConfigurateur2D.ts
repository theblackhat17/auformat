'use client';

import { useReducer, useCallback } from 'react';
import type {
  Configurateur2DConfig,
  ConfigurateurProductSlug,
  ConfigurateurProductType,
} from '@/lib/types';

export const DEFAULT_CONFIG: Configurateur2DConfig = {
  productSlug: 'meuble',
  largeur: 800,
  hauteur: 2000,
  profondeur: 500,
  epaisseur: 18,
  materialIndex: 0,
  // Furniture
  nbEtageres: 3,
  nbTiroirs: 0,
  porteType: 'aucune',
  nbPortes: 1,
  piedType: 'sans',
  avecDos: true,
  // Worktop
  worktopShape: 'rectangle',
  edgeType: 'droit',
  nbDecoupesRondes: 0,
  nbDecoupesRect: 0,
  // Shelf
  nbNiveaux: 3,
  nbSeparateurs: 0,
  mountingType: 'murale',
};

type Action =
  | { type: 'SET_PRODUCT'; slug: ConfigurateurProductSlug; productTypes: ConfigurateurProductType[] }
  | { type: 'SET_DIMENSION'; field: 'largeur' | 'hauteur' | 'profondeur' | 'epaisseur'; value: number }
  | { type: 'SET_MATERIAL'; index: number }
  | { type: 'SET_OPTION'; field: keyof Configurateur2DConfig; value: unknown }
  | { type: 'LOAD_CONFIG'; config: Configurateur2DConfig };

function reducer(state: Configurateur2DConfig, action: Action): Configurateur2DConfig {
  switch (action.type) {
    case 'SET_PRODUCT': {
      const pt = action.productTypes.find((t) => t.slug === action.slug);
      if (!pt) return { ...state, productSlug: action.slug };
      return {
        ...state,
        productSlug: action.slug,
        largeur: clamp(state.largeur, pt.dimensionsMin.largeur, pt.dimensionsMax.largeur),
        hauteur: clamp(state.hauteur, pt.dimensionsMin.hauteur, pt.dimensionsMax.hauteur),
        profondeur: clamp(state.profondeur, pt.dimensionsMin.profondeur, pt.dimensionsMax.profondeur),
        epaisseur: clamp(state.epaisseur, pt.dimensionsMin.epaisseur, pt.dimensionsMax.epaisseur),
      };
    }
    case 'SET_DIMENSION':
      return { ...state, [action.field]: action.value };
    case 'SET_MATERIAL':
      return { ...state, materialIndex: action.index };
    case 'SET_OPTION':
      return { ...state, [action.field]: action.value };
    case 'LOAD_CONFIG':
      return action.config;
    default:
      return state;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function useConfigurateur2D() {
  const [config, dispatch] = useReducer(reducer, DEFAULT_CONFIG);

  const setProduct = useCallback(
    (slug: ConfigurateurProductSlug, productTypes: ConfigurateurProductType[]) => {
      dispatch({ type: 'SET_PRODUCT', slug, productTypes });
    },
    [],
  );

  const setDimension = useCallback(
    (field: 'largeur' | 'hauteur' | 'profondeur' | 'epaisseur', value: number) => {
      dispatch({ type: 'SET_DIMENSION', field, value });
    },
    [],
  );

  const setMaterial = useCallback(
    (index: number) => {
      dispatch({ type: 'SET_MATERIAL', index });
    },
    [],
  );

  const setOption = useCallback(
    (field: keyof Configurateur2DConfig, value: unknown) => {
      dispatch({ type: 'SET_OPTION', field, value });
    },
    [],
  );

  return { config, setProduct, setDimension, setMaterial, setOption };
}
