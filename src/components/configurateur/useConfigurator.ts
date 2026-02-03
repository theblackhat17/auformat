'use client';

import { useReducer, useCallback, useMemo } from 'react';
import type { FurnitureConfig, Cabinet, FurnitureModule } from '@/lib/types';
import { WOOD_MATERIALS, MODULES_CATALOG, HARDWARE_COST, TAX_RATE } from '@/lib/constants';

// Actions
type Action =
  | { type: 'SET_MATERIAL'; material: string }
  | { type: 'SET_HANDLE'; handle: string }
  | { type: 'SET_NAME'; name: string }
  | { type: 'ADD_CABINET' }
  | { type: 'REMOVE_CABINET'; cabinetId: number }
  | { type: 'UPDATE_CABINET'; cabinetId: number; updates: Partial<Cabinet> }
  | { type: 'ADD_MODULE'; cabinetId: number; moduleType: string }
  | { type: 'REMOVE_MODULE'; cabinetId: number; moduleId: number }
  | { type: 'MOVE_MODULE'; cabinetId: number; moduleId: number; newPosition: number }
  | { type: 'SELECT_TEMPLATE'; template: string }
  | { type: 'TOGGLE_EXPLODED' }
  | { type: 'LOAD_CONFIG'; config: FurnitureConfig };

const defaultCabinet: Cabinet = {
  id: 1,
  width: 800,
  height: 2200,
  depth: 600,
  thickness: 18,
  position: { x: 0, y: 0, z: 0 },
  modules: [],
};

const initialState: FurnitureConfig = {
  template: 'custom',
  material: 'chene',
  name: 'Mon Meuble',
  cabinets: [{ ...defaultCabinet }],
  globalHandle: 'moderne',
  showDimensions: true,
  exploded: false,
};

function calculateNextModulePosition(cabinet: Cabinet): number {
  if (cabinet.modules.length === 0) {
    return cabinet.thickness + 50;
  }
  const lastModule = cabinet.modules[cabinet.modules.length - 1];
  return lastModule.position + (lastModule.height || 200) + 20;
}

function recalculateCabinetPositions(cabinets: Cabinet[]): Cabinet[] {
  let xOffset = 0;
  return cabinets.map((cab) => {
    const updated = { ...cab, position: { ...cab.position, x: xOffset } };
    xOffset += cab.width;
    return updated;
  });
}

function reducer(state: FurnitureConfig, action: Action): FurnitureConfig {
  switch (action.type) {
    case 'SET_MATERIAL':
      return { ...state, material: action.material };

    case 'SET_HANDLE':
      return { ...state, globalHandle: action.handle };

    case 'SET_NAME':
      return { ...state, name: action.name };

    case 'ADD_CABINET': {
      const lastCabinet = state.cabinets[state.cabinets.length - 1];
      const newId = Math.max(...state.cabinets.map((c) => c.id), 0) + 1;
      const newCabinet: Cabinet = {
        id: newId,
        width: 800,
        height: lastCabinet?.height ?? 2200,
        depth: lastCabinet?.depth ?? 600,
        thickness: 18,
        position: { x: 0, y: 0, z: 0 },
        modules: [],
      };
      const cabinets = recalculateCabinetPositions([...state.cabinets, newCabinet]);
      return { ...state, cabinets };
    }

    case 'REMOVE_CABINET': {
      if (state.cabinets.length <= 1) return state;
      const filtered = state.cabinets.filter((c) => c.id !== action.cabinetId);
      return { ...state, cabinets: recalculateCabinetPositions(filtered) };
    }

    case 'UPDATE_CABINET': {
      const cabinets = state.cabinets.map((c) =>
        c.id === action.cabinetId ? { ...c, ...action.updates } : c
      );
      return { ...state, cabinets: recalculateCabinetPositions(cabinets) };
    }

    case 'ADD_MODULE': {
      const catalog = MODULES_CATALOG[action.moduleType];
      if (!catalog) return state;

      const cabinets = state.cabinets.map((c) => {
        if (c.id !== action.cabinetId) return c;
        const newModule: FurnitureModule = {
          id: Date.now() + Math.random(),
          type: action.moduleType as FurnitureModule['type'],
          position: calculateNextModulePosition(c),
          width: c.width - c.thickness * 2 - 10,
          height: catalog.height,
        };
        return { ...c, modules: [...c.modules, newModule] };
      });
      return { ...state, cabinets };
    }

    case 'REMOVE_MODULE': {
      const cabinets = state.cabinets.map((c) => {
        if (c.id !== action.cabinetId) return c;
        return { ...c, modules: c.modules.filter((m) => m.id !== action.moduleId) };
      });
      return { ...state, cabinets };
    }

    case 'MOVE_MODULE': {
      const cabinets = state.cabinets.map((c) => {
        if (c.id !== action.cabinetId) return c;
        const modules = c.modules.map((m) =>
          m.id === action.moduleId ? { ...m, position: action.newPosition } : m
        );
        return { ...c, modules };
      });
      return { ...state, cabinets };
    }

    case 'SELECT_TEMPLATE': {
      let cabinets: Cabinet[];
      switch (action.template) {
        case 'wardrobe':
          cabinets = [
            { id: 1, width: 1000, height: 2400, depth: 600, thickness: 18, position: { x: 0, y: 0, z: 0 }, modules: [] },
            { id: 2, width: 800, height: 2400, depth: 600, thickness: 18, position: { x: 1000, y: 0, z: 0 }, modules: [] },
            { id: 3, width: 1000, height: 2400, depth: 600, thickness: 18, position: { x: 1800, y: 0, z: 0 }, modules: [] },
          ];
          break;
        case 'kitchen-base':
          cabinets = [
            { id: 1, width: 800, height: 720, depth: 580, thickness: 18, position: { x: 0, y: 0, z: 0 }, modules: [] },
          ];
          break;
        default:
          cabinets = [
            { id: 1, width: 800, height: 2200, depth: 600, thickness: 18, position: { x: 0, y: 0, z: 0 }, modules: [] },
          ];
      }
      return { ...state, template: action.template, cabinets };
    }

    case 'TOGGLE_EXPLODED':
      return { ...state, exploded: !state.exploded };

    case 'LOAD_CONFIG':
      return { ...action.config };

    default:
      return state;
  }
}

