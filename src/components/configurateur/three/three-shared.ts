import * as THREE from 'three';
import { WOOD_MATERIALS } from '@/lib/constants';

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
