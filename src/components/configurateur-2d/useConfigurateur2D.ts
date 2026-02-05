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
  // Dynamic options
  optionSelections: {},
};

type Action =
  | { type: 'SET_PRODUCT'; slug: ConfigurateurProductSlug; productTypes: ConfigurateurProductType[] }
  | { type: 'SET_DIMENSION'; field: 'largeur' | 'hauteur' | 'profondeur' | 'epaisseur'; value: number }
  | { type: 'SET_MATERIAL'; index: number }
  | { type: 'SET_OPTION'; field: keyof Configurateur2DConfig; value: unknown }
  | { type: 'SET_OPTION_SELECTION'; slug: string; value: number }
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
    case 'SET_OPTION_SELECTION': {
      const newSelections = { ...state.optionSelections, [action.slug]: action.value };
      // Sync SVG-relevant fields from option slugs
      const svgUpdates: Partial<Configurateur2DConfig> = {};
      if (action.slug === 'etagere') svgUpdates.nbEtageres = action.value;
      if (action.slug === 'tiroir') svgUpdates.nbTiroirs = action.value;
      if (action.slug === 'dos') svgUpdates.avecDos = action.value > 0;
      if (action.slug === 'niveau') svgUpdates.nbNiveaux = action.value;
      if (action.slug === 'separateur') svgUpdates.nbSeparateurs = action.value;
      if (action.slug === 'decoupe_ronde') svgUpdates.nbDecoupesRondes = action.value;
      if (action.slug === 'decoupe_rectangulaire') svgUpdates.nbDecoupesRect = action.value;
      // Choice groups affecting SVG
      if (action.slug === 'pied_rond' && action.value > 0) svgUpdates.piedType = 'rond';
      if (action.slug === 'pied_carre' && action.value > 0) svgUpdates.piedType = 'carre';
      if (action.slug === 'pied_oblique' && action.value > 0) svgUpdates.piedType = 'oblique';
      if (['pied_rond', 'pied_carre', 'pied_oblique'].includes(action.slug) && action.value === 0) {
        const hasPied = ['pied_rond', 'pied_carre', 'pied_oblique'].some(
          (s) => s !== action.slug && (newSelections[s] || 0) > 0
        );
        if (!hasPied) svgUpdates.piedType = 'sans';
      }
      if (action.slug === 'bord_droit' && action.value > 0) svgUpdates.edgeType = 'droit';
      if (action.slug === 'bord_arrondi' && action.value > 0) svgUpdates.edgeType = 'arrondi';
      if (action.slug === 'bord_chanfrein' && action.value > 0) svgUpdates.edgeType = 'chanfrein';
      if (action.slug === 'fixation_murale' && action.value > 0) svgUpdates.mountingType = 'murale';
      if (action.slug === 'fixation_sol' && action.value > 0) svgUpdates.mountingType = 'sol';
      if (['fixation_murale', 'fixation_sol'].includes(action.slug) && action.value === 0) {
        const hasFixation = ['fixation_murale', 'fixation_sol'].some(
          (s) => s !== action.slug && (newSelections[s] || 0) > 0
        );
        if (!hasFixation) svgUpdates.mountingType = 'aucune';
      }
      // Door handling
      if (action.slug === 'porte_battante') {
        const totalPortes = action.value + (newSelections['porte_coulissante'] || 0);
        svgUpdates.nbPortes = totalPortes;
        if (action.value > 0) svgUpdates.porteType = 'battante';
        else if ((newSelections['porte_coulissante'] || 0) > 0) svgUpdates.porteType = 'coulissante';
        else svgUpdates.porteType = 'aucune';
      }
      if (action.slug === 'porte_coulissante') {
        const totalPortes = (newSelections['porte_battante'] || 0) + action.value;
        svgUpdates.nbPortes = totalPortes;
        if (action.value > 0) svgUpdates.porteType = 'coulissante';
        else if ((newSelections['porte_battante'] || 0) > 0) svgUpdates.porteType = 'battante';
        else svgUpdates.porteType = 'aucune';
      }
      return { ...state, ...svgUpdates, optionSelections: newSelections };
    }
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

  const setOptionSelection = useCallback(
    (slug: string, value: number) => {
      dispatch({ type: 'SET_OPTION_SELECTION', slug, value });
    },
    [],
  );

  return { config, setProduct, setDimension, setMaterial, setOption, setOptionSelection };
}
