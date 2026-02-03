'use client';

import { useReducer, useCallback, useMemo } from 'react';
import type {
  ConfiguratorConfig, MeubleConfig, PlancheConfig, CuisineConfig,
  ProductType, Cabinet, FurnitureModule, PlancheBoard,
  KitchenCabinetItem, KitchenWall, CountertopConfig,
  HardwareSelection, FinishSelection, WizardState, WizardStepDef, PriceBreakdown,
} from '@/lib/types';
import { MEUBLE_TEMPLATES, MODULES_CATALOG, KITCHEN_STANDARDS } from '@/lib/constants';
import { calculatePrice } from './pricing';

// --- Step definitions per product type ---

const MEUBLE_STEPS: WizardStepDef[] = [
  { key: 'type', label: 'Type de produit' },
  { key: 'template', label: 'Modele' },
  { key: 'structure', label: 'Structure' },
  { key: 'modules', label: 'Amenagement' },
  { key: 'materials', label: 'Materiaux' },
  { key: 'hardware', label: 'Quincaillerie' },
  { key: 'recap', label: 'Recapitulatif' },
];

const PLANCHE_STEPS: WizardStepDef[] = [
  { key: 'type', label: 'Type de produit' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'materials', label: 'Materiaux' },
  { key: 'edges', label: 'Chants & Finitions' },
  { key: 'recap', label: 'Recapitulatif' },
];

const CUISINE_STEPS: WizardStepDef[] = [
  { key: 'type', label: 'Type de produit' },
  { key: 'layout', label: 'Forme' },
  { key: 'base', label: 'Elements bas' },
  { key: 'wall', label: 'Elements hauts' },
  { key: 'countertop', label: 'Plan de travail' },
  { key: 'facades', label: 'Facades' },
  { key: 'hardware', label: 'Quincaillerie' },
  { key: 'recap', label: 'Recapitulatif' },
];

export function getStepsForProduct(productType: ProductType): WizardStepDef[] {
  switch (productType) {
    case 'meuble': return MEUBLE_STEPS;
    case 'planche': return PLANCHE_STEPS;
    case 'cuisine': return CUISINE_STEPS;
  }
}

// --- Default configs ---

function defaultMeubleConfig(): MeubleConfig {
  return {
    productType: 'meuble',
    name: 'Mon Meuble',
    template: 'sur_mesure',
    material: 'chene',
    cabinets: [{ id: 1, width: 800, height: 2200, depth: 600, thickness: 18, position: { x: 0, y: 0, z: 0 }, modules: [] }],
    globalHandle: 'moderne',
    hardware: { hingeType: 'standard', drawerSlideType: 'standard', shelfSupportType: 'pins' },
    finish: { edgeBanding: 'none', finish: 'brut' },
    showDimensions: true,
    exploded: false,
  };
}

function defaultPlancheConfig(): PlancheConfig {
  return {
    productType: 'planche',
    name: 'Ma Planche',
    material: 'chene',
    boards: [{ id: 1, length: 800, width: 400, thickness: 18, quantity: 1, edgeBanding: { top: 'none', bottom: 'none', left: 'none', right: 'none' } }],
    finish: { edgeBanding: 'none', finish: 'brut' },
  };
}

function defaultCuisineConfig(): CuisineConfig {
  return {
    productType: 'cuisine',
    name: 'Ma Cuisine',
    layout: 'L',
    walls: [
      { id: 1, length: 3000, angle: 0, startX: 0, startY: 0 },
      { id: 2, length: 2000, angle: 90, startX: 3000, startY: 0 },
    ],
    baseCabinets: [],
    wallCabinets: [],
    tallCabinets: [],
    countertop: { material: 'stratifie_chene', thickness: 38, overhang: 30, backsplashHeight: 0 },
    facadeMaterial: 'blanc',
    carcassMaterial: 'blanc',
    globalHandle: 'moderne',
    hardware: { hingeType: 'soft_close', drawerSlideType: 'soft_close', shelfSupportType: 'pins' },
    finish: { edgeBanding: 'abs_1mm', finish: 'brut' },
  };
}

