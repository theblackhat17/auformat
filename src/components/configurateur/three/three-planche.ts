import * as THREE from 'three';
import type { PlancheBoard } from '@/lib/types';
import { createWoodMaterial, createPanel } from './three-shared';
import { EDGE_BANDING_CATALOG } from '@/lib/constants';

export function buildPlanche(
  board: PlancheBoard,
  materialKey: string
): THREE.Group {
  const group = new THREE.Group();

  const material = createWoodMaterial(materialKey);
  const l = board.length;
  const w = board.width;
  const t = board.thickness;

  // Main board
  const main = createPanel(l, t, w, material);
  main.position.set(0, t / 2, 0);
  group.add(main);

  // Edge banding colored strips
  const edgeColor = new THREE.Color(0x2C5F2D); // vert-foret
  const sides: Array<{ key: keyof typeof board.edgeBanding; pos: THREE.Vector3; size: [number, number, number] }> = [
    { key: 'top', pos: new THREE.Vector3(0, t / 2, -w / 2), size: [l, t + 2, 3] },
    { key: 'bottom', pos: new THREE.Vector3(0, t / 2, w / 2), size: [l, t + 2, 3] },
    { key: 'left', pos: new THREE.Vector3(-l / 2, t / 2, 0), size: [3, t + 2, w] },
    { key: 'right', pos: new THREE.Vector3(l / 2, t / 2, 0), size: [3, t + 2, w] },
  ];

  sides.forEach(({ key, pos, size }) => {
    const bandKey = board.edgeBanding[key];
    if (bandKey && bandKey !== 'none') {
      const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const mat = new THREE.MeshStandardMaterial({ color: edgeColor, roughness: 0.4, metalness: 0.1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      group.add(mesh);
    }
  });

  return group;
}

export function rebuildPlancheScene(
  mainGroup: THREE.Group,
  boards: PlancheBoard[],
  materialKey: string,
  disposeGroup: (g: THREE.Group) => void
): void {
  disposeGroup(mainGroup);

  // Show the first board as representative
  if (boards.length > 0) {
    const planche = buildPlanche(boards[0], materialKey);
    mainGroup.add(planche);
  }
}

export function centerPlancheCamera(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  board: PlancheBoard
): void {
  const maxDim = Math.max(board.length, board.width, 300);
  controls.target.set(0, board.thickness / 2, 0);
  camera.position.set(maxDim * 0.6, maxDim * 0.5, maxDim * 0.6);
  controls.update();
}
