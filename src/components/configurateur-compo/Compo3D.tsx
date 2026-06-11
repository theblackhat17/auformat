'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CompositionConfig, ConfigurateurMaterial, ConfigurateurModuleType, ConfigurateurUnivers } from '@/lib/types';
import { layoutModules, shelfPositions } from './CompoCanvas';
import { moduleMaterial } from './pricingCompo';
import { uniTexture, woodTexture } from './textures3d';

/* Aperçu 3D interactif :
   - caissons creux : l'intérieur (étagères, tringles, LED) est visible
   - cliquer une porte l'ouvre/la ferme (sens d'ouverture configurable), un tiroir coulisse
   - cliquer le caisson sélectionne le module
   - textures générées depuis les matériaux de l'admin (uni / décor bois) */

const S = 0.001; // mm → mètres
const PANEL = 0.018;
const FACADE = 0.018;
const PLINTH = 0.1;
const ILOT_Z = 1.5;

const textureCache = new Map<string, THREE.Texture>();
const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin('anonymous');

function woodMaterial(mat: ConfigurateurMaterial | undefined): THREE.MeshStandardMaterial {
  if (mat?.renderType === 'uni') {
    return new THREE.MeshStandardMaterial({ map: uniTexture(mat.colorHex || '#D4D4D4'), roughness: 0.45, metalness: 0.04 });
  }
  if (mat?.renderType === 'bois') {
    return new THREE.MeshStandardMaterial({
      map: woodTexture(mat.colorHex || '#D8B98C', mat.grainHex || '#8B6F47'),
      roughness: 0.6,
      metalness: 0.03,
    });
  }
  const base = new THREE.MeshStandardMaterial({
    color: new THREE.Color(mat?.colorHex || '#D4A574'),
    roughness: 0.65,
    metalness: 0.05,
  });
  if (mat?.image) {
    const cached = textureCache.get(mat.image);
    if (cached) {
      base.map = cached;
      base.color.set('#ffffff');
    } else {
      texLoader.load(mat.image, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        textureCache.set(mat.image!, tex);
        base.map = tex;
        base.color.set('#ffffff');
        base.needsUpdate = true;
      }, undefined, () => {});
    }
  }
  return base;
}

const INOX = () => new THREE.MeshStandardMaterial({ color: '#c9ced2', roughness: 0.35, metalness: 0.65 });
const MIRROR = () => new THREE.MeshStandardMaterial({ color: '#dfeaee', roughness: 0.06, metalness: 0.85 });
const DARK = (hex: string, f = 0.55) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
};

