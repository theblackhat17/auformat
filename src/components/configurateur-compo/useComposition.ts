'use client';

import { useReducer, useCallback } from 'react';
import type {
  CompositionConfig,
  CompositionModule,
  ConfigurateurModuleType,
  ConfigurateurUnivers,
  PoigneeFinition,
  StyleFacade,
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
  /** Historique pour annuler/rétablir */
  past: CompositionConfig[];
  future: CompositionConfig[];
  /** Clé de la dernière mutation : les coups répétés (glissière) se regroupent en une seule étape d'historique */
  lastKey: string | null;
};

const HISTORY_MAX = 60;

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
  | { type: 'SET_PLAN_CHANT'; index: number | null }
  | { type: 'SET_PLAN_DIMS'; debord?: number; epaisseur?: number }
  | { type: 'SET_MODULE_ECART'; id: string; value: number }
  | { type: 'SET_TIROIRS_HAUTEUR'; id: string; value: number | null }
  | { type: 'SET_ETAGERE_POS'; id: string; index: number; value: number | null }
  | { type: 'SET_PLINTHE_MATERIAL'; index: number | null }
  | { type: 'SET_LINEAIRE_MAX'; value: number | null }
  | { type: 'SET_FACADE_MATERIAL'; id: string; index: number | null }
  | { type: 'SET_INTERIEUR_MATERIAL'; id: string; index: number | null }
  | { type: 'SET_FUSION'; id: string; value: boolean }
  | { type: 'SET_BANDEAU'; id: string; value: boolean }
  | { type: 'SET_BANDEAU_HAUTEUR'; id: string; value: number | null }
  | { type: 'SET_GRILLE'; id: string; value: { colonnes: number; etageresParColonne: number[] } | null }
  | { type: 'SET_GRILLE_COLONNES'; id: string; value: number }
  | { type: 'SET_GRILLE_ETAGERES'; id: string; col: number; value: number }
  | { type: 'SET_EMPILE'; id: string; baseId: string | null }
  | { type: 'SET_EMPILE_OFFSET'; id: string; value: number }
  | { type: 'SET_HAUTEUR_PLAFOND'; value: number }
  | { type: 'SET_STYLE_FACADE'; id: string; value: StyleFacade }
  | { type: 'SET_MODULE_MUR'; id: string; value: 'principal' | 'retour_gauche' | 'retour_droit' }
  | { type: 'SWAP_MODULES'; idA: string; idB: string }
  | { type: 'SET_POIGNEE_FINITION'; value: PoigneeFinition }
  | { type: 'SET_LED_TEMP'; value: 'chaud' | 'neutre' }
  | { type: 'APPLY_MATERIAL_ALL'; index: number }
  | { type: 'UNDO' }
  | { type: 'REDO' };

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

/** Clé d'historique : les répétitions de la même mutation (drag, slider) ne créent qu'une étape */
function actionKey(action: Action): string | null {
  switch (action.type) {
    case 'SET_MODULE_DIM': return `dim:${action.id}:${action.field}`;
    case 'SET_MODULE_POS': return `pos:${action.id}`;
    case 'SET_MODULE_ECART': return `ecart:${action.id}`;
    case 'SET_TIROIRS_HAUTEUR': return `th:${action.id}`;
    case 'SET_ETAGERE_POS': return `ep:${action.id}:${action.index}`;
    case 'SET_BANDEAU_HAUTEUR': return `bh:${action.id}`;
    case 'SET_EMPILE_OFFSET': return `eo:${action.id}`;
    case 'SET_PLAN_DIMS': return 'plandims';
    case 'SET_LINEAIRE_MAX': return 'linmax';
    case 'SET_HAUTEUR_PLAFOND': return 'plafond';
    default: return action.type.startsWith('SET_') ? action.type : null;
  }
}