export interface PriceBreakdown {
  materialCost: number;
  modulesCost: number;
  hardwareCost: number;
  subtotalHt: number;
  tva: number;
  totalTtc: number;
}

export interface ConfiguratorStats {
  cabinetCount: number;
  moduleCount: number;
  totalWidth: number;
  volume: number;
}

export function useConfigurator(initial?: FurnitureConfig) {
  const [furniture, dispatch] = useReducer(reducer, initial ?? initialState);

  const price = useMemo((): PriceBreakdown => {
    let materialCost = 0;
    let modulesCost = 0;

    furniture.cabinets.forEach((cabinet) => {
      const w = cabinet.width / 1000;
      const h = cabinet.height / 1000;
      const d = cabinet.depth / 1000;
      const surface = w * h * 2 + h * d * 2 + w * d * 2;
      const mat = WOOD_MATERIALS[furniture.material];
      if (mat) materialCost += surface * mat.price;

      cabinet.modules.forEach((mod) => {
        const catalog = MODULES_CATALOG[mod.type];
        if (catalog) modulesCost += catalog.basePrice;
      });
    });

    const subtotalHt = materialCost + modulesCost + HARDWARE_COST;
    const tva = subtotalHt * TAX_RATE;
    const totalTtc = subtotalHt + tva;

    return { materialCost, modulesCost, hardwareCost: HARDWARE_COST, subtotalHt, tva, totalTtc };
  }, [furniture]);

  const stats = useMemo((): ConfiguratorStats => {
    const cabinetCount = furniture.cabinets.length;
    const moduleCount = furniture.cabinets.reduce((sum, c) => sum + c.modules.length, 0);
    const totalWidth = furniture.cabinets.reduce((sum, c) => sum + c.width, 0);
    const volume = furniture.cabinets.reduce(
      (sum, c) => sum + (c.width * c.height * c.depth) / 1_000_000,
      0
    );
    return { cabinetCount, moduleCount, totalWidth, volume: Math.round(volume) };
  }, [furniture]);

  const setMaterial = useCallback((m: string) => dispatch({ type: 'SET_MATERIAL', material: m }), []);
  const setHandle = useCallback((h: string) => dispatch({ type: 'SET_HANDLE', handle: h }), []);
  const setName = useCallback((n: string) => dispatch({ type: 'SET_NAME', name: n }), []);
  const addCabinet = useCallback(() => dispatch({ type: 'ADD_CABINET' }), []);
  const removeCabinet = useCallback((id: number) => dispatch({ type: 'REMOVE_CABINET', cabinetId: id }), []);
  const updateCabinet = useCallback(
    (id: number, updates: Partial<Cabinet>) => dispatch({ type: 'UPDATE_CABINET', cabinetId: id, updates }),
    []
  );
  const addModule = useCallback(
    (cabinetId: number, moduleType: string) => dispatch({ type: 'ADD_MODULE', cabinetId, moduleType }),
    []
  );
  const removeModule = useCallback(
    (cabinetId: number, moduleId: number) => dispatch({ type: 'REMOVE_MODULE', cabinetId, moduleId }),
    []
  );
  const moveModule = useCallback(
    (cabinetId: number, moduleId: number, newPosition: number) =>
      dispatch({ type: 'MOVE_MODULE', cabinetId, moduleId, newPosition }),
    []
  );
  const selectTemplate = useCallback((t: string) => dispatch({ type: 'SELECT_TEMPLATE', template: t }), []);
  const toggleExploded = useCallback(() => dispatch({ type: 'TOGGLE_EXPLODED' }), []);
  const loadConfig = useCallback((c: FurnitureConfig) => dispatch({ type: 'LOAD_CONFIG', config: c }), []);

  return {
    furniture,
    price,
    stats,
    setMaterial,
    setHandle,
    setName,
    addCabinet,
    removeCabinet,
    updateCabinet,
    addModule,
    removeModule,
    moveModule,
    selectTemplate,
    toggleExploded,
    loadConfig,
  };
}
