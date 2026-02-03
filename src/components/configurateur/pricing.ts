import type {
  ConfiguratorConfig, MeubleConfig, PlancheConfig, CuisineConfig,
  PriceBreakdown, PriceLineItem, Cabinet,
} from '@/lib/types';
import {
  WOOD_MATERIALS, MODULES_CATALOG, HANDLE_TYPES,
  HINGES_CATALOG, DRAWER_SLIDES_CATALOG, EDGE_BANDING_CATALOG,
  FINISHES_CATALOG, SHELF_SUPPORTS_CATALOG, COUNTERTOP_MATERIALS,
  KITCHEN_BASE_CABINETS, KITCHEN_WALL_CABINETS, KITCHEN_TALL_CABINETS,
  TAX_RATE,
} from '@/lib/constants';

// Helper: surface of a cabinet (all 5 panels) in m²
function cabinetSurface(c: Cabinet): number {
  const w = c.width / 1000;
  const h = c.height / 1000;
  const d = c.depth / 1000;
  // back + 2 sides + top + bottom
  return (w * h) + (d * h * 2) + (w * d * 2);
}

// Helper: perimeter of a rectangular board in meters
function boardPerimeter(lengthMm: number, widthMm: number): number {
  return ((lengthMm + widthMm) * 2) / 1000;
}

// Helper: surface of a board in m²
function boardSurface(lengthMm: number, widthMm: number): number {
  return (lengthMm * widthMm) / 1_000_000;
}

