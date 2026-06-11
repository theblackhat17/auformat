'use client';

import { useReducer, useCallback } from 'react';
import type {
  CompositionConfig,
  CompositionModule,
  ConfigurateurModuleType,
  ConfigurateurUnivers,
} from '@/lib/types';

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function createModule(type: ConfigurateurModuleType): CompositionModule {
  const options: Record<string, number> = {};
  for (const opt of type.options) options[opt.slug] = opt.defaut;
  return {
    id: newId(),
    typeSlug: type.slug,
    largeur: type.dimensionsDefault.largeur,
    hauteur: type.dimensionsDefault.hauteur,
    profondeur: type.dimensionsDefault.profondeur,
    materialIndex: null,
    options,
  };
}

export function createStarterConfig(
  univers: ConfigurateurUnivers,
  moduleTypes: ConfigurateurModuleType[],
  materialIndex: number
): CompositionConfig {
  const modules: CompositionModule[] = [];
  for (const slug of univers.starterModules) {
    const type = moduleTypes.find((t) => t.slug === slug && t.actif);
    if (type) modules.push(createModule(type));
  }
  return {
    version: 2,
    univers: univers.slug,
    materialIndex,
    planTravail: univers.planTravail?.disponible ?? false,
    facadeCoulissante: false,
    lineaireMax: null,
    modules,
  };
}

type State = {
  config: CompositionConfig;
  selectedId: string | null;
  /** Incrémenté à chaque mutation : déclenche l'autosave débouncé */
  dirty: number;
};

type Action =
  | { type: 'LOAD'; config: CompositionConfig }
  | { type: 'SELECT'; id: string | null }
  | { type: 'ADD_MODULE'; moduleType: ConfigurateurModuleType }
  | { type: 'REMOVE_MODULE'; id: string }
  | { type: 'DUPLICATE_MODULE'; id: string }
  | { type: 'MOVE_MODULE'; id: string; direction: -1 | 1 }
  | { type: 'SET_MODULE_DIM'; id: string; field: 'largeur' | 'hauteur' | 'profondeur'; value: number }
  | { type: 'SET_MODULE_MATERIAL'; id: string; index: number | null }
  | { type: 'SET_MODULE_OPTION'; id: string; slug: string; value: number }
  | { type: 'SET_GLOBAL_MATERIAL'; index: number }
  | { type: 'SET_PLAN_TRAVAIL'; value: boolean }
  | { type: 'SET_MODULE_POS'; id: string; posX: number | null; posY: number | null }
  | { type: 'SET_FACADE_COULISSANTE'; value: boolean }
  | { type: 'SET_FACADE_VANTAUX'; value: number }
  | { type: 'SET_PLAN_MATERIAL'; index: number | null }
  | { type: 'SET_PLAN_DIMS'; debord?: number; epaisseur?: number }
  | { type: 'SET_MODULE_ECART'; id: string; value: number }
  | { type: 'SET_TIROIRS_HAUTEUR'; id: string; value: number | null }
  | { type: 'SET_ETAGERE_POS'; id: string; index: number; value: number | null }
  | { type: 'SET_PLINTHE_MATERIAL'; index: number | null }
  | { type: 'SET_LINEAIRE_MAX'; value: number | null };

function patchModule(state: State, id: string, patch: Partial<CompositionModule>): State {
  return {
    ...state,
    dirty: state.dirty + 1,
    config: {
      ...state.config,
      modules: state.config.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    },
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { config: action.config, selectedId: null, dirty: 0 };
    case 'SELECT':
      return { ...state, selectedId: action.id };
    case 'ADD_MODULE': {
      const mod = createModule(action.moduleType);
      return {
        ...state,
        dirty: state.dirty + 1,
        selectedId: mod.id,
        config: { ...state.config, modules: [...state.config.modules, mod] },
      };
    }
    case 'REMOVE_MODULE':
      return {
        ...state,
        dirty: state.dirty + 1,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        config: { ...state.config, modules: state.config.modules.filter((m) => m.id !== action.id) },
      };
    case 'DUPLICATE_MODULE': {
      const idx = state.config.modules.findIndex((m) => m.id === action.id);
      if (idx === -1) return state;
      const copy: CompositionModule = { ...state.config.modules[idx], id: newId(), options: { ...state.config.modules[idx].options } };
      const modules = [...state.config.modules];
      modules.splice(idx + 1, 0, copy);
      return { ...state, dirty: state.dirty + 1, selectedId: copy.id, config: { ...state.config, modules } };
    }
    case 'MOVE_MODULE': {
      const idx = state.config.modules.findIndex((m) => m.id === action.id);
      const target = idx + action.direction;
      if (idx === -1 || target < 0 || target >= state.config.modules.length) return state;
      const modules = [...state.config.modules];
      [modules[idx], modules[target]] = [modules[target], modules[idx]];
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, modules } };
    }
    case 'SET_MODULE_DIM':
      return patchModule(state, action.id, { [action.field]: action.value });
    case 'SET_MODULE_MATERIAL':
      return patchModule(state, action.id, { materialIndex: action.index });
    case 'SET_MODULE_OPTION': {
      const mod = state.config.modules.find((m) => m.id === action.id);
      if (!mod) return state;
      return patchModule(state, action.id, { options: { ...mod.options, [action.slug]: action.value } });
    }
    case 'SET_GLOBAL_MATERIAL':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, materialIndex: action.index } };
    case 'SET_PLAN_TRAVAIL':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, planTravail: action.value } };
    case 'SET_MODULE_POS':
      return patchModule(state, action.id, { posX: action.posX, posY: action.posY });
    case 'SET_FACADE_COULISSANTE':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, facadeCoulissante: action.value } };
    case 'SET_FACADE_VANTAUX':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, facadeVantaux: Math.min(4, Math.max(2, action.value)) } };
    case 'SET_PLAN_MATERIAL':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, planMaterialIndex: action.index } };
    case 'SET_PLAN_DIMS':
      return {
        ...state,
        dirty: state.dirty + 1,
        config: {
          ...state.config,
          ...(action.debord !== undefined ? { planDebord: Math.min(400, Math.max(0, action.debord)) } : {}),
          ...(action.epaisseur !== undefined ? { planEpaisseur: Math.min(100, Math.max(20, action.epaisseur)) } : {}),
        },
      };
    case 'SET_MODULE_ECART':
      return patchModule(state, action.id, { ecartGauche: Math.min(3000, Math.max(0, Math.round(action.value))) });
    case 'SET_TIROIRS_HAUTEUR':
      return patchModule(state, action.id, { tiroirsHauteur: action.value });
    case 'SET_ETAGERE_POS': {
      const mod = state.config.modules.find((m) => m.id === action.id);
      if (!mod) return state;
      const pos = [...(mod.etageresPos || [])];
      pos[action.index] = action.value;
      return patchModule(state, action.id, { etageresPos: pos });
    }
    case 'SET_PLINTHE_MATERIAL':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, plintheMaterialIndex: action.index } };
    case 'SET_LINEAIRE_MAX':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, lineaireMax: action.value } };
    default:
      return state;
  }
}