function box(w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

type Interactive = THREE.Object3D & {
  userData: { action: 'door' | 'drawer'; key: string; openRot?: number; openZ?: number };
};

type Props = {
  config: CompositionConfig;
  moduleTypes: ConfigurateurModuleType[];
  materials: ConfigurateurMaterial[];
  univers?: ConfigurateurUnivers;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function Compo3D({ config, moduleTypes, materials, univers, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group | null;
    interactives: Interactive[];
    raf: number;
    cameraInit: boolean;
  } | null>(null);
  const fitRef = useRef<{ center: THREE.Vector3; radius: number }>({ center: new THREE.Vector3(), radius: 3 });
  /** État ouvert/fermé des portes et tiroirs, conservé entre les reconstructions */
  const openMapRef = useRef(new Map<string, boolean>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  /* Scène persistante */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f3efe6');

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI / 2.02;
    controls.minPolarAngle = 0.12;

    scene.add(new THREE.HemisphereLight('#ffffff', '#d8d2c4', 1.05));
    const sun = new THREE.DirectionalLight('#fff6e8', 1.6);
    sun.position.set(3, 5, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -2;
    scene.add(sun);
    scene.add(new THREE.AmbientLight('#ffffff', 0.25));

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#e9e2d2', roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshStandardMaterial({ color: '#f7f3ea', roughness: 0.95 }));
    wall.position.set(0, 6, -0.005);
    wall.receiveShadow = true;
    scene.add(wall);

    const state = {
      renderer, scene, camera, controls,
      group: null as THREE.Group | null,
      interactives: [] as Interactive[],
      raf: 0,
      cameraInit: false,
    };
    stateRef.current = state;

    const resize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const animate = () => {
      state.raf = requestAnimationFrame(animate);
      controls.update();
      // Animation douce des portes/tiroirs vers leur cible
      for (const it of state.interactives) {
        const open = openMapRef.current.get(it.userData.key) || false;
        if (it.userData.action === 'door') {
          const target = open ? (it.userData.openRot || 0) : 0;
          it.rotation.y += (target - it.rotation.y) * 0.14;
        } else {
          const target = open ? (it.userData.openZ || 0) : 0;
          it.position.z += (target - it.position.z) * 0.14;
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    // Clic : porte/tiroir d'abord, sinon sélection du module
    let downX = 0, downY = 0;
    const onDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; };
    const onUp = (e: PointerEvent) => {
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 8) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      if (!state.group) return;
      const hits = ray.intersectObjects(state.group.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.action && obj.userData.key) {
            const key = obj.userData.key as string;
            openMapRef.current.set(key, !openMapRef.current.get(key));
            return;
          }
          obj = obj.parent;
        }
      }
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.moduleId) { onSelectRef.current(obj.userData.moduleId as string); return; }
          obj = obj.parent;
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    return () => {
      cancelAnimationFrame(state.raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      stateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* (Re)construction de la composition */
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;

    if (state.group) {
      state.scene.remove(state.group);
      state.group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
    state.interactives = [];

    const group = new THREE.Group();
    const { placed, totalWidth, linearWidth, maxTop } = layoutModules(config, moduleTypes);
    let maxDepth = 0.6;

    for (const p of placed) {
      const mod = p.module;
      const type = p.type;
      const mat = moduleMaterial(materials, config, mod.materialIndex);
      const w = mod.largeur * S, h = mod.hauteur * S, d = mod.profondeur * S;
      const isIlot = type.zone === 'ilot';
      const x0 = p.x * S;
      const yBottom = isIlot ? PLINTH : p.bottom * S;
      const z0 = isIlot ? ILOT_Z : 0;
      maxDepth = Math.max(maxDepth, d);

      const mg = new THREE.Group();
      mg.userData.moduleId = mod.id;

      const isFrigo = type.slug === 'colonne_frigo';
      const isLV = type.slug === 'module_lave_vaisselle';
      const isMiroir = type.slug.includes('miroir');
      const habillage = (mod.options['facade_habillage'] ?? 0) > 0;
      const portes = mod.options['porte'] ?? 0;
      const pBasse = mod.options['porte_basse'] ?? 0;
      const pHaute = mod.options['porte_haute'] ?? 0;
      const pPleine = mod.options['porte_pleine'] ?? 0;
      const tiroirs = mod.options['tiroir'] ?? 0;
      const etageres = mod.options['etagere'] ?? 0;
      const tringles = mod.options['tringle'] ?? 0;
      const vasques = mod.options['vasque'] ?? 0;
      const ledInterieur = (mod.options['led_interieur'] ?? 0) > 0;
      const handleStyle = (mod.options['poignee_invisible'] ?? 0) > 0 ? 'invisible' : (mod.options['poignee_bouton'] ?? 0) > 0 ? 'bouton' : 'barre';
      const hingeSide: 'gauche' | 'droite' = (mod.options['ouverture_gauche'] ?? 0) > 0 ? 'gauche' : 'droite';

      const bodyMat = isFrigo && portes === 0 ? INOX() : isLV && !habillage ? INOX() : woodMaterial(mat);
      const innerMat = DARK(mat?.colorHex || '#D4A574', 0.85);
      const facadeMat = isMiroir ? MIRROR() : woodMaterial(mat);
      const handleMat = new THREE.MeshStandardMaterial({ color: '#3c3c3c', roughness: 0.4, metalness: 0.7 });

      if (isFrigo || isLV) {
        // Électroménager : volume plein
        const caisson = box(w, h, d, bodyMat);
        caisson.position.set(w / 2, h / 2, d / 2);
        mg.add(caisson);
      } else {
        // Caisson creux : côtés, dessus, dessous, fond — l'intérieur est visible
        const side1 = box(PANEL, h, d, bodyMat);
        side1.position.set(PANEL / 2, h / 2, d / 2);
        const side2 = side1.clone();
        side2.position.x = w - PANEL / 2;
        const bottom = box(w - PANEL * 2, PANEL, d, bodyMat);
        bottom.position.set(w / 2, PANEL / 2, d / 2);
        const top = bottom.clone();
        top.position.y = h - PANEL / 2;
        const back = box(w - PANEL * 2, h - PANEL * 2, 0.012, innerMat);
        back.position.set(w / 2, h / 2, 0.012);
        mg.add(side1, side2, bottom, top, back);

        // Étagères (positions réglables, visibles dans le caisson)
        const shelfYs: number[] = shelfPositions(mod, mod.hauteur).map((pos) => pos * S);
        for (const sy of shelfYs) {
          const sh = box(w - PANEL * 2, PANEL, d - 0.04, bodyMat);
          sh.position.set(w / 2, sy, d / 2 - 0.01);
          mg.add(sh);
        }

        // Tringles : une par compartiment, du haut vers le bas — la 1re sous le dessus,
        // la 2e sous l'étagère qui sépare les deux zones de penderie, etc.
        const boundaries = [h - PANEL, ...shelfYs.slice().sort((a, b) => b - a)];
        for (let i = 0; i < tringles; i++) {
          const under = boundaries[i] ?? (boundaries[boundaries.length - 1] - 0.4 * (i - boundaries.length + 1));
          const y = Math.max(under - 0.1, PANEL + 0.15);
          const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w - PANEL * 2 - 0.02), handleMat);
          rod.rotation.z = Math.PI / 2;
          rod.position.set(w / 2, y, d / 2);
          mg.add(rod);
        }

        // LED intérieure : un bandeau sous le dessus ET sous chaque étagère
        // (chaque compartiment est éclairé, partie basse comprise)
        if (ledInterieur) {
          const stripMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffdf8a', emissiveIntensity: 1.6 });
          const stripYs = [h - PANEL, ...shelfYs];
          for (const sy of stripYs.slice(0, 5)) {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(w - PANEL * 2 - 0.04, 0.012, 0.03), stripMat);
            strip.position.set(w / 2, sy - PANEL / 2 - 0.012, d - 0.08);
            mg.add(strip);
          }
          const glowTop = new THREE.PointLight('#ffe2a0', 2, Math.max(h * 0.8, 1), 2);
          glowTop.position.set(w / 2, h * 0.75, d / 2);
          mg.add(glowTop);
          if (h > 1.2) {
            const glowBas = new THREE.PointLight('#ffe2a0', 1.6, Math.max(h * 0.7, 0.9), 2);
            glowBas.position.set(w / 2, h * 0.3, d / 2);
            mg.add(glowBas);
          }
        }
      }

      const addHandle = (parent: THREE.Object3D, lx: number, ly: number, vertical: boolean) => {
        if (handleStyle === 'invisible') return;
        const hMesh = handleStyle === 'bouton'
          ? new THREE.Mesh(new THREE.SphereGeometry(0.012), handleMat)
          : box(vertical ? 0.014 : 0.14, vertical ? 0.14 : 0.014, 0.018, handleMat);
        hMesh.position.set(lx, ly, FACADE / 2 + 0.012);
        parent.add(hMesh);
      };

      /** Portes ouvrables : n vantaux sur [y0, y1]. Pivot sur la charnière, clic pour ouvrir. */
      const addDoors = (n: number, y0: number, y1: number, zone: string, mirror = false) => {
        const dw = w / n;
        const zoneH = y1 - y0 - 0.006;
        for (let i = 0; i < n; i++) {
          // Double porte : ouverture par le centre ; porte seule : sens choisi par l'option
          const side: 'gauche' | 'droite' = n === 1 ? hingeSide : i < n / 2 ? 'gauche' : 'droite';
          const hingeX = side === 'gauche' ? i * dw + 0.003 : (i + 1) * dw - 0.003;
          const pivot = new THREE.Group();
          pivot.position.set(hingeX, (y0 + y1) / 2, d + FACADE / 2);
          const leaf = box(dw - 0.006, zoneH, FACADE, mirror ? MIRROR() : facadeMat);
          leaf.position.x = side === 'gauche' ? (dw - 0.006) / 2 : -(dw - 0.006) / 2;
          pivot.add(leaf);
          if (!mirror) addHandle(leaf, side === 'gauche' ? (dw - 0.006) / 2 - 0.05 : -((dw - 0.006) / 2 - 0.05), 0, true);
          // Charnières apparentes le long de l'axe de rotation
          const hingeFractions = zoneH > 1.4 ? [0.12, 0.5, 0.88] : [0.15, 0.85];
          for (const f of hingeFractions) {
            const hinge = box(0.024, 0.06, 0.028, handleMat);
            hinge.position.set(side === 'gauche' ? 0.006 : -0.006, (f - 0.5) * zoneH, -FACADE / 2 - 0.008);
            pivot.add(hinge);
          }
          pivot.userData = {
            action: 'door',
            key: `${mod.id}:${zone}:${i}`,
            openRot: side === 'gauche' ? -1.85 : 1.85,
          };
          mg.add(pivot);
          state.interactives.push(pivot as unknown as Interactive);
        }
      };

      if (isFrigo) {
        const split = h * 0.33;
        const fmat = portes > 0 ? facadeMat : INOX();
        const topDoor = box(w - 0.01, h - split - 0.008, FACADE, fmat);
        topDoor.position.set(w / 2, split + (h - split) / 2, d + FACADE / 2);
        const botDoor = box(w - 0.01, split - 0.008, FACADE, fmat);
        botDoor.position.set(w / 2, split / 2, d + FACADE / 2);
        mg.add(topDoor, botDoor);
        addHandle(topDoor, -(w / 2) + 0.06, 0, true);
        addHandle(botDoor, -(w / 2) + 0.06, 0, true);
      } else if (isLV) {
        const face = box(w - 0.01, h - 0.01, FACADE, habillage ? facadeMat : INOX());
        face.position.set(w / 2, h / 2, d + FACADE / 2);
        mg.add(face);
        addHandle(face, 0, h / 2 - 0.08, false);
      } else {
        // Tiroirs coulissants (clic pour ouvrir)
        const autoZone = portes > 0 ? h * 0.4 : type.slug === 'banc_rangement' ? h * 0.75 : h;
        const drawerZone = tiroirs > 0 ? Math.min(h, Math.max(0.12, mod.tiroirsHauteur != null ? mod.tiroirsHauteur * S : autoZone)) : 0;
        for (let i = 0; i < tiroirs; i++) {
          const th = drawerZone / tiroirs;
          const yC = h - i * th - th / 2;
          const dg = new THREE.Group(); // glisse en Z
          const front = box(w - 0.01, th - 0.008, FACADE, facadeMat);
          front.position.set(w / 2, yC, d + FACADE / 2);
          dg.add(front);
          const tub = box(w - 0.08, Math.max(th - 0.07, 0.05), d - 0.12, innerMat);
          tub.position.set(w / 2, yC - 0.02, d / 2);
          dg.add(tub);
          addHandle(front, 0, 0, false);
          dg.userData = { action: 'drawer', key: `${mod.id}:t:${i}`, openZ: Math.min(d * 0.6, 0.45) };
          mg.add(dg);
          state.interactives.push(dg as unknown as Interactive);
        }
        if (portes > 0) addDoors(portes, 0, h - drawerZone, 'p', isMiroir);
        if (pPleine > 0) addDoors(pPleine, 0, h, 'pp');
        else {
          if (pBasse > 0) addDoors(pBasse, 0, h / 2 - 0.005, 'pb');
          if (pHaute > 0) addDoors(pHaute, h / 2 + 0.005, h, 'ph');
        }
      }

      // Plinthe
      if ((type.zone === 'bas' && !(mod.options['suspendu'] > 0)) || isIlot) {
        const plMat = config.plintheMaterialIndex != null && materials[config.plintheMaterialIndex]
          ? woodMaterial(materials[config.plintheMaterialIndex])
          : DARK(mat?.colorHex || '#8B6F47');
        const pl = box(w - 0.04, PLINTH, d - 0.06, plMat);
        pl.position.set(w / 2, -PLINTH / 2, d / 2 - 0.02);
        mg.add(pl);
      }

      // Vasques
      for (let i = 0; i < vasques; i++) {
        const basin = new THREE.Mesh(
          new THREE.CylinderGeometry(Math.min(w * 0.2, 0.22), Math.min(w * 0.17, 0.19), 0.11, 32),
          new THREE.MeshStandardMaterial({ color: '#fafafa', roughness: 0.15 })
        );
        basin.position.set((w / (vasques + 1)) * (i + 1), h + 0.055, d / 2);
        mg.add(basin);
        const tap = box(0.018, 0.16, 0.018, handleMat);
        tap.position.set((w / (vasques + 1)) * (i + 1) + 0.12, h + 0.14, d / 2 - 0.06);
        mg.add(tap);
      }

      // LED sous meuble (extérieure)
      if ((mod.options['eclairage_sous_meuble'] ?? 0) > 0 || (mod.options['led'] ?? 0) > 0) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(w - 0.06, 0.012, 0.03),
          new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffdf8a', emissiveIntensity: 1.4 })
        );
        strip.position.set(w / 2, -0.012, d - 0.05);
        mg.add(strip);
      }

      mg.position.set(x0, yBottom, z0);
      group.add(mg);
    }

    // Plans de travail
    if (config.planTravail && univers?.planTravail?.disponible) {
      const planMat = config.planMaterialIndex != null && materials[config.planMaterialIndex]
        ? woodMaterial(materials[config.planMaterialIndex])
        : DARK(materials[config.materialIndex]?.colorHex || '#D4A574', 0.65);
      const planOv = (config.planDebord ?? 20) * S;
      const planTh = (config.planEpaisseur ?? 40) * S;
      let run: typeof placed = [];
      const flush = () => {
        if (!run.length) return;
        const xa = run[0].x * S - planOv;
        const xb = (run[run.length - 1].x + run[run.length - 1].module.largeur) * S + planOv;
        const top = Math.max(...run.map((q) => (q.bottom + q.module.hauteur) * S));
        const depth = Math.max(...run.map((q) => q.module.profondeur * S)) + planOv * 2;
        const plan = box(xb - xa, planTh, depth, planMat);
        plan.position.set((xa + xb) / 2, top + planTh / 2, depth / 2);
        group.add(plan);
        run = [];
      };
      for (const p of placed) {
        if (p.free || p.type.zone === 'ilot') continue;
        if (p.type.zone === 'bas' && !(p.module.options['suspendu'] > 0)) run.push(p);
        else flush();
      }
      flush();
      for (const p of placed.filter((q) => q.type.zone === 'ilot')) {
        const w = p.module.largeur * S, d = p.module.profondeur * S;
        const plan = box(w + planOv * 2 + 0.02, planTh, d + planOv * 2 + 0.02, planMat);
        plan.position.set(p.x * S + w / 2, PLINTH + p.module.hauteur * S + planTh / 2, ILOT_Z + d / 2);
        group.add(plan);
      }
    }

    // Façade coulissante (dressing)
    if (config.facadeCoulissante && univers?.facadeCoulissante?.disponible && linearWidth > 0) {
      const vantaux = Math.min(4, Math.max(2, config.facadeVantaux ?? 2));
      const mainMat = materials[config.materialIndex];
      const zF = maxDepth + 0.06;
      const hF = maxTop * S;
      const rail = box(linearWidth * S + 0.08, 0.05, 0.09, DARK(mainMat?.colorHex || '#D4A574', 0.45));
      rail.position.set((linearWidth * S) / 2, hF + 0.025, zF);
      group.add(rail);
      for (let i = 0; i < vantaux; i++) {
        const pw = (linearWidth * S) / vantaux + 0.04;
        const panelMat = woodMaterial(mainMat);
        panelMat.transparent = true;
        panelMat.opacity = 0.55;
        const panel = box(pw, hF - (i % 2 ? 0.015 : 0), FACADE, panelMat);
        panel.position.set((linearWidth * S / vantaux) * i + pw / 2 - 0.02, (hF - (i % 2 ? 0.015 : 0)) / 2, zF + (i % 2 ? 0.025 : 0));
        group.add(panel);
      }
    }

    // Surbrillance du module sélectionné
    if (selectedId) {
      const sel = group.children.find((c) => c.userData.moduleId === selectedId);
      if (sel) group.add(new THREE.BoxHelper(sel, '#2C5F2D'));
    }

    group.position.x = -(totalWidth * S) / 2;
    state.scene.add(group);
    state.group = group;

    // Restaure instantanément les portes/tiroirs déjà ouverts
    for (const it of state.interactives) {
      const open = openMapRef.current.get(it.userData.key) || false;
      if (it.userData.action === 'door') it.rotation.y = open ? (it.userData.openRot || 0) : 0;
      else it.position.z = open ? (it.userData.openZ || 0) : 0;
    }

    const hasIlot = placed.some((p) => p.type.zone === 'ilot');
    const center = new THREE.Vector3(0, (maxTop * S) * 0.45, hasIlot ? ILOT_Z / 2 : 0.3);
    const radius = Math.max(totalWidth * S, maxTop * S, 2);
    fitRef.current = { center, radius };
    state.controls.target.copy(center);

    // Première ouverture : vue 3/4 dézoomée
    if (!state.cameraInit) {
      state.cameraInit = true;
      const dist = radius * 1.35 + 1.4;
      state.camera.position.set(center.x + dist * 0.62, center.y + radius * 0.5 + 0.4, center.z + dist * 0.95);
    }
  }, [config, moduleTypes, materials, univers, selectedId]);

  const setView = useCallback((kind: 'face' | 'trois-quarts') => {
    const state = stateRef.current;
    if (!state) return;
    const { center, radius } = fitRef.current;
    const dist = radius * 1.35 + 1.4;
    if (kind === 'face') state.camera.position.set(center.x, center.y + 0.2, center.z + dist);
    else state.camera.position.set(center.x + dist * 0.62, center.y + radius * 0.5 + 0.4, center.z + dist * 0.95);
    state.controls.target.copy(center);
  }, []);

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-[55vh] min-h-[360px] rounded-xl overflow-hidden touch-none" aria-label="Aperçu 3D de votre composition" role="img" />
      <div className="absolute top-3 left-3 flex gap-2">
        <button onClick={() => setView('face')} className="px-3 py-1.5 text-xs font-semibold bg-white/95 rounded-full ring-1 ring-noir/10 text-noir hover:bg-white transition-colors">
          Vue de face
        </button>
        <button onClick={() => setView('trois-quarts')} className="px-3 py-1.5 text-xs font-semibold bg-white/95 rounded-full ring-1 ring-noir/10 text-noir hover:bg-white transition-colors">
          Vue 3/4
        </button>
      </div>
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-noir/60 bg-white/90 px-3 py-1.5 rounded-full whitespace-nowrap max-w-[calc(100%-24px)] truncate">
        Cliquez sur une porte ou un tiroir pour l&apos;ouvrir · tournez avec la souris ou le doigt
      </p>
    </div>
  );
}

export default Compo3D;