function calculateMeublePrice(config: MeubleConfig): PriceBreakdown {
  const lineItems: PriceLineItem[] = [];
  let materialCost = 0;
  let modulesCost = 0;
  let hardwareCost = 0;
  let edgeBandingCost = 0;
  let finishCost = 0;

  const mat = WOOD_MATERIALS[config.material];
  const pricePerSqm = mat ? mat.price : 40;

  // Material cost per cabinet
  config.cabinets.forEach((cab, i) => {
    const surface = cabinetSurface(cab);
    const cost = surface * pricePerSqm;
    materialCost += cost;
    lineItems.push({
      label: `Caisson ${i + 1} (${cab.width}x${cab.height}x${cab.depth}mm)`,
      quantity: 1, unitPrice: cost, total: cost, category: 'material',
    });

    // Modules
    cab.modules.forEach((mod) => {
      const catalog = MODULES_CATALOG[mod.type];
      if (catalog) {
        modulesCost += catalog.basePrice;
        lineItems.push({
          label: catalog.name, quantity: 1, unitPrice: catalog.basePrice,
          total: catalog.basePrice, category: 'module',
        });
      }
    });
  });

  // Hinges: count doors, 3 hinges per door
  const doorCount = config.cabinets.reduce(
    (sum, c) => sum + c.modules.filter((m) => m.type === 'porte').length, 0
  );
  if (doorCount > 0) {
    const hinge = HINGES_CATALOG[config.hardware.hingeType] || HINGES_CATALOG.standard;
    const hingeTotal = doorCount * 3 * hinge.price;
    hardwareCost += hingeTotal;
    lineItems.push({
      label: `${hinge.name} (${doorCount} portes x 3)`,
      quantity: doorCount * 3, unitPrice: hinge.price, total: hingeTotal, category: 'hardware',
    });
  }

  // Drawer slides: count drawers, 1 pair per drawer
  const drawerCount = config.cabinets.reduce(
    (sum, c) => sum + c.modules.filter((m) => m.type === 'tiroir').length, 0
  );
  if (drawerCount > 0) {
    const slide = DRAWER_SLIDES_CATALOG[config.hardware.drawerSlideType] || DRAWER_SLIDES_CATALOG.standard;
    const slideTotal = drawerCount * slide.pricePerPair;
    hardwareCost += slideTotal;
    lineItems.push({
      label: `${slide.name} (${drawerCount} tiroirs)`,
      quantity: drawerCount, unitPrice: slide.pricePerPair, total: slideTotal, category: 'hardware',
    });
  }

  // Shelf supports: count shelves, 1 set per shelf
  const shelfCount = config.cabinets.reduce(
    (sum, c) => sum + c.modules.filter((m) => m.type === 'etagere').length, 0
  );
  if (shelfCount > 0) {
    const support = SHELF_SUPPORTS_CATALOG[config.hardware.shelfSupportType] || SHELF_SUPPORTS_CATALOG.pins;
    const supportTotal = shelfCount * support.pricePerSet;
    hardwareCost += supportTotal;
    lineItems.push({
      label: `${support.name} (${shelfCount} etageres)`,
      quantity: shelfCount, unitPrice: support.pricePerSet, total: supportTotal, category: 'hardware',
    });
  }

  // Handle cost
  const handleCount = doorCount + drawerCount;
  if (handleCount > 0) {
    const handle = HANDLE_TYPES[config.globalHandle] || HANDLE_TYPES.moderne;
    const handleTotal = handleCount * handle.price;
    hardwareCost += handleTotal;
    lineItems.push({
      label: `Poignee ${handle.name} x${handleCount}`,
      quantity: handleCount, unitPrice: handle.price, total: handleTotal, category: 'hardware',
    });
  }

  // Edge banding: approximate perimeter of all visible edges
  const edgeBand = EDGE_BANDING_CATALOG[config.finish.edgeBanding] || EDGE_BANDING_CATALOG.none;
  if (edgeBand.pricePerMeter > 0) {
    let totalPerimeter = 0;
    config.cabinets.forEach((cab) => {
      // Approximate: 4 panels with visible edges (front edges of sides, top, bottom)
      totalPerimeter += ((cab.width + cab.height) * 2) / 1000;
    });
    edgeBandingCost = totalPerimeter * edgeBand.pricePerMeter;
    lineItems.push({
      label: `Chant ${edgeBand.name} (${totalPerimeter.toFixed(1)}m)`,
      quantity: 1, unitPrice: edgeBandingCost, total: edgeBandingCost, category: 'edge',
    });
  }

  // Finish
  const finish = FINISHES_CATALOG[config.finish.finish] || FINISHES_CATALOG.brut;
  if (finish.pricePerSqm > 0) {
    let totalSurface = 0;
    config.cabinets.forEach((cab) => {
      totalSurface += cabinetSurface(cab);
    });
    finishCost = totalSurface * finish.pricePerSqm;
    lineItems.push({
      label: `Finition ${finish.name} (${totalSurface.toFixed(1)} m²)`,
      quantity: 1, unitPrice: finishCost, total: finishCost, category: 'finish',
    });
  }

  const subtotalHt = materialCost + modulesCost + hardwareCost + edgeBandingCost + finishCost;
  const tva = subtotalHt * TAX_RATE;

  return {
    materialCost, modulesCost, hardwareCost, edgeBandingCost, finishCost,
    countertopCost: 0, subtotalHt, tva, totalTtc: subtotalHt + tva, lineItems,
  };
}

