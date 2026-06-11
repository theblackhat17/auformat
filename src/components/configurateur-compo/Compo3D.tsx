'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CompositionConfig, ConfigurateurMaterial, ConfigurateurModuleType, ConfigurateurUnivers } from '@/lib/types';
import { layoutModules } from './CompoCanvas';
import { moduleMaterial } from './pricingCompo';
import { uniTexture, woodTexture } from './textures3d';

/* Aperçu 3D de la composition. Conçu pour un public non technique :
   rotation au doigt/à la souris, molette/pincement pour zoomer, boutons de vue prédéfinis.
   Les matériaux utilisent les photos réelles de l'onglet Matériaux comme textures. */

const S = 0.001; // mm → mètres
const FACADE = 0.018;
const PLINTH = 0.1;
const ILOT_Z = 1.5; // distance îlot ↔ mur

/* Cache global de textures (les photos matériaux reviennent souvent) */
const textureCache = new Map<string, THREE.Texture>();
const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin('anonymous');

function woodMaterial(mat: ConfigurateurMaterial | undefined, onLoad: () => void): THREE.MeshStandardMaterial {
  // Texture procédurale (mélaminé uni / décor bois) : prioritaire, pilotée par l'admin
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
      texLoader.load(
        mat.image,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          textureCache.set(mat.image!, tex);
          base.map = tex;
          base.color.set('#ffffff');
          base.needsUpdate = true;
          onLoad();
        },
        undefined,
        () => { /* photo indisponible : la teinte du matériau reste */ }
      );
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
    raf: number;
  } | null>(null);
  const fitRef = useRef<{ center: THREE.Vector3; radius: number }>({ center: new THREE.Vector3(), radius: 3 });

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
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI / 2.02;
    controls.minPolarAngle = 0.12;

    // Lumière douce d'intérieur
    scene.add(new THREE.HemisphereLight('#ffffff', '#d8d2c4', 1.05));
    const sun = new THREE.DirectionalLight('#fff6e8', 1.6);
    sun.position.set(3, 5, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -2;
    scene.add(sun);
    scene.add(new THREE.AmbientLight('#ffffff', 0.25));

    // Sol + mur
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: '#e9e2d2', roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 12),
      new THREE.MeshStandardMaterial({ color: '#f7f3ea', roughness: 0.95 })
    );
    wall.position.set(0, 6, -0.005);
    wall.receiveShadow = true;
    scene.add(wall);

    const state = { renderer, scene, camera, controls, group: null as THREE.Group | null, raf: 0 };
    stateRef.current = state;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
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
      renderer.render(scene, camera);
    };
    animate();

    // Sélection au clic (sans confondre avec la rotation)
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

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  /* (Re)construction de la composition à chaque changement */
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

    const group = new THREE.Group();
    const { placed, totalWidth, linearWidth, maxTop } = layoutModules(config, moduleTypes);
    const refresh = () => { /* textures chargées en différé : la boucle de rendu rafraîchit en continu */ };

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
      const handleStyle = (mod.options['poignee_invisible'] ?? 0) > 0 ? 'invisible' : (mod.options['poignee_bouton'] ?? 0) > 0 ? 'bouton' : 'barre';

      const bodyMat = isFrigo && portes === 0 ? INOX() : isLV && !habillage ? INOX() : woodMaterial(mat, refresh);

      // Caisson
      const caisson = box(w, h, d, bodyMat);
      caisson.position.set(w / 2, h / 2, d / 2);
      mg.add(caisson);

      // Plinthe (matériau dédié si choisi)
      if ((type.zone === 'bas' && !(mod.options['suspendu'] > 0)) || isIlot) {
        const plMat = config.plintheMaterialIndex != null && materials[config.plintheMaterialIndex]
          ? woodMaterial(materials[config.plintheMaterialIndex], refresh)
          : DARK(mat?.colorHex || '#8B6F47');
        const pl = box(w - 0.04, PLINTH, d - 0.06, plMat);
        pl.position.set(w / 2, -PLINTH / 2, d / 2 - 0.02);
        mg.add(pl);
      }

      const facadeMat = isMiroir ? MIRROR() : woodMaterial(mat, refresh);
      const handleMat = new THREE.MeshStandardMaterial({ color: '#3c3c3c', roughness: 0.4, metalness: 0.7 });

      const addHandle = (cx: number, cy: number, vertical: boolean) => {
        if (handleStyle === 'invisible') return;
        const hMesh = handleStyle === 'bouton'
          ? new THREE.Mesh(new THREE.SphereGeometry(0.012), handleMat)
          : box(vertical ? 0.014 : 0.14, vertical ? 0.14 : 0.014, 0.018, handleMat);
        hMesh.position.set(cx, cy, d + FACADE + 0.012);
        mg.add(hMesh);
      };

      /** n vantaux couvrant la zone verticale [y0, y1] (relatif au bas du caisson) */
      const addDoors = (n: number, y0: number, y1: number) => {
        const dw = w / n;
        for (let i = 0; i < n; i++) {
          const door = box(dw - 0.006, y1 - y0 - 0.006, FACADE, facadeMat);
          door.position.set(i * dw + dw / 2, (y0 + y1) / 2, d + FACADE / 2);
          mg.add(door);
          addHandle(i % 2 === 0 ? (i + 1) * dw - 0.05 : i * dw + 0.05, (y0 + y1) / 2, true);
        }
      };

      if (isFrigo) {
        const split = h * 0.33;
        const fmat = portes > 0 ? facadeMat : INOX();
        const top = box(w - 0.01, h - split - 0.008, FACADE, fmat);
        top.position.set(w / 2, split + (h - split) / 2, d + FACADE / 2);
        mg.add(top);
        const bot = box(w - 0.01, split - 0.008, FACADE, fmat);
        bot.position.set(w / 2, split / 2, d + FACADE / 2);
        mg.add(bot);
        addHandle(0.06, split + (h - split) / 2, true);
        addHandle(0.06, split / 2, true);
      } else if (isLV) {
        const face = box(w - 0.01, h - 0.01, FACADE, habillage ? facadeMat : INOX());
        face.position.set(w / 2, h / 2, d + FACADE / 2);
        mg.add(face);
        addHandle(w / 2, h - 0.08, false);
      } else {
        // Tiroirs en partie haute (cohérent avec la 2D)
        const drawerZone = tiroirs > 0 ? (portes > 0 ? h * 0.4 : h) : 0;
        for (let i = 0; i < tiroirs; i++) {
          const th = drawerZone / tiroirs;
          const yC = h - i * th - th / 2;
          const dr = box(w - 0.01, th - 0.008, FACADE, facadeMat);
          dr.position.set(w / 2, yC, d + FACADE / 2);
          mg.add(dr);
          addHandle(w / 2, yC, false);
        }
        if (portes > 0) addDoors(portes, 0, h - drawerZone);
        if (pPleine > 0) addDoors(pPleine, 0, h);
        else {
          if (pBasse > 0) addDoors(pBasse, 0, h / 2 - 0.005);
          if (pHaute > 0) addDoors(pHaute, h / 2 + 0.005, h);
        }

        // Intérieur ouvert : fond sombre + étagères + tringles
        const open = portes === 0 && pPleine === 0 && tiroirs === 0;
        if (open && (etageres > 0 || tringles > 0)) {
          const innerMat = DARK(mat?.colorHex || '#D4A574', 0.8);
          for (let i = 1; i <= etageres; i++) {
            const sh = box(w - 0.04, FACADE, d - 0.05, innerMat);
            sh.position.set(w / 2, (h / (etageres + 1)) * i, d / 2);
            mg.add(sh);
          }
          for (let i = 0; i < tringles; i++) {
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w - 0.06), handleMat);
            rod.rotation.z = Math.PI / 2;
            rod.position.set(w / 2, h - 0.12 - i * h * 0.4, d / 2);
            mg.add(rod);
          }
        }
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

      // LED sous meuble
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

    // Plans de travail (rangée murale + îlots) — matériau dédié si choisi
    if (config.planTravail && univers?.planTravail?.disponible) {
      const planMat = config.planMaterialIndex != null && materials[config.planMaterialIndex]
        ? woodMaterial(materials[config.planMaterialIndex], refresh)
        : DARK(materials[config.materialIndex]?.colorHex || '#D4A574', 0.65);
      let run: typeof placed = [];
      const flush = () => {
        if (!run.length) return;
        const xa = run[0].x * S - 0.02;
        const xb = (run[run.length - 1].x + run[run.length - 1].module.largeur) * S + 0.02;
        const top = Math.max(...run.map((q) => (q.bottom + q.module.hauteur) * S));
        const depth = Math.max(...run.map((q) => q.module.profondeur * S)) + 0.04;
        const plan = box(xb - xa, 0.04, depth, planMat);
        plan.position.set((xa + xb) / 2, top + 0.02, depth / 2);
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
        const plan = box(w + 0.06, 0.04, d + 0.06, planMat);
        plan.position.set(p.x * S + w / 2, PLINTH + p.module.hauteur * S + 0.02, ILOT_Z + d / 2);
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
        const panelMat = woodMaterial(mainMat, refresh);
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
      if (sel) {
        const bb = new THREE.BoxHelper(sel, '#2C5F2D');
        (bb.material as THREE.LineBasicMaterial).linewidth = 2;
        group.add(bb);
      }
    }

    // Centrage de la scène
    group.position.x = -(totalWidth * S) / 2;
    state.scene.add(group);
    state.group = group;

    const center = new THREE.Vector3(0, (maxTop * S) * 0.45, config.modules.length && placed.some((p) => p.type.zone === 'ilot') ? ILOT_Z / 2 : 0.3);
    const radius = Math.max(totalWidth * S, maxTop * S, 2);
    fitRef.current = { center, radius };
    if (state.camera.position.lengthSq() === 0 || !state.controls.target.equals(center)) {
      // Premier rendu ou recentrage : vue 3/4 confortable
      if (state.camera.position.lengthSq() === 0) {
        state.camera.position.set(center.x + radius * 0.7, maxTop * S * 0.8 + 0.4, center.z + radius * 1.15 + 1);
      }
      state.controls.target.copy(center);
    }
  }, [config, moduleTypes, materials, univers, selectedId]);

  const setView = useCallback((kind: 'face' | 'trois-quarts' | 'reset') => {
    const state = stateRef.current;
    if (!state) return;
    const { center, radius } = fitRef.current;
    const dist = radius * 1.15 + 1;
    if (kind === 'face') state.camera.position.set(center.x, center.y + 0.2, center.z + dist);
    else state.camera.position.set(center.x + dist * 0.6, center.y + radius * 0.45 + 0.3, center.z + dist * 0.85);
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
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-noir/60 bg-white/90 px-3 py-1.5 rounded-full whitespace-nowrap">
        Tournez avec la souris ou le doigt · molette ou pincement pour zoomer
      </p>
    </div>
  );
}

export default Compo3D;
