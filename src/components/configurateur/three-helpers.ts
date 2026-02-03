import * as THREE from 'three';
import type { FurnitureConfig, Cabinet, FurnitureModule } from '@/lib/types';
import { WOOD_MATERIALS, HANDLE_TYPES } from '@/lib/constants';

// ============================================
// MATERIAL CREATION
// ============================================

export function createWoodMaterial(materialKey: string): THREE.MeshStandardMaterial {
  const mat = WOOD_MATERIALS[materialKey];
  if (!mat) {
    return new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.7, metalness: 0.05 });
  }
  return new THREE.MeshStandardMaterial({
    color: mat.color,
    roughness: 0.7,
    metalness: 0.05,
    flatShading: false,
  });
}

export function createModuleMaterial(materialKey: string): THREE.MeshStandardMaterial {
  const mat = WOOD_MATERIALS[materialKey];
  const baseColor = mat ? mat.color : 0xd4a574;
  // Slightly darker for modules
  const color = new THREE.Color(baseColor);
  color.multiplyScalar(0.9);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.1,
  });
}

// ============================================
// PANEL & GEOMETRY BUILDERS
// ============================================

export function createPanel(
  width: number,
  height: number,
  depth: number,
  material: THREE.MeshStandardMaterial
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const edges = new THREE.EdgesGeometry(geometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x999999 });
  const line = new THREE.LineSegments(edges, edgeMaterial);
  mesh.add(line);

  return mesh;
}

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

export function disposeGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    }
    if (child instanceof THREE.Group) {
      disposeGroup(child);
    }
  }
}

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
// LIGHTS & ENVIRONMENT SETUP
// ============================================

export function setupLights(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
  sunLight.position.set(1500, 2000, 1000);
  sunLight.castShadow = true;
  sunLight.shadow.camera.left = -2000;
  sunLight.shadow.camera.right = 2000;
  sunLight.shadow.camera.top = 2000;
  sunLight.shadow.camera.bottom = -2000;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);

  const fillLight1 = new THREE.DirectionalLight(0xb3d9ff, 0.3);
  fillLight1.position.set(-1000, 1000, -1000);
  scene.add(fillLight1);

  const fillLight2 = new THREE.DirectionalLight(0xfff4e6, 0.2);
  fillLight2.position.set(1000, 500, -1000);
  scene.add(fillLight2);
}

export function setupEnvironment(scene: THREE.Scene): void {
  const floorGeometry = new THREE.PlaneGeometry(8000, 8000);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xecf0f3,
    roughness: 0.9,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -10;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(6000, 60, 0xc5d3e0, 0xe0e7ee);
  grid.position.y = -9;
  scene.add(grid);
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