function calculatePlanchePrice(config: PlancheConfig): PriceBreakdown {
  const lineItems: PriceLineItem[] = [];
  let materialCost = 0;
  let edgeBandingCost = 0;
  let finishCost = 0;

  const mat = WOOD_MATERIALS[config.material];
  const pricePerSqm = mat ? mat.price : 40;

  config.boards.forEach((board, i) => {
    const surface = boardSurface(board.length, board.width);
    // Adjust price for thickness relative to standard 18mm
    const thicknessMultiplier = board.thickness / 18;
    const cost = surface * pricePerSqm * thicknessMultiplier * board.quantity;
    materialCost += cost;
    lineItems.push({
      label: `Planche ${i + 1} (${board.length}x${board.width}x${board.thickness}mm) x${board.quantity}`,
      quantity: board.quantity, unitPrice: cost / board.quantity, total: cost, category: 'material',
    });

    // Edge banding per side
    const sides: Array<{ key: keyof typeof board.edgeBanding; length: number }> = [
      { key: 'top', length: board.length },
      { key: 'bottom', length: board.length },
      { key: 'left', length: board.width },
      { key: 'right', length: board.width },
    ];
    sides.forEach(({ key, length }) => {
      const bandKey = board.edgeBanding[key];
      const band = EDGE_BANDING_CATALOG[bandKey];
      if (band && band.pricePerMeter > 0) {
        const edgeCost = (length / 1000) * band.pricePerMeter * board.quantity;
        edgeBandingCost += edgeCost;
        lineItems.push({
          label: `Chant ${band.name} - ${key} (${length}mm) x${board.quantity}`,
          quantity: board.quantity, unitPrice: edgeCost / board.quantity, total: edgeCost, category: 'edge',
        });
      }
    });
  });

  // Finish: applied on both faces
  const finish = FINISHES_CATALOG[config.finish.finish] || FINISHES_CATALOG.brut;
  if (finish.pricePerSqm > 0) {
    let totalSurface = 0;
    config.boards.forEach((board) => {
      totalSurface += boardSurface(board.length, board.width) * 2 * board.quantity; // 2 faces
    });
    finishCost = totalSurface * finish.pricePerSqm;
    lineItems.push({
      label: `Finition ${finish.name} (${totalSurface.toFixed(1)} m², 2 faces)`,
      quantity: 1, unitPrice: finishCost, total: finishCost, category: 'finish',
    });
  }

  const subtotalHt = materialCost + edgeBandingCost + finishCost;
  const tva = subtotalHt * TAX_RATE;

  return {
    materialCost, modulesCost: 0, hardwareCost: 0, edgeBandingCost, finishCost,
    countertopCost: 0, subtotalHt, tva, totalTtc: subtotalHt + tva, lineItems,
  };
}