function reducer(rawState: State, action: Action): State {
  // Annuler / rétablir : on navigue dans l'historique des configs
  if (action.type === 'UNDO') {
    if (rawState.past.length === 0) return rawState;
    const prev = rawState.past[rawState.past.length - 1];
    return {
      ...rawState,
      config: prev,
      past: rawState.past.slice(0, -1),
      future: [rawState.config, ...rawState.future].slice(0, HISTORY_MAX),
      dirty: rawState.dirty + 1,
      lastKey: null,
      selectedId: rawState.selectedId && prev.modules.some((m) => m.id === rawState.selectedId) ? rawState.selectedId : null,
    };
  }
  if (action.type === 'REDO') {
    if (rawState.future.length === 0) return rawState;
    const next = rawState.future[0];
    return {
      ...rawState,
      config: next,
      past: [...rawState.past, rawState.config].slice(-HISTORY_MAX),
      future: rawState.future.slice(1),
      dirty: rawState.dirty + 1,
      lastKey: null,
      selectedId: rawState.selectedId && next.modules.some((m) => m.id === rawState.selectedId) ? rawState.selectedId : null,
    };
  }

  // Toute autre mutation empile l'état courant (sauf répétition de la même glissière)
  const key = actionKey(action);
  const mutates = action.type !== 'SELECT';
  const state: State = mutates && action.type !== 'LOAD'
    ? {
        ...rawState,
        past: key !== null && key === rawState.lastKey
          ? rawState.past
          : [...rawState.past, rawState.config].slice(-HISTORY_MAX),
        future: [],
        lastKey: key,
      }
    : rawState;

  switch (action.type) {
    case 'LOAD':
      return { config: action.config, selectedId: null, dirty: 0, past: [], future: [], lastKey: null };
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
      if (idx === -1) return rawState;
      const copy: CompositionModule = { ...state.config.modules[idx], id: newId(), options: { ...state.config.modules[idx].options } };
      const modules = [...state.config.modules];
      modules.splice(idx + 1, 0, copy);
      return { ...state, dirty: state.dirty + 1, selectedId: copy.id, config: { ...state.config, modules } };
    }
    case 'MOVE_MODULE': {
      const idx = state.config.modules.findIndex((m) => m.id === action.id);
      const target = idx + action.direction;
      if (idx === -1 || target < 0 || target >= state.config.modules.length) return rawState;
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
      if (!mod) return rawState;
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
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, facadeVantaux: Math.min(6, Math.max(1, action.value)) } };
    case 'SET_PLAN_MATERIAL':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, planMaterialIndex: action.index } };
    case 'SET_PLAN_CHANT':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, planChantMaterialIndex: action.index } };
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
      if (!mod) return rawState;
      const pos = [...(mod.etageresPos || [])];
      pos[action.index] = action.value;
      return patchModule(state, action.id, { etageresPos: pos });
    }
    case 'SET_PLINTHE_MATERIAL':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, plintheMaterialIndex: action.index } };
    case 'SET_LINEAIRE_MAX':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, lineaireMax: action.value } };
    case 'SET_FACADE_MATERIAL':
      return patchModule(state, action.id, { facadeMaterialIndex: action.index });
    case 'SET_INTERIEUR_MATERIAL':
      return patchModule(state, action.id, { interieurMaterialIndex: action.index });
    case 'SET_FUSION':
      return patchModule(state, action.id, { fusionSuivant: action.value });
    case 'SET_BANDEAU':
      return patchModule(state, action.id, { bandeau: action.value });
    case 'SET_BANDEAU_HAUTEUR':
      return patchModule(state, action.id, { bandeauHauteur: action.value });
    case 'SET_GRILLE':
      return patchModule(state, action.id, { grille: action.value ?? undefined });
    case 'SET_GRILLE_COLONNES': {
      const mod = state.config.modules.find((m) => m.id === action.id);
      if (!mod) return rawState;
      const n = Math.min(8, Math.max(1, Math.round(action.value)));
      const prev = mod.grille?.etageresParColonne ?? [];
      const cols = Array.from({ length: n }, (_, i) => prev[i] ?? prev[prev.length - 1] ?? 3);
      return patchModule(state, action.id, { grille: { colonnes: n, etageresParColonne: cols } });
    }
    case 'SET_GRILLE_ETAGERES': {
      const mod = state.config.modules.find((m) => m.id === action.id);
      if (!mod?.grille) return rawState;
      const cols = [...mod.grille.etageresParColonne];
      cols[action.col] = Math.min(12, Math.max(0, Math.round(action.value)));
      return patchModule(state, action.id, { grille: { ...mod.grille, etageresParColonne: cols } });
    }
    case 'SET_EMPILE': {
      // Empêche les cycles : le support ne peut pas être le module lui-même ni un de ses descendants
      if (action.baseId === action.id) return rawState;
      if (action.baseId) {
        const mods = state.config.modules;
        let cur: string | null | undefined = action.baseId;
        const seen = new Set<string>();
        while (cur) {
          if (cur === action.id) return rawState; // cycle
          if (seen.has(cur)) break;
          seen.add(cur);
          cur = mods.find((m) => m.id === cur)?.empileSur ?? null;
        }
      }
      return patchModule(state, action.id, { empileSur: action.baseId, empileOffset: action.baseId ? 0 : undefined });
    }
    case 'SET_EMPILE_OFFSET':
      return patchModule(state, action.id, { empileOffset: Math.round(action.value) });
    case 'SET_HAUTEUR_PLAFOND':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, hauteurPlafond: Math.min(3500, Math.max(2000, Math.round(action.value))) } };
    case 'SET_STYLE_FACADE':
      return patchModule(state, action.id, { styleFacade: action.value });
    case 'SET_MODULE_MUR':
      // Changer de mur remet le décalage à zéro : le module repart au bout de sa nouvelle rangée
      return patchModule(state, action.id, { mur: action.value, ecartGauche: 0 });
    case 'SWAP_MODULES': {
      const ia = state.config.modules.findIndex((m) => m.id === action.idA);
      const ib = state.config.modules.findIndex((m) => m.id === action.idB);
      if (ia === -1 || ib === -1 || ia === ib) return rawState;
      const modules = [...state.config.modules];
      [modules[ia], modules[ib]] = [modules[ib], modules[ia]];
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, modules } };
    }
    case 'SET_POIGNEE_FINITION':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, poigneeFinition: action.value } };
    case 'SET_LED_TEMP':
      return { ...state, dirty: state.dirty + 1, config: { ...state.config, ledTemp: action.value } };
    case 'APPLY_MATERIAL_ALL':
      // Matériau appliqué à toute la composition : devient le principal, les exceptions par module sont levées
      return {
        ...state,
        dirty: state.dirty + 1,
        config: {
          ...state.config,
          materialIndex: action.index,
          modules: state.config.modules.map((m) => (m.materialIndex !== null ? { ...m, materialIndex: null } : m)),
        },
      };
    default:
      return rawState;
  }
}

