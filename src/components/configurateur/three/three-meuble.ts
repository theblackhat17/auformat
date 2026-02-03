import * as THREE from 'three';
import type { FurnitureConfig, Cabinet, FurnitureModule } from '@/lib/types';
import {
  createWoodMaterial,
  createModuleMaterial,
  createPanel,
  disposeGroup,
} from './three-shared';

// ============================================
// HANDLE HELPER
// ============================================

function addHandle(parent: THREE.Mesh, _handleKey: string): void {
  const handleGeo = new THREE.BoxGeometry(100, 15, 15);
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x666666,
    metalness: 0.9,
    roughness: 0.1,
  });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  const params = (parent.geometry as THREE.BoxGeometry).parameters;
  handle.position.set(params.width / 3, 0, 20);
  parent.add(handle);
}

// ============================================
// MODULE BUILDER
// ============================================

export function buildModule(
  mod: FurnitureModule,
  cabinet: Cabinet,
  parentGroup: THREE.Group,
  materialKey: string,
  handleKey: string
): void {
  const moduleMat = createModuleMaterial(materialKey);
  const w = cabinet.width - cabinet.thickness * 2 - 10;
  const d = cabinet.depth - cabinet.thickness - 10;

  switch (mod.type) {
    case 'etagere': {
      const shelf = createPanel(w, 18, d, moduleMat);
      shelf.position.set(0, mod.position, d / 2 - cabinet.depth / 2 + 5);
      shelf.userData.moduleData = mod;
      parentGroup.add(shelf);
      break;
    }

    case 'tiroir': {
      const drawerHeight = mod.height || 150;
      const drawer = createPanel(w, drawerHeight, d, moduleMat);
      drawer.position.set(0, mod.position + drawerHeight / 2, cabinet.depth / 2 + 2);
      drawer.userData.moduleData = mod;
      parentGroup.add(drawer);
      addHandle(drawer, handleKey);
      break;
    }

    case 'penderie': {
      const rodRadius = 15;
      const rodLength = w - 100;
      const rodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodLength, 16);
      const rodMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.8,
        roughness: 0.2,
      });
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, mod.position, 0);
      rod.userData.moduleData = mod;
      parentGroup.add(rod);
      break;
    }

    case 'niche': {
      // Niche is just empty space - add subtle edge indicators
      const nicheHeight = mod.height || 300;
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, nicheHeight, d));
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.4 });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.position.set(0, mod.position + nicheHeight / 2, d / 2 - cabinet.depth / 2 + 5);
      edges.userData.moduleData = mod;
      parentGroup.add(edges);
      break;
    }

    case 'porte': {
      const doorWidth = mod.width || w;
      const doorHeight = mod.height || cabinet.height - 36;
      const door = createPanel(doorWidth, doorHeight, 18, moduleMat);
      door.position.set(mod.offsetX || 0, doorHeight / 2 + 18, cabinet.depth / 2 + 10);
      door.userData.moduleData = mod;
      parentGroup.add(door);
      addHandle(door, handleKey);
      break;
    }
  }
}

// ============================================
// CABINET BUILDER
// ============================================

export function buildCabinet(
  cabinet: Cabinet,
  materialKey: string,
  handleKey: string
): THREE.Group {
  const group = new THREE.Group();
  group.userData.cabinetId = cabinet.id;

  const w = cabinet.width;
  const h = cabinet.height;
  const d = cabinet.depth;
  const t = cabinet.thickness;

  const material = createWoodMaterial(materialKey);

  // Back panel
  const back = createPanel(w, h, t, material);
  back.position.set(0, h / 2, -d / 2);
  group.add(back);

  // Left side
  const left = createPanel(t, h, d, material);
  left.position.set(-w / 2 + t / 2, h / 2, 0);
  group.add(left);

  // Right side
  const right = createPanel(t, h, d, material.clone());
  right.position.set(w / 2 - t / 2, h / 2, 0);
  group.add(right);

  // Top panel
  const top = createPanel(w, t, d, material.clone());
  top.position.set(0, h - t / 2, 0);
  group.add(top);

  // Bottom panel
  const bottom = createPanel(w, t, d, material.clone());
  bottom.position.set(0, t / 2, 0);
  group.add(bottom);

  // Build modules
  cabinet.modules.forEach((mod) => {
    buildModule(mod, cabinet, group, materialKey, handleKey);
  });

  group.position.set(cabinet.position.x, cabinet.position.y, cabinet.position.z);
  return group;
}

// ============================================
// SCENE MANAGEMENT
// ============================================

export function rebuildScene(mainGroup: THREE.Group, furniture: FurnitureConfig): void {
  disposeGroup(mainGroup);

  furniture.cabinets.forEach((cabinet) => {
    const cabinetGroup = buildCabinet(cabinet, furniture.material, furniture.globalHandle);
    mainGroup.add(cabinetGroup);
  });
}

// ============================================
// CAMERA CONTROLS
// ============================================

export function centerCamera(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  furniture: FurnitureConfig
): void {
  const totalWidth = furniture.cabinets.reduce((sum, c) => sum + c.width, 0);
  const maxHeight = Math.max(...furniture.cabinets.map((c) => c.height), 1000);

  controls.target.set(totalWidth / 2, maxHeight / 2, 0);

  const maxDim = Math.max(totalWidth, maxHeight);
  camera.position.set(maxDim * 0.8, maxDim * 0.6, maxDim * 0.8);
  controls.update();
}

export function changeView(
  view: 'front' | 'side' | 'top',
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  furniture: FurnitureConfig
): void {
  const totalWidth = furniture.cabinets.reduce((sum, c) => sum + c.width, 0);
  const maxHeight = Math.max(...furniture.cabinets.map((c) => c.height), 1000);
  const maxDim = Math.max(totalWidth, maxHeight, 1000);

  const target = new THREE.Vector3(totalWidth / 2, maxHeight / 2, 0);

  switch (view) {
    case 'front':
      camera.position.set(totalWidth / 2, maxHeight / 2, maxDim * 1.5);
      break;
    case 'side':
      camera.position.set(maxDim * 1.5, maxHeight / 2, 0);
      break;
    case 'top':
      camera.position.set(totalWidth / 2, maxDim * 2, 0);
      break;
  }

  controls.target.copy(target);
  controls.update();
}

// ============================================
// DRAG & DROP HELPERS
// ============================================

export function checkPositionValidity(
  cabinet: Cabinet,
  moduleId: number,
  newPosition: number
): boolean {
  const moduleHeight = 150;

  for (const mod of cabinet.modules) {
    if (mod.id === moduleId) continue;

    const otherTop = mod.position + (mod.height || 150);
    const otherBottom = mod.position;
    const newTop = newPosition + moduleHeight;
    const newBottom = newPosition;

    if (!(newTop < otherBottom || newBottom > otherTop)) {
      return false;
    }
  }
  return true;
}