function calculateCuisinePrice(config: CuisineConfig): PriceBreakdown {
  const lineItems: PriceLineItem[] = [];
  let modulesCost = 0;
  let hardwareCost = 0;
  let edgeBandingCost = 0;
  let finishCost = 0;
  let countertopCost = 0;
  let materialCost = 0;

  const allCabinets = [
    ...config.baseCabinets.map((c) => ({ ...c, catalog: KITCHEN_BASE_CABINETS })),
    ...config.wallCabinets.map((c) => ({ ...c, catalog: KITCHEN_WALL_CABINETS })),
    ...config.tallCabinets.map((c) => ({ ...c, catalog: KITCHEN_TALL_CABINETS })),
  ];

  let totalDoors = 0;
  let totalDrawers = 0;

  allCabinets.forEach((item) => {
    const catItem = item.catalog[item.catalogKey];
    if (!catItem) return;
    // Width surcharge: +20% if wider than default
    const widthRatio = item.width / catItem.defaultWidth;
    const price = catItem.basePrice * Math.max(1, widthRatio);
    modulesCost += price;
    lineItems.push({
      label: `${catItem.name} (${item.width}mm)`,
      quantity: 1, unitPrice: price, total: price, category: 'module',
    });
    if (catItem.hasDoor) totalDoors++;
    if (catItem.hasDrawer) totalDrawers++;
  });

  // Facade material surcharge
  const facadeMat = WOOD_MATERIALS[config.facadeMaterial];
  if (facadeMat && facadeMat.price > 30) {
    const surcharge = (facadeMat.price - 30) * allCabinets.length * 0.5;
    materialCost += surcharge;
    lineItems.push({
      label: `Supplement facade ${facadeMat.name}`,
      quantity: allCabinets.length, unitPrice: surcharge / allCabinets.length,
      total: surcharge, category: 'material',
    });
  }

  // Hinges
  if (totalDoors > 0) {
    const hinge = HINGES_CATALOG[config.hardware.hingeType] || HINGES_CATALOG.standard;
    const cost = totalDoors * 3 * hinge.price;
    hardwareCost += cost;
    lineItems.push({
      label: `${hinge.name} (${totalDoors} portes x 3)`,
      quantity: totalDoors * 3, unitPrice: hinge.price, total: cost, category: 'hardware',
    });
  }

  // Drawer slides
  if (totalDrawers > 0) {
    const slide = DRAWER_SLIDES_CATALOG[config.hardware.drawerSlideType] || DRAWER_SLIDES_CATALOG.standard;
    const cost = totalDrawers * slide.pricePerPair;
    hardwareCost += cost;
    lineItems.push({
      label: `${slide.name} (${totalDrawers} tiroirs)`,
      quantity: totalDrawers, unitPrice: slide.pricePerPair, total: cost, category: 'hardware',
    });
  }

  // Handles
  const handleCount = totalDoors + totalDrawers;
  if (handleCount > 0) {
    const handle = HANDLE_TYPES[config.globalHandle] || HANDLE_TYPES.moderne;
    const cost = handleCount * handle.price;
    hardwareCost += cost;
    lineItems.push({
      label: `Poignee ${handle.name} x${handleCount}`,
      quantity: handleCount, unitPrice: handle.price, total: cost, category: 'hardware',
    });
  }

  // Countertop
  const ctMat = COUNTERTOP_MATERIALS[config.countertop.material];
  if (ctMat) {
    // Calculate countertop length from base cabinets
    const totalLength = config.baseCabinets.reduce((sum, c) => sum + c.width, 0) / 1000;
    const depth = config.countertop.overhang > 0
      ? (580 + config.countertop.overhang) / 1000
      : 0.65;
    const surface = totalLength * depth;
    countertopCost = surface * ctMat.pricePerSqm;
    lineItems.push({
      label: `Plan de travail ${ctMat.name} (${surface.toFixed(2)} m²)`,
      quantity: 1, unitPrice: countertopCost, total: countertopCost, category: 'countertop',
    });

    // Backsplash
    if (config.countertop.backsplashHeight > 0) {
      const bsSurface = totalLength * (config.countertop.backsplashHeight / 1000);
      const bsCost = bsSurface * ctMat.pricePerSqm * 0.6;
      countertopCost += bsCost;
      lineItems.push({
        label: `Credence ${ctMat.name} (${bsSurface.toFixed(2)} m²)`,
        quantity: 1, unitPrice: bsCost, total: bsCost, category: 'countertop',
      });
    }
  }

  // Edge banding
  const edgeBand = EDGE_BANDING_CATALOG[config.finish.edgeBanding] || EDGE_BANDING_CATALOG.none;
  if (edgeBand.pricePerMeter > 0) {
    const totalPerimeter = allCabinets.length * 2; // approximate 2m per cabinet
    edgeBandingCost = totalPerimeter * edgeBand.pricePerMeter;
    lineItems.push({
      label: `Chant ${edgeBand.name} (${totalPerimeter.toFixed(1)}m)`,
      quantity: 1, unitPrice: edgeBandingCost, total: edgeBandingCost, category: 'edge',
    });
  }

  // Finish
  const finish = FINISHES_CATALOG[config.finish.finish] || FINISHES_CATALOG.brut;
  if (finish.pricePerSqm > 0) {
    const totalSurface = allCabinets.length * 1.5; // approximate 1.5m² per cabinet face
    finishCost = totalSurface * finish.pricePerSqm;
    lineItems.push({
      label: `Finition ${finish.name} (${totalSurface.toFixed(1)} m²)`,
      quantity: 1, unitPrice: finishCost, total: finishCost, category: 'finish',
    });
  }

  const subtotalHt = materialCost + modulesCost + hardwareCost + edgeBandingCost + finishCost + countertopCost;
  const tva = subtotalHt * TAX_RATE;

  return {
    materialCost, modulesCost, hardwareCost, edgeBandingCost, finishCost,
    countertopCost, subtotalHt, tva, totalTtc: subtotalHt + tva, lineItems,
  };
}

export function calculatePrice(config: ConfiguratorConfig): PriceBreakdown {
  switch (config.productType) {
    case 'meuble':
      return calculateMeublePrice(config);
    case 'planche':
      return calculatePlanchePrice(config);
    case 'cuisine':
      return calculateCuisinePrice(config);
  }
}
