import * as THREE from 'three';
import type { CuisineConfig, KitchenCabinetItem, KitchenWall } from '@/lib/types';
import { createWoodMaterial, createPanel, disposeGroup } from './three-shared';
import {
  KITCHEN_STANDARDS, KITCHEN_BASE_CABINETS, KITCHEN_WALL_CABINETS, KITCHEN_TALL_CABINETS,
  COUNTERTOP_MATERIALS,
} from '@/lib/constants';

function buildWalls(walls: KitchenWall[]): THREE.Group {
  const group = new THREE.Group();
  const wallHeight = 2600;
  const wallThickness = 80;

  walls.forEach((wall) => {
    const geo = new THREE.BoxGeometry(wall.length, wallHeight, wallThickness);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf0ede8, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;

    const angle = (wall.angle * Math.PI) / 180;
    const cx = wall.startX + (Math.cos(angle) * wall.length) / 2;
    const cy = wall.startY + (Math.sin(angle) * wall.length) / 2;

    mesh.position.set(cx, wallHeight / 2, cy);
    mesh.rotation.y = -angle;
    group.add(mesh);
  });

  return group;
}

function buildCabinetBox(
  width: number,
  height: number,
  depth: number,
  materialKey: string,
): THREE.Group {
  const group = new THREE.Group();
  const mat = createWoodMaterial(materialKey);
  const t = 18;

  // Back
  const back = createPanel(width, height, t, mat);
  back.position.set(0, height / 2, -depth / 2);
  group.add(back);

  // Sides
  const left = createPanel(t, height, depth, mat.clone());
  left.position.set(-width / 2 + t / 2, height / 2, 0);
  group.add(left);

  const right = createPanel(t, height, depth, mat.clone());
  right.position.set(width / 2 - t / 2, height / 2, 0);
  group.add(right);

  // Top
  const top = createPanel(width, t, depth, mat.clone());
  top.position.set(0, height - t / 2, 0);
  group.add(top);

  // Bottom
  const bottom = createPanel(width, t, depth, mat.clone());
  bottom.position.set(0, t / 2, 0);
  group.add(bottom);

  return group;
}

function placeCabinetsAlongWall(
  items: KitchenCabinetItem[],
  wall: KitchenWall,
  catalog: Record<string, { defaultHeight: number; defaultDepth: number }>,
  yOffset: number,
  materialKey: string,
): THREE.Group {
  const group = new THREE.Group();
  const angle = (wall.angle * Math.PI) / 180;

  items
    .filter((c) => c.wallId === wall.id)
    .forEach((cab) => {
      const catItem = catalog[cab.catalogKey];
      if (!catItem) return;

      const h = catItem.defaultHeight;
      const d = catItem.defaultDepth;
      const box = buildCabinetBox(cab.width, h, d, materialKey);

      const posAlongWall = cab.positionOnWall + cab.width / 2;
      const x = wall.startX + Math.cos(angle) * posAlongWall - Math.sin(angle) * (d / 2 + 40);
      const z = wall.startY + Math.sin(angle) * posAlongWall + Math.cos(angle) * (d / 2 + 40);

      box.position.set(x, yOffset, z);
      box.rotation.y = -angle;
      group.add(box);
    });

  return group;
}

function buildCountertop(config: CuisineConfig): THREE.Group {
  const group = new THREE.Group();
  const ctMat = COUNTERTOP_MATERIALS[config.countertop.material];
  const color = ctMat ? ctMat.color : 0xC9A96E;
  const t = config.countertop.thickness;
  const depth = KITCHEN_STANDARDS.countertopDepth;

  config.walls.forEach((wall) => {
    const baseCabs = config.baseCabinets.filter((c) => c.wallId === wall.id);
    if (baseCabs.length === 0) return;

    const totalWidth = baseCabs.reduce((s, c) => s + c.width, 0);
    const geo = new THREE.BoxGeometry(totalWidth, t, depth);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;

    const angle = (wall.angle * Math.PI) / 180;
    const posAlongWall = totalWidth / 2;
    const x = wall.startX + Math.cos(angle) * posAlongWall - Math.sin(angle) * (depth / 2 + 40);
    const z = wall.startY + Math.sin(angle) * posAlongWall + Math.cos(angle) * (depth / 2 + 40);

    mesh.position.set(x, KITCHEN_STANDARDS.baseHeight + KITCHEN_STANDARDS.kickHeight + t / 2, z);
    mesh.rotation.y = -angle;
    group.add(mesh);
  });

  return group;
}

export function rebuildCuisineScene(mainGroup: THREE.Group, config: CuisineConfig): void {
  disposeGroup(mainGroup);

  // Walls
  mainGroup.add(buildWalls(config.walls));

  const carcassMat = config.carcassMaterial;

  // Base cabinets
  config.walls.forEach((wall) => {
    const bases = placeCabinetsAlongWall(
      config.baseCabinets, wall, KITCHEN_BASE_CABINETS,
      KITCHEN_STANDARDS.kickHeight, carcassMat
    );
    mainGroup.add(bases);
  });

  // Wall cabinets
  config.walls.forEach((wall) => {
    const walls = placeCabinetsAlongWall(
      config.wallCabinets, wall, KITCHEN_WALL_CABINETS,
      KITCHEN_STANDARDS.wallCabinetBottom, carcassMat
    );
    mainGroup.add(walls);
  });

  // Tall cabinets
  config.walls.forEach((wall) => {
    const talls = placeCabinetsAlongWall(
      config.tallCabinets, wall, KITCHEN_TALL_CABINETS,
      0, carcassMat
    );
    mainGroup.add(talls);
  });

  // Countertop
  mainGroup.add(buildCountertop(config));
}

export function centerCuisineCamera(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  config: CuisineConfig
): void {
  const maxX = Math.max(...config.walls.map((w) => w.startX + w.length), 3000);
  const maxY = Math.max(...config.walls.map((w) => w.startY + w.length), 2000);

  controls.target.set(maxX / 2, 1000, maxY / 2);
  camera.position.set(maxX + 1500, 2500, maxY + 1500);
  controls.update();
}