export function useComposition(initial: CompositionConfig) {
  const [state, dispatch] = useReducer(reducer, { config: initial, selectedId: null, dirty: 0, past: [], future: [], lastKey: null });

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
  const setPlanChant = useCallback((index: number | null) => dispatch({ type: 'SET_PLAN_CHANT', index }), []);
  const setPlanDims = useCallback((dims: { debord?: number; epaisseur?: number }) => dispatch({ type: 'SET_PLAN_DIMS', ...dims }), []);
  const setModuleEcart = useCallback((id: string, value: number) => dispatch({ type: 'SET_MODULE_ECART', id, value }), []);
  const setTiroirsHauteur = useCallback((id: string, value: number | null) => dispatch({ type: 'SET_TIROIRS_HAUTEUR', id, value }), []);
  const setEtagerePos = useCallback((id: string, index: number, value: number | null) => dispatch({ type: 'SET_ETAGERE_POS', id, index, value }), []);
  const setPlintheMaterial = useCallback((index: number | null) => dispatch({ type: 'SET_PLINTHE_MATERIAL', index }), []);
  const setLineaireMax = useCallback((value: number | null) => dispatch({ type: 'SET_LINEAIRE_MAX', value }), []);
  const setFacadeMaterial = useCallback((id: string, index: number | null) => dispatch({ type: 'SET_FACADE_MATERIAL', id, index }), []);
  const setInterieurMaterial = useCallback((id: string, index: number | null) => dispatch({ type: 'SET_INTERIEUR_MATERIAL', id, index }), []);
  const setFusion = useCallback((id: string, value: boolean) => dispatch({ type: 'SET_FUSION', id, value }), []);
  const setBandeau = useCallback((id: string, value: boolean) => dispatch({ type: 'SET_BANDEAU', id, value }), []);
  const setBandeauHauteur = useCallback((id: string, value: number | null) => dispatch({ type: 'SET_BANDEAU_HAUTEUR', id, value }), []);
  const setGrille = useCallback((id: string, value: { colonnes: number; etageresParColonne: number[] } | null) => dispatch({ type: 'SET_GRILLE', id, value }), []);
  const setGrilleColonnes = useCallback((id: string, value: number) => dispatch({ type: 'SET_GRILLE_COLONNES', id, value }), []);
  const setGrilleEtageres = useCallback((id: string, col: number, value: number) => dispatch({ type: 'SET_GRILLE_ETAGERES', id, col, value }), []);
  const setEmpile = useCallback((id: string, baseId: string | null) => dispatch({ type: 'SET_EMPILE', id, baseId }), []);
  const setEmpileOffset = useCallback((id: string, value: number) => dispatch({ type: 'SET_EMPILE_OFFSET', id, value }), []);
  const setHauteurPlafond = useCallback((value: number) => dispatch({ type: 'SET_HAUTEUR_PLAFOND', value }), []);
  const setStyleFacade = useCallback((id: string, value: StyleFacade) => dispatch({ type: 'SET_STYLE_FACADE', id, value }), []);
  const setModuleMur = useCallback((id: string, value: 'principal' | 'retour_gauche' | 'retour_droit') => dispatch({ type: 'SET_MODULE_MUR', id, value }), []);
  const swapModules = useCallback((idA: string, idB: string) => dispatch({ type: 'SWAP_MODULES', idA, idB }), []);
  const setPoigneeFinition = useCallback((value: PoigneeFinition) => dispatch({ type: 'SET_POIGNEE_FINITION', value }), []);
  const setLedTemp = useCallback((value: 'chaud' | 'neutre') => dispatch({ type: 'SET_LED_TEMP', value }), []);
  const applyMaterialAll = useCallback((index: number) => dispatch({ type: 'APPLY_MATERIAL_ALL', index }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const load = useCallback((config: CompositionConfig) => dispatch({ type: 'LOAD', config }), []);

  return {
    config: state.config,
    selectedId: state.selectedId,
    dirty: state.dirty,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
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
    setPlanChant,
    setPlanDims,
    setModuleEcart,
    setTiroirsHauteur,
    setEtagerePos,
    setPlintheMaterial,
    setLineaireMax,
    setFacadeMaterial,
    setInterieurMaterial,
    setFusion,
    setBandeau,
    setBandeauHauteur,
    setGrille,
    setGrilleColonnes,
    setGrilleEtageres,
    setEmpile,
    setEmpileOffset,
    setHauteurPlafond,
    setStyleFacade,
    setModuleMur,
    swapModules,
    setPoigneeFinition,
    setLedTemp,
    applyMaterialAll,
    undo,
    redo,
    load,
  };
}