export function defaultConfigForType(productType: ProductType): ConfiguratorConfig {
  switch (productType) {
    case 'meuble': return defaultMeubleConfig();
    case 'planche': return defaultPlancheConfig();
    case 'cuisine': return defaultCuisineConfig();
  }
}

// --- Helper ---

function recalculateCabinetPositions(cabinets: Cabinet[]): Cabinet[] {
  let xOffset = 0;
  return cabinets.map((cab) => {
    const updated = { ...cab, position: { ...cab.position, x: xOffset } };
    xOffset += cab.width;
    return updated;
  });
}

function nextModulePosition(cabinet: Cabinet): number {
  if (cabinet.modules.length === 0) return cabinet.thickness + 50;
  const last = cabinet.modules[cabinet.modules.length - 1];
  return last.position + (last.height || 200) + 20;
}

// --- Actions ---

type Action =
  // Navigation
  | { type: 'GOTO_STEP'; step: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  // Product type
  | { type: 'SET_PRODUCT_TYPE'; productType: ProductType }
  | { type: 'SET_NAME'; name: string }
  // Meuble
  | { type: 'SET_TEMPLATE'; template: string }
  | { type: 'SET_MATERIAL'; material: string }
  | { type: 'SET_HANDLE'; handle: string }
  | { type: 'ADD_CABINET' }
  | { type: 'REMOVE_CABINET'; cabinetId: number }
  | { type: 'UPDATE_CABINET'; cabinetId: number; updates: Partial<Cabinet> }
  | { type: 'ADD_MODULE'; cabinetId: number; moduleType: string }
  | { type: 'REMOVE_MODULE'; cabinetId: number; moduleId: number }
  | { type: 'MOVE_MODULE'; cabinetId: number; moduleId: number; newPosition: number }
  | { type: 'TOGGLE_EXPLODED' }
  | { type: 'TOGGLE_DIMENSIONS' }
  // Planche
  | { type: 'ADD_BOARD' }
  | { type: 'REMOVE_BOARD'; boardId: number }
  | { type: 'UPDATE_BOARD'; boardId: number; updates: Partial<PlancheBoard> }
  | { type: 'SET_BOARD_EDGE'; boardId: number; side: 'top' | 'bottom' | 'left' | 'right'; value: string }
  // Cuisine
  | { type: 'SET_LAYOUT'; layout: CuisineConfig['layout'] }
  | { type: 'UPDATE_WALL'; wallId: number; updates: Partial<KitchenWall> }
  | { type: 'ADD_KITCHEN_CABINET'; zone: 'base' | 'wall' | 'tall'; catalogKey: string; width: number; wallId: number }
  | { type: 'REMOVE_KITCHEN_CABINET'; zone: 'base' | 'wall' | 'tall'; cabinetId: number }
  | { type: 'UPDATE_KITCHEN_CABINET'; zone: 'base' | 'wall' | 'tall'; cabinetId: number; updates: Partial<KitchenCabinetItem> }
  | { type: 'SET_COUNTERTOP'; updates: Partial<CountertopConfig> }
  | { type: 'SET_FACADE_MATERIAL'; material: string }
  | { type: 'SET_CARCASS_MATERIAL'; material: string }
  // Shared hardware / finish
  | { type: 'SET_HARDWARE'; updates: Partial<HardwareSelection> }
  | { type: 'SET_FINISH'; updates: Partial<FinishSelection> }
  // Load
  | { type: 'LOAD_STATE'; state: WizardState };

const initialState: WizardState = {
  currentStep: 0,
  maxReachedStep: 0,
  config: defaultMeubleConfig(),
  isDirty: false,
  projectId: null,
};

function getMaxStep(config: ConfiguratorConfig): number {
  return getStepsForProduct(config.productType).length - 1;
}

function reducer(state: WizardState, action: Action): WizardState {
  const markDirty = (s: WizardState): WizardState => ({ ...s, isDirty: true });

  switch (action.type) {
    case 'GOTO_STEP': {
      if (action.step < 0 || action.step > getMaxStep(state.config)) return state;
      if (action.step > state.maxReachedStep) return state;
      return { ...state, currentStep: action.step };
    }
    case 'NEXT_STEP': {
      const next = Math.min(state.currentStep + 1, getMaxStep(state.config));
      return { ...state, currentStep: next, maxReachedStep: Math.max(state.maxReachedStep, next) };
    }
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };

    case 'SET_PRODUCT_TYPE': {
      const config = defaultConfigForType(action.productType);
      return { ...state, config, currentStep: 1, maxReachedStep: 1, isDirty: false };
    }

    case 'SET_NAME': {
      const config = { ...state.config, name: action.name };
      return markDirty({ ...state, config });
    }

    // Meuble actions
    case 'SET_TEMPLATE': {
      if (state.config.productType !== 'meuble') return state;
      const tpl = MEUBLE_TEMPLATES[action.template];
      if (!tpl) return state;
      const cabinets = tpl.cabinets.map((c) => ({ ...c, modules: [] as FurnitureModule[] }));
      const config: MeubleConfig = { ...state.config, template: action.template, cabinets };
      return markDirty({ ...state, config });
    }

    case 'SET_MATERIAL': {
      const config = { ...state.config, material: action.material };
      return markDirty({ ...state, config });
    }

    case 'SET_HANDLE': {
      if (state.config.productType !== 'meuble' && state.config.productType !== 'cuisine') return state;
      const config = { ...state.config, globalHandle: action.handle };
      return markDirty({ ...state, config });
    }

    case 'ADD_CABINET': {
      if (state.config.productType !== 'meuble') return state;
      const cfg = state.config;
      const lastCab = cfg.cabinets[cfg.cabinets.length - 1];
      const newId = Math.max(...cfg.cabinets.map((c) => c.id), 0) + 1;
      const newCab: Cabinet = {
        id: newId, width: 800, height: lastCab ? lastCab.height : 2200,
        depth: lastCab ? lastCab.depth : 600, thickness: 18,
        position: { x: 0, y: 0, z: 0 }, modules: [],
      };
      const cabinets = recalculateCabinetPositions([...cfg.cabinets, newCab]);
      return markDirty({ ...state, config: { ...cfg, cabinets } });
    }

    case 'REMOVE_CABINET': {
      if (state.config.productType !== 'meuble') return state;
      const cfg = state.config;
      if (cfg.cabinets.length <= 1) return state;
      const cabinets = recalculateCabinetPositions(cfg.cabinets.filter((c) => c.id !== action.cabinetId));
      return markDirty({ ...state, config: { ...cfg, cabinets } });
    }

    case 'UPDATE_CABINET': {
      if (state.config.productType !== 'meuble') return state;
      const cfg = state.config;
      const cabinets = recalculateCabinetPositions(
        cfg.cabinets.map((c) => c.id === action.cabinetId ? { ...c, ...action.updates } : c)
      );
      return markDirty({ ...state, config: { ...cfg, cabinets } });
    }

    case 'ADD_MODULE': {
      if (state.config.productType !== 'meuble') return state;
      const cfg = state.config;
      const catalog = MODULES_CATALOG[action.moduleType];
      if (!catalog) return state;
      const cabinets = cfg.cabinets.map((c) => {
        if (c.id !== action.cabinetId) return c;
        const mod: FurnitureModule = {
          id: Date.now() + Math.random(),
          type: action.moduleType as FurnitureModule['type'],
          position: nextModulePosition(c),
          width: c.width - c.thickness * 2 - 10,
          height: catalog.height,
        };
        return { ...c, modules: [...c.modules, mod] };
      });
      return markDirty({ ...state, config: { ...cfg, cabinets } });
    }

    case 'REMOVE_MODULE': {
      if (state.config.productType !== 'meuble') return state;
      const cfg = state.config;
      const cabinets = cfg.cabinets.map((c) => {
        if (c.id !== action.cabinetId) return c;
        return { ...c, modules: c.modules.filter((m) => m.id !== action.moduleId) };
      });
      return markDirty({ ...state, config: { ...cfg, cabinets } });
    }

    case 'MOVE_MODULE': {
      if (state.config.productType !== 'meuble') return state;
      const cfg = state.config;
      const cabinets = cfg.cabinets.map((c) => {
        if (c.id !== action.cabinetId) return c;
        return { ...c, modules: c.modules.map((m) => m.id === action.moduleId ? { ...m, position: action.newPosition } : m) };
      });
      return markDirty({ ...state, config: { ...cfg, cabinets } });
    }

    case 'TOGGLE_EXPLODED': {
      if (state.config.productType !== 'meuble') return state;
      return { ...state, config: { ...state.config, exploded: !state.config.exploded } };
    }

    case 'TOGGLE_DIMENSIONS': {
      if (state.config.productType !== 'meuble') return state;
      return { ...state, config: { ...state.config, showDimensions: !state.config.showDimensions } };
    }

    // Planche actions
    case 'ADD_BOARD': {
      if (state.config.productType !== 'planche') return state;
      const cfg = state.config;
      const newId = Math.max(...cfg.boards.map((b) => b.id), 0) + 1;
      const board: PlancheBoard = {
        id: newId, length: 800, width: 400, thickness: 18, quantity: 1,
        edgeBanding: { top: 'none', bottom: 'none', left: 'none', right: 'none' },
      };
      return markDirty({ ...state, config: { ...cfg, boards: [...cfg.boards, board] } });
    }

    case 'REMOVE_BOARD': {
      if (state.config.productType !== 'planche') return state;
      const cfg = state.config;
      if (cfg.boards.length <= 1) return state;
      return markDirty({ ...state, config: { ...cfg, boards: cfg.boards.filter((b) => b.id !== action.boardId) } });
    }

    case 'UPDATE_BOARD': {
      if (state.config.productType !== 'planche') return state;
      const cfg = state.config;
      const boards = cfg.boards.map((b) => b.id === action.boardId ? { ...b, ...action.updates } : b);
      return markDirty({ ...state, config: { ...cfg, boards } });
    }

    case 'SET_BOARD_EDGE': {
      if (state.config.productType !== 'planche') return state;
      const cfg = state.config;
      const boards = cfg.boards.map((b) => {
        if (b.id !== action.boardId) return b;
        return { ...b, edgeBanding: { ...b.edgeBanding, [action.side]: action.value } };
      });
      return markDirty({ ...state, config: { ...cfg, boards } });
    }

    // Cuisine actions
    case 'SET_LAYOUT': {
      if (state.config.productType !== 'cuisine') return state;
      const cfg = state.config;
      let walls: KitchenWall[];
      switch (action.layout) {
        case 'I':
          walls = [{ id: 1, length: 3600, angle: 0, startX: 0, startY: 0 }];
          break;
        case 'L':
          walls = [
            { id: 1, length: 3000, angle: 0, startX: 0, startY: 0 },
            { id: 2, length: 2000, angle: 90, startX: 3000, startY: 0 },
          ];
          break;
        case 'U':
          walls = [
            { id: 1, length: 2400, angle: 0, startX: 0, startY: 0 },
            { id: 2, length: 2000, angle: 90, startX: 2400, startY: 0 },
            { id: 3, length: 2400, angle: 180, startX: 2400, startY: 2000 },
          ];
          break;
        case 'island':
          walls = [
            { id: 1, length: 3600, angle: 0, startX: 0, startY: 0 },
            { id: 2, length: 1800, angle: 0, startX: 900, startY: 1500 },
          ];
          break;
        default:
          walls = cfg.walls;
      }
      return markDirty({ ...state, config: { ...cfg, layout: action.layout, walls, baseCabinets: [], wallCabinets: [], tallCabinets: [] } });
    }

    case 'UPDATE_WALL': {
      if (state.config.productType !== 'cuisine') return state;
      const cfg = state.config;
      const walls = cfg.walls.map((w) => w.id === action.wallId ? { ...w, ...action.updates } : w);
      return markDirty({ ...state, config: { ...cfg, walls } });
    }

    case 'ADD_KITCHEN_CABINET': {
      if (state.config.productType !== 'cuisine') return state;
      const cfg = state.config;
      const zoneKey = action.zone === 'base' ? 'baseCabinets' : action.zone === 'wall' ? 'wallCabinets' : 'tallCabinets';
      const existing = cfg[zoneKey];
      const newId = existing.length > 0 ? Math.max(...existing.map((c) => c.id)) + 1 : 1;
      // Calculate position on wall
      const wallCabs = existing.filter((c) => c.wallId === action.wallId);
      const posOnWall = wallCabs.reduce((sum, c) => sum + c.width, 0);
      const newCab: KitchenCabinetItem = {
        id: newId, catalogKey: action.catalogKey, width: action.width,
        wallId: action.wallId, positionOnWall: posOnWall,
      };
      return markDirty({ ...state, config: { ...cfg, [zoneKey]: [...existing, newCab] } });
    }

    case 'REMOVE_KITCHEN_CABINET': {
      if (state.config.productType !== 'cuisine') return state;
      const cfg = state.config;
      const zoneKey = action.zone === 'base' ? 'baseCabinets' : action.zone === 'wall' ? 'wallCabinets' : 'tallCabinets';
      return markDirty({ ...state, config: { ...cfg, [zoneKey]: cfg[zoneKey].filter((c) => c.id !== action.cabinetId) } });
    }

    case 'UPDATE_KITCHEN_CABINET': {
      if (state.config.productType !== 'cuisine') return state;
      const cfg = state.config;
      const zoneKey = action.zone === 'base' ? 'baseCabinets' : action.zone === 'wall' ? 'wallCabinets' : 'tallCabinets';
      const items = cfg[zoneKey].map((c) => c.id === action.cabinetId ? { ...c, ...action.updates } : c);
      return markDirty({ ...state, config: { ...cfg, [zoneKey]: items } });
    }

    case 'SET_COUNTERTOP': {
      if (state.config.productType !== 'cuisine') return state;
      const cfg = state.config;
      return markDirty({ ...state, config: { ...cfg, countertop: { ...cfg.countertop, ...action.updates } } });
    }

    case 'SET_FACADE_MATERIAL': {
      if (state.config.productType !== 'cuisine') return state;
      return markDirty({ ...state, config: { ...state.config, facadeMaterial: action.material } });
    }

    case 'SET_CARCASS_MATERIAL': {
      if (state.config.productType !== 'cuisine') return state;
      return markDirty({ ...state, config: { ...state.config, carcassMaterial: action.material } });
    }

    // Shared
    case 'SET_HARDWARE': {
      if (state.config.productType === 'planche') return state;
      const cfg = state.config as MeubleConfig | CuisineConfig;
      return markDirty({ ...state, config: { ...cfg, hardware: { ...cfg.hardware, ...action.updates } } });
    }

    case 'SET_FINISH': {
      const config = state.config;
      if (config.productType === 'meuble' || config.productType === 'cuisine') {
        return markDirty({ ...state, config: { ...config, finish: { ...config.finish, ...action.updates } } });
      }
      if (config.productType === 'planche') {
        return markDirty({ ...state, config: { ...config, finish: { ...config.finish, ...action.updates } } });
      }
      return state;
    }

    case 'LOAD_STATE':
      return action.state;

    default:
      return state;
  }
}

export function useConfiguratorWizard(initial?: WizardState) {
  const [state, dispatch] = useReducer(reducer, initial || initialState);

  const steps = useMemo(() => getStepsForProduct(state.config.productType), [state.config.productType]);
  const price = useMemo(() => calculatePrice(state.config), [state.config]);

  return { state, dispatch, steps, price };
}