export function useComposition(initial: CompositionConfig) {
  const [state, dispatch] = useReducer(reducer, { config: initial, selectedId: null, dirty: 0 });

  const select = useCallback((id: string | null) => dispatch({ type: 'SELECT', id }), []);
  const addModule = useCallback((moduleType: ConfigurateurModuleType) => dispatch({ type: 'ADD_MODULE', moduleType }), []);
  const removeModule = useCallback((id: string) => dispatch({ type: 'REMOVE_MODULE', id }), []);
  const duplicateModule = useCallback((id: string) => dispatch({ type: 'DUPLICATE_MODULE', id }), []);
  const moveModule = useCallback((id: string, direction: -1 | 1) => dispatch({ type: 'MOVE_MODULE', id, direction }), []);
  const setModuleDim = useCallback(
    (id: string, field: 'largeur' | 'hauteur' | 'profondeur', value: number) =>
      dispatch({ type: 'SET_MODULE_DIM', id, field, value }),
    []
  );
  const setModuleMaterial = useCallback((id: string, index: number | null) => dispatch({ type: 'SET_MODULE_MATERIAL', id, index }), []);
  const setModuleOption = useCallback((id: string, slug: string, value: number) => dispatch({ type: 'SET_MODULE_OPTION', id, slug, value }), []);
  const setGlobalMaterial = useCallback((index: number) => dispatch({ type: 'SET_GLOBAL_MATERIAL', index }), []);
  const setPlanTravail = useCallback((value: boolean) => dispatch({ type: 'SET_PLAN_TRAVAIL', value }), []);
  const setModulePos = useCallback((id: string, posX: number | null, posY: number | null) => dispatch({ type: 'SET_MODULE_POS', id, posX, posY }), []);
  const setFacadeCoulissante = useCallback((value: boolean) => dispatch({ type: 'SET_FACADE_COULISSANTE', value }), []);
  const setFacadeVantaux = useCallback((value: number) => dispatch({ type: 'SET_FACADE_VANTAUX', value }), []);
  const setPlanMaterial = useCallback((index: number | null) => dispatch({ type: 'SET_PLAN_MATERIAL', index }), []);
  const setPlanDims = useCallback((dims: { debord?: number; epaisseur?: number }) => dispatch({ type: 'SET_PLAN_DIMS', ...dims }), []);
  const setModuleEcart = useCallback((id: string, value: number) => dispatch({ type: 'SET_MODULE_ECART', id, value }), []);
  const setTiroirsHauteur = useCallback((id: string, value: number | null) => dispatch({ type: 'SET_TIROIRS_HAUTEUR', id, value }), []);
  const setEtagerePos = useCallback((id: string, index: number, value: number | null) => dispatch({ type: 'SET_ETAGERE_POS', id, index, value }), []);
  const setPlintheMaterial = useCallback((index: number | null) => dispatch({ type: 'SET_PLINTHE_MATERIAL', index }), []);
  const setLineaireMax = useCallback((value: number | null) => dispatch({ type: 'SET_LINEAIRE_MAX', value }), []);
  const load = useCallback((config: CompositionConfig) => dispatch({ type: 'LOAD', config }), []);

  return {
    config: state.config,
    selectedId: state.selectedId,
    dirty: state.dirty,
    select,
    addModule,
    removeModule,
    duplicateModule,
    moveModule,
    setModuleDim,
    setModuleMaterial,
    setModuleOption,
    setGlobalMaterial,
    setPlanTravail,
    setModulePos,
    setFacadeCoulissante,
    setFacadeVantaux,
    setPlanMaterial,
    setPlanDims,
    setModuleEcart,
    setTiroirsHauteur,
    setEtagerePos,
    setPlintheMaterial,
    setLineaireMax,
    load,
  };
}
