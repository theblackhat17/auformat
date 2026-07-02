'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CompositionConfig, ConfigurateurMaterial, ConfigurateurModuleType, ConfigurateurUnivers } from '@/lib/types';
import { layoutModules, shelfPositions, penderieRails } from './CompoCanvas';
import { moduleMaterial } from './pricingCompo';
import { cannageTexture, rainureTexture, uniTexture, woodTexture, floorParquet, floorCarrelage, floorBeton } from './textures3d';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { ArViewer } from './ArViewer';

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

/** Silhouette humaine (1,80 m) dessinée sur un canevas transparent — repère d'échelle. */
let humanTex: THREE.CanvasTexture | null = null;
function humanTexture(): THREE.CanvasTexture {
  if (humanTex) return humanTex;
  const W = 200, H = 600;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  c.fillStyle = 'rgba(120,124,130,0.55)';
  c.strokeStyle = 'rgba(90,94,100,0.65)';
  c.lineWidth = 3;
  // Tête
  c.beginPath(); c.arc(W / 2, 70, 42, 0, Math.PI * 2); c.fill();
  // Corps + jambes (tracé simple d'une silhouette debout)
  c.beginPath();
  c.moveTo(W / 2 - 30, 118);
  c.bezierCurveTo(W / 2 - 78, 150, W / 2 - 72, 300, W / 2 - 60, 340); // épaule/bras gauche
  c.lineTo(W / 2 - 40, 345);
  c.lineTo(W / 2 - 44, 200);
  c.lineTo(W / 2 - 40, 360);
  c.bezierCurveTo(W / 2 - 44, 470, W / 2 - 40, 560, W / 2 - 34, 590); // jambe gauche
  c.lineTo(W / 2 - 6, 590);
  c.lineTo(W / 2 - 2, 400);
  c.lineTo(W / 2 + 2, 400);
  c.lineTo(W / 2 + 6, 590);
  c.lineTo(W / 2 + 34, 590);
  c.bezierCurveTo(W / 2 + 40, 560, W / 2 + 44, 470, W / 2 + 40, 360); // jambe droite
  c.lineTo(W / 2 + 44, 200);
  c.lineTo(W / 2 + 40, 345);
  c.lineTo(W / 2 + 60, 340);
  c.bezierCurveTo(W / 2 + 72, 300, W / 2 + 78, 150, W / 2 + 30, 118); // bras droit
  c.closePath();
  c.fill();
  humanTex = new THREE.CanvasTexture(cv);
  humanTex.colorSpace = THREE.SRGBColorSpace;
  return humanTex;
}

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

function box(w: number, h: number, d: number, material: THREE.Material | THREE.Material[]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* Accessoires déco (livres, courses, vêtements) : pseudo-aléa déterministe par module,
   stable entre deux reconstructions de la scène */
function seedFrom(id: string): number {
  let s = 7;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) | 0;
  return s;
}
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Interactive = THREE.Object3D & {
  userData: { action: 'door' | 'drawer' | 'slide'; key: string; openRot?: number; openRotX?: number; openZ?: number; openX?: number };
};

type Props = {
  config: CompositionConfig;
  moduleTypes: ConfigurateurModuleType[];
  materials: ConfigurateurMaterial[];
  univers?: ConfigurateurUnivers;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Ambiance de la scène (réglable par le client) */
  wallColor?: string;
  floorColor?: string;
};

export function Compo3D({ config, moduleTypes, materials, univers, selectedId, onSelect, wallColor, floorColor }: Props) {
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
    floorMat: THREE.MeshStandardMaterial;
    wallMat: THREE.MeshStandardMaterial;
    ceiling: THREE.Mesh;
    human: THREE.Mesh;
    hemi: THREE.HemisphereLight;
    sun: THREE.DirectionalLight;
    ambient: THREE.AmbientLight;
  } | null>(null);
  const fitRef = useRef<{ center: THREE.Vector3; radius: number }>({ center: new THREE.Vector3(), radius: 3 });
  /* Ambiance réglable par le client (couleurs par défaut : celles du site) */
  const [wall, setWall] = useState(wallColor || '#f7f3ea');
  const [floor, setFloor] = useState(floorColor || '#caa46f');
  const [floorStyle, setFloorStyle] = useState<'parquet' | 'carrelage' | 'beton' | 'uni'>('parquet');
  const [ambiance, setAmbiance] = useState<'jour' | 'soir'>('jour');
  const [showHuman, setShowHuman] = useState(true);
  const showHumanRef = useRef(showHuman);
  showHumanRef.current = showHuman;
  /* Réalité augmentée : modèles exportés (blob URLs) */
  const [arUrls, setArUrls] = useState<{ glb: string; usdz: string } | null>(null);
  const [arBusy, setArBusy] = useState(false);
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
    // Déplacement latéral : clic droit (ou deux doigts) pour parcourir les grandes compositions
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.panSpeed = 0.9;
    controls.minDistance = 0.8;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI / 2.02;
    controls.minPolarAngle = 0.12;

    const hemi = new THREE.HemisphereLight('#ffffff', '#d8d2c4', 1.05);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff6e8', 1.6);
    sun.position.set(3, 5, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -2;
    scene.add(sun);
    const ambient = new THREE.AmbientLight('#ffffff', 0.25);
    scene.add(ambient);

    const floorMat = new THREE.MeshStandardMaterial({ color: '#e9e2d2', roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const wallMat = new THREE.MeshStandardMaterial({ color: '#f7f3ea', roughness: 0.95 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), wallMat);
    wall.position.set(0, 6, -0.005);
    wall.receiveShadow = true;
    scene.add(wall);
    // Plafond : plan à hauteur sous plafond, face tournée vers le bas (invisible vu de dessus, ne masque rien)
    const ceilMat = new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.96, side: THREE.FrontSide });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 2.5, 0);
    ceiling.receiveShadow = true;
    scene.add(ceiling);
    // Silhouette humaine 1,80 m (repère d'échelle) — placée à droite de la composition
    const human = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 1.8),
      new THREE.MeshBasicMaterial({ map: humanTexture(), transparent: true, depthWrite: false })
    );
    human.position.set(2, 0.9, 0.3);
    human.visible = showHumanRef.current;
    scene.add(human);

    const state = {
      renderer, scene, camera, controls,
      group: null as THREE.Group | null,
      interactives: [] as Interactive[],
      raf: 0,
      cameraInit: false,
      floorMat,
      wallMat,
      ceiling,
      human,
      hemi,
      sun,
      ambient,
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
      // Silhouette toujours tournée vers la caméra (billboard sur l'axe vertical)
      state.human.rotation.y = Math.atan2(camera.position.x - state.human.position.x, camera.position.z - state.human.position.z);
      // Animation douce des portes/tiroirs vers leur cible
      for (const it of state.interactives) {
        const open = openMapRef.current.get(it.userData.key) || false;
        if (it.userData.action === 'door') {
          if (it.userData.openRotX !== undefined) {
            // Porte abattante (lave-vaisselle) : bascule vers l'avant
            const target = open ? it.userData.openRotX : 0;
            it.rotation.x += (target - it.rotation.x) * 0.12;
          } else {
            const target = open ? (it.userData.openRot || 0) : 0;
            it.rotation.y += (target - it.rotation.y) * 0.14;
          }
        } else if (it.userData.action === 'slide') {
          // Porte coulissante : glisse latéralement le long du rail
          const target = open ? (it.userData.openX || 0) : 0;
          it.position.x += (target - it.position.x) * 0.14;
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

  /* Ambiance : mur, sol (couleur + matière) et lumière jour/soir */
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.wallMat.color.set(wall);
    // Sol : texture selon la matière choisie, teintée par la couleur.
    // Les textures sont mises en cache (textures3d) : on ne les dispose pas, on réaffecte juste la map.
    const fm = state.floorMat;
    fm.map = floorStyle === 'parquet' ? floorParquet(floor)
      : floorStyle === 'carrelage' ? floorCarrelage(floor)
      : floorStyle === 'beton' ? floorBeton(floor)
      : null;
    fm.color.set(floorStyle === 'uni' ? floor : '#ffffff');
    fm.roughness = floorStyle === 'carrelage' ? 0.5 : 0.9;
    fm.needsUpdate = true;
    // Lumière : journée claire et neutre, ou soirée chaude et tamisée
    const jour = ambiance === 'jour';
    state.hemi.intensity = jour ? 1.05 : 0.5;
    state.sun.intensity = jour ? 1.6 : 0.75;
    state.sun.color.set(jour ? '#fff6e8' : '#ffcaa0');
    state.ambient.intensity = jour ? 0.25 : 0.18;
    state.ambient.color.set(jour ? '#ffffff' : '#ffd9b0');
    state.scene.background = new THREE.Color(jour ? '#f3efe6' : '#3a3340');
  }, [wall, floor, floorStyle, ambiance]);

  /* Plafond : positionné à la hauteur sous plafond réglée (mm → m) */
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.ceiling.position.y = (config.hauteurPlafond ?? 2500) * S;
  }, [config.hauteurPlafond]);

  /* Silhouette d'échelle : affichée ou masquée */
  useEffect(() => {
    const state = stateRef.current;
    if (state) state.human.visible = showHuman;
  }, [showHuman]);

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

    /* Retours du L : rangées perpendiculaires au mur principal, posées le long des murs latéraux */
    const mainDepth = placed
      .filter((q) => q.row === 'principal' && !q.free)
      .reduce((m, q) => Math.max(m, q.module.profondeur * S), 0.6);
    const retourZ0 = mainDepth + 0.04;
    const cornerRight = linearWidth * S;
    const place = (mg: THREE.Group, p: (typeof placed)[number], w: number, yBottom: number) => {
      if (p.row === 'retour_droit') {
        mg.rotation.y = -Math.PI / 2;
        mg.position.set(cornerRight, yBottom, retourZ0 + p.x * S);
      } else if (p.row === 'retour_gauche') {
        mg.rotation.y = Math.PI / 2;
        mg.position.set(0, yBottom, retourZ0 + p.x * S + w);
      } else {
        mg.position.set(p.x * S, yBottom, p.type.zone === 'ilot' ? ILOT_Z : 0);
      }
      group.add(mg);
    };

    for (const p of placed) {
      const mod = p.module;
      const type = p.type;
      const mat = moduleMaterial(materials, config, mod.materialIndex);
      const w = mod.largeur * S, h = mod.hauteur * S, d = mod.profondeur * S;
      const isIlot = type.zone === 'ilot';
      const yBottom = isIlot ? PLINTH : p.floorBottom * S;
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
      const isPlanLibre = type.slug === 'plan_de_travail';
      const isFour = type.slug === 'colonne_four';
      const isLLinge = type.slug === 'colonne_lave_linge';
      const isVitre = type.slug === 'meuble_haut_vitre';
      const isBouteilles = type.slug === 'range_bouteilles';
      const isCoiffeuse = type.slug === 'coiffeuse';
      const isBureau = type.slug === 'bureau';
      const isHotte = type.slug === 'meuble_hotte';
      const isPanneauPlein = isPlanLibre || type.slug === 'fileur' || type.slug === 'joue_finition';
      const isDecor = !!type.decor;
      const separateurs = mod.options['separateur_vertical'] ?? 0;
      const socleLegs: 'metal' | 'bois' | null =
        (mod.options['socle_pieds_metal'] ?? 0) > 0 ? 'metal' : (mod.options['socle_pieds_bois'] ?? 0) > 0 ? 'bois' : null;
      // Penderie / module à tringle : les tiroirs se logent en bas, l'intérieur reste au-dessus
      const isPenderie3d = type.slug === 'module_penderie';
      const drawersAtBottom = isPenderie3d ? !((mod.options['tiroirs_haut'] ?? 0) > 0) : tringles > 0;
      const penderieEnBas = (mod.options['penderie_bas'] ?? 0) > 0;
      const autoDrawerZone = portes > 0 ? h * 0.4 : type.slug === 'banc_rangement' ? h * 0.75 : (isPenderie3d || tringles > 0) ? h * 0.4 : h;
      const drawerZone = tiroirs > 0 ? Math.min(h, Math.max(0.12, mod.tiroirsHauteur != null ? mod.tiroirsHauteur * S : autoDrawerZone)) : 0;
      // Espace intérieur libre (hors zone de tiroirs)
      const freeBottom = drawersAtBottom ? drawerZone : 0;
      const freeTop = drawersAtBottom ? h : h - drawerZone;
      // Ancrage de la tringle : haut de l'espace libre (penderie haut) ou plus bas (penderie bas)
      const penderieAnchorY = penderieEnBas ? freeBottom + Math.min(freeTop - freeBottom, 1.0) : freeTop - PANEL;

      const bodyMat = isFrigo && portes === 0 ? INOX() : isLV && !habillage ? INOX() : woodMaterial(mat);
      // Matériau intérieur : teinte choisie (fonds, étagères) ou teinte foncée du caisson par défaut
      const interieurSrc = mod.interieurMaterialIndex != null ? materials[mod.interieurMaterialIndex] ?? null : null;
      const innerMat = interieurSrc ? woodMaterial(interieurSrc) : DARK(mat?.colorHex || '#D4A574', 0.85);
      // Façades : matériau dédié si choisi, style (rainuré, cannage) appliqué en texture
      const facadeSrc = mod.facadeMaterialIndex != null ? materials[mod.facadeMaterialIndex] ?? mat : mat;
      const styleF = mod.styleFacade || 'lisse';
      const facadeMat: THREE.MeshStandardMaterial = isMiroir
        ? MIRROR()
        : styleF === 'rainuree'
          ? new THREE.MeshStandardMaterial({ map: rainureTexture(facadeSrc?.colorHex || '#D4A574', facadeSrc?.grainHex || undefined, facadeSrc?.renderType || undefined), roughness: 0.6, metalness: 0.03 })
          : styleF === 'cannage'
            ? new THREE.MeshStandardMaterial({ map: cannageTexture(facadeSrc?.colorHex || '#caa66f'), roughness: 0.78, metalness: 0 })
            : woodMaterial(facadeSrc);
      const finitionHex = { noir: '#3c3c3c', inox: '#aab3b8', laiton: '#b08d57' }[config.poigneeFinition || 'noir'];
      const handleMat = new THREE.MeshStandardMaterial({ color: finitionHex, roughness: 0.35, metalness: 0.75 });
      // Température LED
      const ledWarm = (config.ledTemp || 'chaud') === 'chaud';
      const ledColors = ledWarm
        ? { strip: '#fff3c4', emissive: '#ffdf8a', light: '#ffe2a0' }
        : { strip: '#eef6ff', emissive: '#d6e9ff', light: '#dbeaff' };

      /** Cadre type « shaker » rapporté sur une façade (porte ou tiroir) */
      const addCadre = (parent: THREE.Object3D, fw: number, fh: number) => {
        if (styleF !== 'cadre' || isMiroir) return;
        const t = Math.min(0.055, fw * 0.18, fh * 0.18);
        const zOff = FACADE / 2 + 0.004;
        const rails = [
          { w: fw, h: t, x: 0, y: fh / 2 - t / 2 },
          { w: fw, h: t, x: 0, y: -(fh / 2 - t / 2) },
          { w: t, h: fh - t * 2, x: fw / 2 - t / 2, y: 0 },
          { w: t, h: fh - t * 2, x: -(fw / 2 - t / 2), y: 0 },
        ];
        for (const r of rails) {
          const m = box(r.w, r.h, 0.008, facadeMat);
          m.position.set(r.x, r.y, zOff);
          parent.add(m);
        }
      };

      if (isDecor) {
        // Éléments d'environnement : fenêtre, porte de la pièce, radiateur (non chiffrés)
        const blanc = new THREE.MeshStandardMaterial({ color: '#f7f7f4', roughness: 0.6 });
        const gris = new THREE.MeshStandardMaterial({ color: '#a8adb2', roughness: 0.5, metalness: 0.3 });
        if (type.slug === 'fenetre') {
          const frame = box(w, h, 0.07, blanc);
          frame.position.set(w / 2, h / 2, 0.035);
          mg.add(frame);
          const glass = new THREE.Mesh(
            new THREE.BoxGeometry(w - 0.12, h - 0.12, 0.01),
            new THREE.MeshStandardMaterial({ color: '#cfe2ee', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.6 })
          );
          glass.position.set(w / 2, h / 2, 0.06);
          mg.add(glass);
          const mullV = box(0.045, h - 0.1, 0.03, blanc);
          mullV.position.set(w / 2, h / 2, 0.07);
          mg.add(mullV);
          const mullH = box(w - 0.1, 0.045, 0.03, blanc);
          mullH.position.set(w / 2, h / 2, 0.07);
          mg.add(mullH);
        } else if (type.slug === 'porte_piece') {
          const slab = box(w - 0.06, h - 0.04, 0.05, blanc);
          slab.position.set(w / 2, (h - 0.04) / 2, 0.05);
          mg.add(slab);
          const chambranle = box(w, 0.07, 0.08, blanc);
          chambranle.position.set(w / 2, h - 0.035, 0.04);
          mg.add(chambranle);
          const bequille = box(0.14, 0.02, 0.02, gris);
          bequille.position.set(w - 0.12, 1.05, 0.09);
          mg.add(bequille);
        } else if (type.slug === 'radiateur') {
          const fins = Math.max(4, Math.round(w / 0.09));
          for (let i = 0; i < fins; i++) {
            const fin = box((w - 0.04) / fins - 0.012, h, 0.08, blanc);
            fin.position.set(0.02 + ((w - 0.04) / fins) * (i + 0.5), h / 2, 0.06);
            mg.add(fin);
          }
          for (const px of [0.05, w - 0.05]) {
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12), gris);
            pipe.position.set(px, -0.06, 0.06);
            mg.add(pipe);
          }
        } else if (type.slug === 'plante_pot' || type.slug === 'petite_plante') {
          // Plante : pot en terre cuite + feuillage en boules
          const potMat = new THREE.MeshStandardMaterial({ color: '#a8603f', roughness: 0.75 });
          const potH = h * 0.32;
          const pot = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.3, w * 0.22, potH, 18), potMat);
          pot.castShadow = true;
          pot.position.set(w / 2, potH / 2, d / 2);
          mg.add(pot);
          const greens = ['#48663e', '#5a7d4f', '#3f5a37'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
          const rp = rng(seedFrom(mod.id));
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, (h - potH) * 0.5), new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.8 }));
          trunk.position.set(w / 2, potH + (h - potH) * 0.25, d / 2);
          mg.add(trunk);
          for (let k = 0; k < 5; k++) {
            const fr = Math.max(w * (0.16 + rp() * 0.14), 0.05);
            const f = new THREE.Mesh(new THREE.SphereGeometry(fr, 12, 10), greens[k % 3]);
            f.castShadow = true;
            f.position.set(
              w * (0.3 + rp() * 0.4),
              potH + (h - potH) * (0.4 + rp() * 0.45),
              d / 2 + (rp() - 0.5) * Math.min(w * 0.3, d * 0.4)
            );
            mg.add(f);
          }
        } else if (type.slug === 'vase_deco') {
          // Vase en céramique + tiges
          const ceram = new THREE.MeshStandardMaterial({ color: '#c8a98a', roughness: 0.45 });
          const body = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w * 0.32, h * 0.3), 18, 14), ceram);
          body.scale.y = 1.25;
          body.castShadow = true;
          body.position.set(w / 2, h * 0.3, d / 2);
          mg.add(body);
          const neck = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.1, w * 0.14, h * 0.18, 14), ceram);
          neck.position.set(w / 2, h * 0.55, d / 2);
          mg.add(neck);
          const tige = new THREE.MeshStandardMaterial({ color: '#4e6b3f', roughness: 0.8 });
          for (const [dx, tilt] of [[-0.05, 0.22], [0.04, -0.16], [0, 0.05]]) {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, h * 0.45), tige);
            t.position.set(w / 2 + dx * w, h * 0.78, d / 2);
            t.rotation.z = tilt;
            mg.add(t);
          }
        } else if (type.slug === 'cadre_mural') {
          // Cadre / tableau accroché au mur
          const frame = box(w, h, 0.03, new THREE.MeshStandardMaterial({ color: '#8a6f4f', roughness: 0.5 }));
          frame.position.set(w / 2, h / 2, 0.015);
          mg.add(frame);
          const canvas = box(w - 0.08, h - 0.08, 0.012, new THREE.MeshStandardMaterial({ color: '#e9e6da', roughness: 0.9 }));
          canvas.position.set(w / 2, h / 2, 0.035);
          mg.add(canvas);
          const motif = box((w - 0.08) * 0.5, (h - 0.08) * 0.32, 0.004, new THREE.MeshStandardMaterial({ color: '#7d8a6b', roughness: 0.9 }));
          motif.position.set(w / 2 - w * 0.08, h / 2 + h * 0.06, 0.043);
          mg.add(motif);
          const soleil = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, h) * 0.09, Math.min(w, h) * 0.09, 0.004, 20), new THREE.MeshStandardMaterial({ color: '#c9a227', roughness: 0.6 }));
          soleil.rotation.x = Math.PI / 2;
          soleil.position.set(w / 2 + w * 0.22, h / 2 - h * 0.12, 0.043);
          mg.add(soleil);
        }
        place(mg, p, w, yBottom);
        continue;
      }

      if (isBureau) {
        // Bureau : plateau fin posé sur un caisson de tiroirs (un côté) + joue de soutien (autre côté),
        // espace pour les jambes au milieu, panneau de fond bas (modesty panel).
        const topTh = 0.03;
        const sideTh = 0.03;
        const supportH = h - topTh;          // hauteur sous le plateau
        const carcassD = Math.max(d - 0.04, 0.4);
        const pedW = Math.min(0.44, Math.max(0.3, w * 0.34)); // largeur du caisson de tiroirs
        // Caisson de tiroirs à droite, joue à gauche par défaut (inversé si ouverture gauche)
        const pedLeft = hingeSide === 'gauche';
        const pedX0 = pedLeft ? 0 : w - pedW;
        const sideX = pedLeft ? w - sideTh : 0;

        // Plateau
        const top = box(w, topTh, d, woodMaterial(mat));
        top.position.set(w / 2, h - topTh / 2, d / 2);
        mg.add(top);

        // Joue de soutien (panneau latéral plein)
        const sidePanel = box(sideTh, supportH, carcassD, bodyMat);
        sidePanel.position.set(sideX + sideTh / 2, supportH / 2, carcassD / 2 + 0.01);
        mg.add(sidePanel);

        // Caisson de tiroirs : corps + façades coulissantes (clic)
        const pedBody = box(pedW, supportH, carcassD, bodyMat);
        pedBody.position.set(pedX0 + pedW / 2, supportH / 2, carcassD / 2 + 0.01);
        mg.add(pedBody);

        const nDrawers = Math.max(1, tiroirs || 2);
        const frontZ = carcassD + 0.01 + FACADE / 2;
        for (let i = 0; i < nDrawers; i++) {
          const dh = supportH / nDrawers;
          const yC = supportH - i * dh - dh / 2;
          const dg = new THREE.Group();
          const front = box(pedW - 0.012, dh - 0.008, FACADE, facadeMat);
          front.position.set(pedX0 + pedW / 2, yC, frontZ);
          dg.add(front);
          addCadre(front, pedW - 0.012, dh - 0.008);
          const tub = box(pedW - 0.06, Math.max(dh - 0.06, 0.04), carcassD - 0.08, innerMat);
          tub.position.set(pedX0 + pedW / 2, yC - 0.015, carcassD / 2);
          dg.add(tub);
          // Poignée du tiroir
          if (handleStyle === 'bouton') {
            const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012), handleMat);
            knob.position.set(pedX0 + pedW / 2, yC, frontZ + FACADE / 2 + 0.006);
            dg.add(knob);
          } else if (handleStyle === 'barre') {
            const bar = box(pedW * 0.5, 0.014, 0.016, handleMat);
            bar.position.set(pedX0 + pedW / 2, yC + dh * 0.28, frontZ + FACADE / 2 + 0.008);
            dg.add(bar);
          }
          dg.userData = { action: 'drawer', key: `${mod.id}:bureau-t:${i}`, openZ: Math.min(carcassD * 0.6, 0.42) };
          mg.add(dg);
          state.interactives.push(dg as unknown as Interactive);
        }

        // Panneau de fond bas (modesty panel) dans l'espace des jambes
        const kneeLeft = pedLeft ? pedW + 0.02 : sideTh + 0.02;
        const kneeRight = pedLeft ? sideX : pedX0;
        const kneeW = Math.max(kneeRight - kneeLeft, 0.1);
        const modesty = box(kneeW, supportH * 0.42, 0.012, bodyMat);
        modesty.position.set((kneeLeft + kneeRight) / 2, supportH - (supportH * 0.42) / 2 - 0.02, 0.02);
        mg.add(modesty);

        // Niche de rangement ouverte sous le plateau (option « etagere »)
        if (etageres > 0) {
          const nicheShelf = box(kneeW * 0.5, 0.018, carcassD * 0.7, bodyMat);
          nicheShelf.position.set(kneeLeft + kneeW * 0.27, supportH * 0.62, carcassD * 0.35 + 0.02);
          mg.add(nicheShelf);
          const nicheDiv = box(sideTh, supportH * 0.38, carcassD * 0.7, bodyMat);
          nicheDiv.position.set(kneeLeft + kneeW * 0.52, supportH * 0.62 + (supportH * 0.38) / 2 - 0.05, carcassD * 0.35 + 0.02);
          mg.add(nicheDiv);
        }

        // Un bureau repose sur le sol (pas de plinthe de 100 mm comme les caissons)
        place(mg, p, w, 0);
        continue;
      }

      if (isHotte) {
        // Hotte : corps incliné en bas (capture), conduit qui monte vers le plafond,
        // bandeau de filtres métal sous le corps. Habillage assorti au matériau.
        const woodM = woodMaterial(mat);
        const metal = new THREE.MeshStandardMaterial({ color: '#c4c9cd', roughness: 0.35, metalness: 0.6 });
        const canopyH = Math.min(h * 0.42, 0.32);
        // Corps de la hotte (légèrement plus fin vers le haut via deux blocs)
        const canopyLow = box(w, canopyH * 0.5, d, woodM);
        canopyLow.position.set(w / 2, canopyH * 0.25, d / 2);
        mg.add(canopyLow);
        const canopyTop = box(w * 0.7, canopyH * 0.5, d * 0.7, woodM);
        canopyTop.position.set(w / 2, canopyH * 0.75, d * 0.45 + 0.01);
        mg.add(canopyTop);
        // Bandeau de filtres (dessous métal) + stries
        const under = box(w - 0.05, 0.022, d - 0.05, metal);
        under.position.set(w / 2, 0.011, d / 2);
        mg.add(under);
        for (const f of [0.38, 0.5, 0.62]) {
          const slot = box(w * 0.5, 0.004, 0.01, new THREE.MeshStandardMaterial({ color: '#7d868c', roughness: 0.5 }));
          slot.position.set(w / 2, 0.024, d * f);
          mg.add(slot);
        }
        // Conduit (cheminée) qui monte vers le plafond, adossé au mur
        const chimW = w * 0.32, chimD = Math.max(d * 0.45, 0.12);
        const chimH = Math.max(h - canopyH, 0.05);
        const chimney = box(chimW, chimH, chimD, woodM);
        chimney.position.set(w / 2, canopyH + chimH / 2, chimD / 2 + 0.02);
        mg.add(chimney);
        place(mg, p, w, yBottom);
        continue;
      }

      if (isPanneauPlein) {
        // Dalles, fileurs et joues : volume plein — le plan libre reçoit ses chants dédiés
        const chantSrc = config.planChantMaterialIndex != null ? materials[config.planChantMaterialIndex] : null;
        if (isPlanLibre && chantSrc) {
          const chantM = woodMaterial(chantSrc);
          const caisson = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [chantM, chantM, bodyMat, bodyMat, chantM, chantM]);
          caisson.castShadow = caisson.receiveShadow = true;
          caisson.position.set(w / 2, h / 2, d / 2);
          mg.add(caisson);
        } else {
          const caisson = box(w, h, d, bodyMat);
          caisson.position.set(w / 2, h / 2, d / 2);
          mg.add(caisson);
        }
      } else if (isLV) {
        // Lave-vaisselle creux : cuve inox et paniers visibles porte ouverte
        const cuveMat = new THREE.MeshStandardMaterial({ color: '#9da6ab', roughness: 0.35, metalness: 0.6 });
        const side1 = box(PANEL, h, d, bodyMat);
        side1.position.set(PANEL / 2, h / 2, d / 2);
        const side2 = side1.clone();
        side2.position.x = w - PANEL / 2;
        const bottomP = box(w - PANEL * 2, PANEL, d, bodyMat);
        bottomP.position.set(w / 2, PANEL / 2, d / 2);
        const topP = bottomP.clone();
        topP.position.y = h - PANEL / 2;
        const back = box(w - PANEL * 2, h - PANEL * 2, 0.014, cuveMat);
        back.position.set(w / 2, h / 2, 0.014);
        mg.add(side1, side2, bottomP, topP, back);
        // Paniers coulissants (grilles claires) et bras d'aspersion
        const rackMat = new THREE.MeshStandardMaterial({ color: '#cdd3d6', roughness: 0.4, metalness: 0.5 });
        for (const fy of [0.32, 0.68]) {
          const rack = box(w - 0.1, 0.018, d - 0.16, rackMat);
          rack.position.set(w / 2, h * fy, d / 2);
          mg.add(rack);
          const rim = box(w - 0.1, 0.05, 0.012, rackMat);
          rim.position.set(w / 2, h * fy + 0.034, d - 0.085);
          mg.add(rim);
        }
        const bras = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w * 0.3, 0.2), Math.min(w * 0.3, 0.2), 0.015, 20), rackMat);
        bras.position.set(w / 2, PANEL + 0.03, d / 2);
        mg.add(bras);
      } else if (isFrigo) {
        // Réfrigérateur creux : intérieur blanc visible portes ouvertes (clayettes + congélateur)
        const blancInt = new THREE.MeshStandardMaterial({ color: '#f4f6f7', roughness: 0.4 });
        const side1 = box(PANEL, h, d, bodyMat);
        side1.position.set(PANEL / 2, h / 2, d / 2);
        const side2 = side1.clone();
        side2.position.x = w - PANEL / 2;
        const bottomP = box(w - PANEL * 2, PANEL, d, bodyMat);
        bottomP.position.set(w / 2, PANEL / 2, d / 2);
        const topP = bottomP.clone();
        topP.position.y = h - PANEL / 2;
        const back = box(w - PANEL * 2, h - PANEL * 2, 0.014, blancInt);
        back.position.set(w / 2, h / 2, 0.014);
        mg.add(side1, side2, bottomP, topP, back);
        const split = h * 0.33;
        // Séparation congélateur / réfrigérateur
        const sep = box(w - PANEL * 2, PANEL, d - 0.02, blancInt);
        sep.position.set(w / 2, split, d / 2 - 0.01);
        mg.add(sep);
        // Clayettes du réfrigérateur et bac du congélateur
        const clayettes: number[] = [];
        for (const f of [0.28, 0.52, 0.76]) {
          const cy = split + (h - split - PANEL) * f;
          clayettes.push(cy);
          const shelf = box(w - PANEL * 2 - 0.02, 0.012, d - 0.1, blancInt);
          shelf.position.set(w / 2, cy, d / 2 - 0.02);
          mg.add(shelf);
        }
        const bac = box(w - PANEL * 2 - 0.04, split * 0.4, d - 0.14, blancInt);
        bac.position.set(w / 2, split * 0.28, d / 2 - 0.03);
        mg.add(bac);

        // Courses : bouteilles d'eau, fruits et légumes, plats préparés — visibles portes ouvertes
        if (w > 0.45) {
          const r = rng(seedFrom(mod.id));
          const fruitMats = ['#d4543c', '#e8a33c', '#7da04e', '#c23b4e', '#7a9e3b'].map(
            (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 })
          );
          const boxMats = ['#dfe5e8', '#cfd8a8', '#e8cfc0'].map(
            (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })
          );
          const bottleMat = new THREE.MeshStandardMaterial({ color: '#9ec4e0', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.75 });
          const xMin = PANEL + 0.06, xMax = w - PANEL - 0.06;
          const surfaces = [split + PANEL / 2 + 0.006, ...clayettes.map((cy) => cy + 0.012)];
          for (const sy of surfaces) {
            // Une à deux bouteilles
            for (let k = 0; k < 1 + (r() > 0.5 ? 1 : 0); k++) {
              const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.21, 12), bottleMat);
              bot.position.set(xMin + r() * (xMax - xMin), sy + 0.105, d / 2 + (r() - 0.5) * 0.12);
              mg.add(bot);
            }
            // Fruits et légumes
            for (let k = 0; k < 2 + ((r() * 3) | 0); k++) {
              const fr = new THREE.Mesh(new THREE.SphereGeometry(0.024 + r() * 0.014, 10, 8), fruitMats[(r() * fruitMats.length) | 0]);
              fr.position.set(xMin + r() * (xMax - xMin), sy + 0.034, d / 2 + (r() - 0.5) * 0.14);
              mg.add(fr);
            }
            // Un plat préparé / boîte
            const plat = box(0.1 + r() * 0.05, 0.05 + r() * 0.03, 0.1, boxMats[(r() * boxMats.length) | 0]);
            plat.position.set(xMin + r() * (xMax - xMin), sy + 0.04, d / 2 + (r() - 0.5) * 0.1);
            mg.add(plat);
          }
          // Congélateur : produits surgelés empilés dans le bac
          const surgMat = new THREE.MeshStandardMaterial({ color: '#dcebf4', roughness: 0.6 });
          for (let k = 0; k < 3; k++) {
            const pack = box(0.12, 0.05, 0.16, surgMat);
            pack.position.set(xMin + 0.08 + r() * Math.max(xMax - xMin - 0.16, 0.02), split * 0.48 + k * 0.015 + 0.03, d / 2 + (r() - 0.5) * 0.08);
            pack.rotation.y = (r() - 0.5) * 0.5;
            mg.add(pack);
          }
        }
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

        let shelfYs: number[] = [];
        if (mod.grille && mod.grille.colonnes >= 1) {
          // Bibliothèque à cases : colonnes régulières, étagères propres à chaque colonne
          const cols = mod.grille.colonnes;
          const x0 = PANEL, iw = w - PANEL * 2, colW = iw / cols;
          const yB = PANEL, yT = h - PANEL, gh = yT - yB;
          for (let i = 1; i < cols; i++) {
            const sep = box(PANEL, gh, d - 0.04, bodyMat);
            sep.position.set(x0 + colW * i, (yB + yT) / 2, d / 2 - 0.01);
            mg.add(sep);
          }
          const allYs = new Set<number>();
          for (let c = 0; c < cols; c++) {
            const n = mod.grille.etageresParColonne[c] ?? 0;
            const cxCenter = x0 + colW * c + colW / 2;
            for (let k = 1; k <= n; k++) {
              const sy = yB + (gh / (n + 1)) * k;
              allYs.add(Math.round(sy * 1000) / 1000);
              const sh = box(colW - PANEL, PANEL, d - 0.04, bodyMat);
              sh.position.set(cxCenter, sy, d / 2 - 0.01);
              mg.add(sh);
            }
          }
          shelfYs = [...allYs];
        } else {
          // Étagères (positions réglables, visibles dans le caisson, au-dessus des tiroirs en bas)
          shelfYs = shelfPositions(mod, mod.hauteur).map((pos) => Math.min(freeTop - 0.06, Math.max(pos * S, freeBottom + 0.06)));
          for (const sy of shelfYs) {
            const sh = box(w - PANEL * 2, PANEL, d - 0.04, bodyMat);
            sh.position.set(w / 2, sy, d / 2 - 0.01);
            mg.add(sh);
          }

          // Séparateurs verticaux : compartiments répartis sur la largeur
          for (let i = 1; i <= separateurs; i++) {
            const px = (w / (separateurs + 1)) * i;
            const sep = box(PANEL, h - PANEL * 2, d - 0.04, bodyMat);
            sep.position.set(px, h / 2, d / 2 - 0.01);
            mg.add(sep);
          }
        }

        // Range-bouteilles : croisillons en X dans le caisson
        if (isBouteilles) {
          const diag = Math.sqrt(w * w + h * h) * 0.88;
          const angle = Math.atan2(h - PANEL * 2, w - PANEL * 2);
          for (const a of [angle, -angle]) {
            const cross = box(diag, PANEL, d - 0.06, bodyMat);
            cross.position.set(w / 2, h / 2, d / 2 - 0.02);
            cross.rotation.z = a;
            mg.add(cross);
          }
        }

        // Tringles : disposition de penderie (simple/double, haut/bas) ; sinon empilées sous l'ancrage
        const railYs = isPenderie3d
          ? penderieRails(mod, freeBottom, freeTop)
          : Array.from({ length: tringles }, (_, i) => Math.max(penderieAnchorY - 0.1 - i * 0.5, freeBottom + 0.15));
        for (let i = 0; i < railYs.length; i++) {
          const y = railYs[i];
          const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w - PANEL * 2 - 0.02), handleMat);
          rod.rotation.z = Math.PI / 2;
          rod.position.set(w / 2, y, d / 2);
          mg.add(rod);

          // Vêtements suspendus à la tringle (visibles caisson ouvert)
          const rcl = rng(seedFrom(mod.id) + i * 97);
          const clothMats = ['#7d8a9b', '#a86b5a', '#5a7d6b', '#8a7a9b', '#b5a06b', '#46505c'].map(
            (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })
          );
          const nCl = w > 0.5 ? 2 + ((rcl() * 3) | 0) : 1;
          for (let k = 0; k < nCl; k++) {
            const cw = 0.15 + rcl() * 0.1;
            const ch = Math.min(0.55 + rcl() * 0.3, y - freeBottom - 0.12);
            if (ch < 0.25) break;
            const cx = PANEL + 0.1 + rcl() * Math.max(w - PANEL * 2 - 0.2, 0.05);
            const cloth = box(cw, ch, 0.035, clothMats[(rcl() * clothMats.length) | 0]);
            cloth.position.set(cx, y - 0.05 - ch / 2, d / 2);
            mg.add(cloth);
            const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.055), handleMat);
            hook.position.set(cx, y - 0.025, d / 2);
            mg.add(hook);
          }
        }

        // Livres : bibliothèques, étagères murales et niches ouvertes garnies
        const hasBooks = ['bibliotheque', 'etagere_murale', 'niche_ouverte', 'module_etageres'].includes(type.slug);
        if (hasBooks && portes === 0 && pPleine === 0) {
          const rbk = rng(seedFrom(mod.id) + 1);
          const bookMats = ['#8a3b2e', '#3e5c4b', '#31435e', '#9a7b4f', '#6e4a6e', '#b5683c', '#535b3f'].map(
            (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 })
          );
          const asc = shelfYs.slice().sort((a, b) => a - b);
          const floors = [PANEL, ...asc.map((sy) => sy + PANEL / 2)]; // faces supérieures (fond + étagères)
          const ceils = [...asc.map((sy) => sy - PANEL / 2), h - PANEL]; // faces inférieures au-dessus
          for (let s = 0; s < floors.length && s < 6; s++) {
            const surfY = floors[s] + 0.001;
            const gapH = ceils[s] - surfY;
            if (gapH < 0.14) continue;
            let bx = PANEL + 0.02 + rbk() * 0.06;
            let count = 0;
            while (bx < w - PANEL - 0.06 && count < 14) {
              if (rbk() < 0.14) { bx += 0.04 + rbk() * 0.12; continue; } // respiration entre les groupes
              if (rbk() < 0.05) break; // rayonnage partiellement garni
              const bw = 0.016 + rbk() * 0.02;
              const bh = Math.min(0.15 + rbk() * 0.1, gapH - 0.03);
              const book = box(bw, bh, Math.min(d * 0.55, 0.22), bookMats[(rbk() * bookMats.length) | 0]);
              book.position.set(bx + bw / 2, surfY + bh / 2, d / 2);
              mg.add(book);
              bx += bw + 0.004;
              count++;
            }
          }
        }

        // LED intérieure : un bandeau sous le dessus ET sous chaque étagère
        // (chaque compartiment est éclairé, partie basse comprise)
        if (ledInterieur) {
          const stripMat = new THREE.MeshStandardMaterial({ color: ledColors.strip, emissive: ledColors.emissive, emissiveIntensity: 1.6 });
          const stripYs = [h - PANEL, ...shelfYs];
          for (const sy of stripYs.slice(0, 5)) {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(w - PANEL * 2 - 0.04, 0.012, 0.03), stripMat);
            strip.position.set(w / 2, sy - PANEL / 2 - 0.012, d - 0.08);
            mg.add(strip);
          }
          const glowTop = new THREE.PointLight(ledColors.light, 2, Math.max(h * 0.8, 1), 2);
          glowTop.position.set(w / 2, h * 0.75, d / 2);
          mg.add(glowTop);
          if (h > 1.2) {
            const glowBas = new THREE.PointLight(ledColors.light, 1.6, Math.max(h * 0.7, 0.9), 2);
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
      const addDoors = (n: number, y0: number, y1: number, zone: string, mirror = false, glass = false) => {
        const dw = w / n;
        const zoneH = y1 - y0 - 0.006;
        for (let i = 0; i < n; i++) {
          // Double porte : ouverture par le centre ; porte seule : sens choisi par l'option
          const side: 'gauche' | 'droite' = n === 1 ? hingeSide : i < n / 2 ? 'gauche' : 'droite';
          const hingeX = side === 'gauche' ? i * dw + 0.003 : (i + 1) * dw - 0.003;
          const pivot = new THREE.Group();
          pivot.position.set(hingeX, (y0 + y1) / 2, d + FACADE / 2);
          const leafMat = glass
            ? new THREE.MeshStandardMaterial({ color: '#d6e6ee', roughness: 0.05, metalness: 0.25, transparent: true, opacity: 0.35 })
            : mirror ? MIRROR() : facadeMat;
          const leaf = box(dw - 0.006, zoneH, glass ? 0.008 : FACADE, leafMat);
          leaf.position.x = side === 'gauche' ? (dw - 0.006) / 2 : -(dw - 0.006) / 2;
          pivot.add(leaf);
          if (glass) {
            // Cadre de la porte vitrée dans le matériau de façade
            const t = 0.05;
            for (const r of [
              { bw: dw - 0.006, bh: t, x: 0, y: zoneH / 2 - t / 2 },
              { bw: dw - 0.006, bh: t, x: 0, y: -(zoneH / 2 - t / 2) },
              { bw: t, bh: zoneH - t * 2, x: (dw - 0.006) / 2 - t / 2, y: 0 },
              { bw: t, bh: zoneH - t * 2, x: -((dw - 0.006) / 2 - t / 2), y: 0 },
            ]) {
              const fr = box(r.bw, r.bh, FACADE, woodMaterial(facadeSrc));
              fr.position.set(leaf.position.x + r.x, r.y, 0);
              pivot.add(fr);
            }
          } else if (!mirror) {
            addCadre(leaf, dw - 0.006, zoneH);
          }
          if (!mirror) addHandle(glass ? pivot : leaf, (side === 'gauche' ? (dw - 0.006) / 2 - 0.05 : -((dw - 0.006) / 2 - 0.05)) + (glass ? leaf.position.x : 0), 0, true);
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
        // Portes pivotantes (clic pour ouvrir), sens d'ouverture configurable
        const split = h * 0.33;
        const fmat = portes > 0 ? facadeMat : INOX();
        const makeFridgeDoor = (y0: number, y1: number, zone: string) => {
          const hingeX = hingeSide === 'gauche' ? 0.003 : w - 0.003;
          const pivot = new THREE.Group();
          pivot.position.set(hingeX, (y0 + y1) / 2, d + FACADE / 2);
          const leaf = box(w - 0.008, y1 - y0 - 0.008, FACADE, fmat);
          leaf.position.x = hingeSide === 'gauche' ? (w - 0.008) / 2 : -(w - 0.008) / 2;
          pivot.add(leaf);
          // Poignée verticale du côté opposé aux charnières
          addHandle(leaf, hingeSide === 'gauche' ? (w - 0.008) / 2 - 0.06 : -((w - 0.008) / 2 - 0.06), (y1 - y0) * 0.18, true);
          pivot.userData = {
            action: 'door',
            key: `${mod.id}:frigo:${zone}`,
            openRot: hingeSide === 'gauche' ? -1.85 : 1.85,
          };
          mg.add(pivot);
          state.interactives.push(pivot as unknown as Interactive);
        };
        makeFridgeDoor(split + 0.004, h, 'haut');
        makeFridgeDoor(0, split - 0.004, 'bas');
      } else if (isLV) {
        // Porte abattante : charnière en bas, bascule vers l'avant au clic
        const pivot = new THREE.Group();
        pivot.position.set(w / 2, 0.006, d + FACADE / 2);
        const leaf = box(w - 0.01, h - 0.012, FACADE, habillage ? facadeMat : INOX());
        leaf.position.y = (h - 0.012) / 2;
        pivot.add(leaf);
        addHandle(leaf, 0, (h - 0.012) / 2 - 0.08, false);
        pivot.userData = { action: 'door', key: `${mod.id}:lv`, openRotX: 1.32 };
        mg.add(pivot);
        state.interactives.push(pivot as unknown as Interactive);
      } else if (isFour) {
        // Colonne four : façade basse, four noir vitré, micro-ondes optionnel, façade haute
        const noir = new THREE.MeshStandardMaterial({ color: '#262626', roughness: 0.35, metalness: 0.4 });
        const vitre = new THREE.MeshStandardMaterial({ color: '#0e0e0e', roughness: 0.1, metalness: 0.6 });
        const fourBottom = Math.min(h * 0.42, 0.9);
        const fourH = Math.min(0.62, h * 0.34);
        const micro = (mod.options['niche_micro_ondes'] ?? 0) > 0;
        const microH = micro ? 0.4 : 0;
        const faceBas = box(w - 0.01, fourBottom - 0.012, FACADE, facadeMat);
        faceBas.position.set(w / 2, fourBottom / 2, d + FACADE / 2);
        mg.add(faceBas);
        addCadre(faceBas, w - 0.01, fourBottom - 0.012);
        addHandle(faceBas, 0, fourBottom / 2 - 0.1, false);
        const oven = box(w - 0.02, fourH, 0.05, noir);
        oven.position.set(w / 2, fourBottom + fourH / 2, d + 0.025);
        mg.add(oven);
        const ovenGlass = box(w - 0.09, fourH - 0.22, 0.012, vitre);
        ovenGlass.position.set(w / 2, fourBottom + (fourH - 0.16) / 2 - 0.02, d + 0.052);
        mg.add(ovenGlass);
        const ovenHandle = box(w - 0.12, 0.018, 0.018, handleMat);
        ovenHandle.position.set(w / 2, fourBottom + fourH - 0.07, d + 0.07);
        mg.add(ovenHandle);
        if (micro) {
          const mw = box(w - 0.02, microH - 0.014, 0.05, noir);
          mw.position.set(w / 2, fourBottom + fourH + microH / 2, d + 0.025);
          mg.add(mw);
          const mwGlass = box((w - 0.09) * 0.62, microH - 0.13, 0.012, vitre);
          mwGlass.position.set(w / 2 - (w - 0.09) * 0.16, fourBottom + fourH + microH / 2, d + 0.052);
          mg.add(mwGlass);
        }
        const hautY0 = fourBottom + fourH + microH;
        if (h - hautY0 > 0.12) {
          const faceHaut = box(w - 0.01, h - hautY0 - 0.01, FACADE, facadeMat);
          faceHaut.position.set(w / 2, hautY0 + (h - hautY0) / 2, d + FACADE / 2);
          mg.add(faceHaut);
          addCadre(faceHaut, w - 0.01, h - hautY0 - 0.01);
          addHandle(faceHaut, 0, -(h - hautY0) / 2 + 0.08, false);
        }
      } else if (isLLinge) {
        // Colonne lave-linge : machine à hublot en bas, porte de rangement au-dessus
        const llH = Math.min(0.88, h * 0.45);
        if (habillage) {
          const face = box(w - 0.01, llH - 0.01, FACADE, facadeMat);
          face.position.set(w / 2, llH / 2, d + FACADE / 2);
          mg.add(face);
          addHandle(face, 0, llH / 2 - 0.08, false);
        } else {
          const machine = box(w - 0.03, llH - 0.02, d - 0.02, new THREE.MeshStandardMaterial({ color: '#f2f3f4', roughness: 0.35, metalness: 0.15 }));
          machine.position.set(w / 2, llH / 2, d / 2);
          mg.add(machine);
          const r = Math.min(w * 0.28, 0.21);
          const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 14, 40), new THREE.MeshStandardMaterial({ color: '#9aa3a8', roughness: 0.3, metalness: 0.6 }));
          rim.position.set(w / 2, llH / 2 - 0.04, d + 0.012);
          mg.add(rim);
          const hublot = new THREE.Mesh(
            new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.015, 36),
            new THREE.MeshStandardMaterial({ color: '#5b6a72', roughness: 0.08, metalness: 0.55 })
          );
          hublot.rotation.x = Math.PI / 2;
          hublot.position.set(w / 2, llH / 2 - 0.04, d + 0.008);
          mg.add(hublot);
        }
        addDoors(1, llH + 0.01, h, 'll');
      } else {
        // Tiroirs coulissants (clic pour ouvrir) — en bas pour une penderie, en haut sinon.
        // Si une porte fermée recouvre entièrement la zone de tiroirs, on encastre les
        // façades DERRIÈRE le plan de la porte et on retire la poignée saillante : sinon
        // poignées/cadres traverseraient la porte (la 3D n'a pas l'ordre de dessin de la 2D).
        const dBottom = drawersAtBottom ? 0 : h - drawerZone;
        const dTop = drawersAtBottom ? drawerZone : h;
        const within = (y0: number, y1: number) => dBottom >= y0 - 1e-4 && dTop <= y1 + 1e-4;
        const drawersCovered = tiroirs > 0 && (
          (pPleine > 0 && within(0, h)) ||
          (pBasse > 0 && within(0, h / 2)) ||
          (pHaute > 0 && within(h / 2, h))
        );
        const frontZ = drawersCovered ? d - FACADE / 2 : d + FACADE / 2;
        for (let i = 0; i < tiroirs; i++) {
          const th = drawerZone / tiroirs;
          const yC = drawersAtBottom ? i * th + th / 2 : h - i * th - th / 2;
          const dg = new THREE.Group(); // glisse en Z
          const front = box(w - 0.01, th - 0.008, FACADE, facadeMat);
          front.position.set(w / 2, yC, frontZ);
          dg.add(front);
          const tub = box(w - 0.08, Math.max(th - 0.07, 0.05), d - 0.12, innerMat);
          tub.position.set(w / 2, yC - 0.02, d / 2);
          dg.add(tub);
          if (!drawersCovered) {
            addCadre(front, w - 0.01, th - 0.008);
            addHandle(front, 0, 0, false);
          }
          dg.userData = { action: 'drawer', key: `${mod.id}:t:${i}`, openZ: Math.min(d * 0.6, 0.45) };
          mg.add(dg);
          state.interactives.push(dg as unknown as Interactive);
        }
        if (portes > 0) addDoors(portes, 0, h - drawerZone, 'p', isMiroir, isVitre);
        if (pPleine > 0) addDoors(pPleine, 0, h, 'pp');
        else {
          // La porte haute descend jusqu'au sommet des tiroirs (comble le vide) ; sinon coupe au milieu
          const splitDoorY = tiroirs > 0 && drawersAtBottom ? drawerZone : h / 2;
          if (pBasse > 0) addDoors(pBasse, 0, splitDoorY - 0.005, 'pb');
          if (pHaute > 0) addDoors(pHaute, splitDoorY + 0.005, h, 'ph');
        }

        // Coiffeuse : miroir rond fixé au mur au-dessus du meuble
        if (isCoiffeuse) {
          const r = Math.min(w * 0.32, 0.36);
          const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 14, 48), DARK(mat?.colorHex || '#8B6F47', 0.6));
          rim.rotation.x = 0;
          rim.position.set(w / 2, h + r + 0.08, 0.035);
          mg.add(rim);
          const glace = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 48), MIRROR());
          glace.rotation.x = Math.PI / 2;
          glace.position.set(w / 2, h + r + 0.08, 0.03);
          mg.add(glace);
        }
      }

      // Socle : plinthe (défaut) ou pieds apparents — jamais sous un panneau plein ni un module empilé
      if (!isPanneauPlein && !p.stacked && ((type.zone === 'bas' && !(mod.options['suspendu'] > 0)) || isIlot)) {
        if (socleLegs) {
          const legMat = socleLegs === 'metal' ? handleMat : DARK(mat?.colorHex || '#8B6F47', 0.6);
          for (const [lx, lz] of [[0.07, 0.07], [w - 0.07, 0.07], [0.07, d - 0.07], [w - 0.07, d - 0.07]]) {
            const leg = socleLegs === 'metal'
              ? new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, PLINTH), legMat)
              : new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.034, PLINTH), legMat);
            leg.castShadow = true;
            leg.position.set(lx, -PLINTH / 2, lz);
            mg.add(leg);
          }
        } else {
          const plMat = config.plintheMaterialIndex != null && materials[config.plintheMaterialIndex]
            ? woodMaterial(materials[config.plintheMaterialIndex])
            : DARK(mat?.colorHex || '#8B6F47');
          // Fusion : la plinthe court jusqu'au bord des modules collés pour rester continue
          const li = p.mergedLeft ? 0 : 0.02;
          const ri = p.mergedRight ? 0 : 0.02;
          const plW = w - li - ri;
          const pl = box(plW, PLINTH, d - 0.06, plMat);
          pl.position.set(li + plW / 2, -PLINTH / 2, d / 2 - 0.02);
          mg.add(pl);
        }
      }

      // Bandeau de finition en haut : panneau plein comblant le vide vers le plafond
      if (mod.bandeau && !isDecor) {
        const ceilY = (config.hauteurPlafond ?? 2500) * S;
        const bandeauTopY = mod.bandeauHauteur != null ? yBottom + h + mod.bandeauHauteur * S : ceilY;
        const bandeauH = bandeauTopY - (yBottom + h);
        if (bandeauH > 0.01) {
          const bandeau = box(w, bandeauH, d, bodyMat);
          bandeau.castShadow = bandeau.receiveShadow = true;
          // positionné dans le repère du module (origine au bas du caisson) : centre à h + bandeauH/2
          bandeau.position.set(w / 2, h + bandeauH / 2, d / 2);
          mg.add(bandeau);
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

      // LED sous meuble (extérieure)
      if ((mod.options['eclairage_sous_meuble'] ?? 0) > 0 || (mod.options['led'] ?? 0) > 0) {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(w - 0.06, 0.012, 0.03),
          new THREE.MeshStandardMaterial({ color: ledColors.strip, emissive: ledColors.emissive, emissiveIntensity: 1.4 })
        );
        strip.position.set(w / 2, -0.012, d - 0.05);
        mg.add(strip);
      }

      place(mg, p, w, yBottom);
    }

    // Plans de travail
    if (config.planTravail && univers?.planTravail?.disponible) {
      const planMat = config.planMaterialIndex != null && materials[config.planMaterialIndex]
        ? woodMaterial(materials[config.planMaterialIndex])
        : DARK(materials[config.materialIndex]?.colorHex || '#D4A574', 0.65);
      const planOv = (config.planDebord ?? 20) * S;
      const planTh = (config.planEpaisseur ?? 40) * S;
      // Chants (tranches) du plan dans leur propre matériau : faces latérales ≠ plateau
      const chantSrc = config.planChantMaterialIndex != null ? materials[config.planChantMaterialIndex] : null;
      const planBox = (bw: number, bh: number, bd: number) => {
        if (!chantSrc) return box(bw, bh, bd, planMat);
        const chantM = woodMaterial(chantSrc);
        const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), [chantM, chantM, planMat, planMat, chantM, chantM]);
        m.castShadow = m.receiveShadow = true;
        return m;
      };
      const eligible = (p: (typeof placed)[number]) =>
        p.type.zone === 'bas' && !p.type.decor && !p.stacked && !(p.module.options['suspendu'] > 0) && !((p.module.options['sans_plan'] ?? 0) > 0);
      for (const rowKey of ['principal', 'retour_gauche', 'retour_droit'] as const) {
        let run: typeof placed = [];
        const flush = () => {
          if (!run.length) return;
          const a = run[0].x * S - planOv;
          const b = (run[run.length - 1].x + run[run.length - 1].module.largeur) * S + planOv;
          const top = Math.max(...run.map((q) => (q.floorBottom + q.module.hauteur) * S));
          const rowDepth = Math.max(...run.map((q) => q.module.profondeur * S));
          if (rowKey === 'principal') {
            const plan = planBox(b - a, planTh, rowDepth + planOv * 2);
            plan.position.set((a + b) / 2, top + planTh / 2, (rowDepth + planOv * 2) / 2);
            group.add(plan);
          } else {
            // Retours du L : le plan court le long du mur latéral (axe Z)
            const plan = planBox(rowDepth + planOv * 2, planTh, b - a);
            const x = rowKey === 'retour_droit' ? cornerRight - rowDepth / 2 : rowDepth / 2;
            plan.position.set(x, top + planTh / 2, retourZ0 + (a + b) / 2);
            group.add(plan);
          }
          run = [];
        };
        for (const p of placed) {
          if (p.free || p.row !== rowKey || p.type.zone === 'ilot') continue;
          if (eligible(p)) run.push(p);
          else flush();
        }
        flush();
      }
      for (const p of placed.filter((q) => q.type.zone === 'ilot' && !((q.module.options['sans_plan'] ?? 0) > 0))) {
        const w = p.module.largeur * S, d = p.module.profondeur * S;
        const plan = planBox(w + planOv * 2 + 0.02, planTh, d + planOv * 2 + 0.02);
        plan.position.set(p.x * S + w / 2, PLINTH + p.module.hauteur * S + planTh / 2, ILOT_Z + d / 2);
        group.add(plan);
      }
    }

    // Façade coulissante : vantaux qui glissent l'un devant l'autre (clic pour ouvrir),
    // sens de coulisse matérialisé par une flèche et une poignée encastrée du bon côté.
    if (config.facadeCoulissante && univers?.facadeCoulissante?.disponible && linearWidth > 0) {
      const maxV = Math.max(1, univers.facadeCoulissante.maxVantaux ?? 3);
      const vantaux = Math.min(maxV, Math.max(1, config.facadeVantaux ?? 2));
      const mainMat = materials[config.materialIndex];
      const zF = maxDepth + 0.06;
      const hF = maxTop * S;
      const totalW = linearWidth * S;
      const panelStep = totalW / vantaux;          // emprise d'un vantail
      const overlap = vantaux > 1 ? 0.05 : 0;      // recouvrement entre vantaux voisins
      const pw = panelStep + overlap;
      const finitionHexF = { noir: '#3c3c3c', inox: '#aab3b8', laiton: '#b08d57' }[config.poigneeFinition || 'inox'] ?? '#aab3b8';
      const handleMatF = new THREE.MeshStandardMaterial({ color: finitionHexF, roughness: 0.35, metalness: 0.75 });
      const arrowMat = new THREE.MeshStandardMaterial({ color: '#2C5F2D', roughness: 0.5, emissive: '#173d18', emissiveIntensity: 0.25 });
      // Rail haut (sur toute la largeur)
      const rail = box(totalW + 0.08, 0.05, 0.12, DARK(mainMat?.colorHex || '#D4A574', 0.45));
      rail.position.set(totalW / 2, hF + 0.025, zF);
      group.add(rail);
      for (let i = 0; i < vantaux; i++) {
        const onFront = i % 2 === 1;               // un rail avant, un rail arrière
        const z = zF + (onFront ? 0.03 : 0);
        const baseX = panelStep * i + pw / 2 - overlap / 2;
        // Sens de coulisse : le dernier vantail glisse vers l'intérieur, les autres alternent
        const dir = vantaux === 1 ? 1 : i === vantaux - 1 ? -1 : i % 2 === 0 ? 1 : -1;
        const openX = vantaux > 1 ? dir * panelStep * 0.96 : panelStep * 0.6;
        const panelH = hF - (onFront ? 0.015 : 0);

        const outer = new THREE.Group();           // emplacement fermé du vantail
        outer.position.set(baseX, 0, z);
        const slider = new THREE.Group();          // partie qui glisse en X (interactive)

        const panelMat = woodMaterial(mainMat);
        panelMat.transparent = true;
        panelMat.opacity = 0.6;
        const panel = box(pw, panelH, FACADE, panelMat);
        panel.position.set(0, panelH / 2, 0);
        slider.add(panel);

        // Poignée verticale encastrée du côté vers lequel le vantail glisse
        const grip = box(0.022, panelH * 0.5, 0.03, handleMatF);
        grip.position.set(dir * (pw / 2 - 0.05), panelH * 0.5, FACADE / 2 + 0.012);
        slider.add(grip);

        // Flèche du sens de coulisse (hampe + pointe) au milieu du vantail
        const arrowX = dir * (pw * 0.18);
        const shaft = box(0.12, 0.02, 0.02, arrowMat);
        shaft.position.set(arrowX, panelH * 0.5, FACADE / 2 + 0.02);
        slider.add(shaft);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 16), arrowMat);
        tip.rotation.z = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
        tip.position.set(arrowX + dir * 0.09, panelH * 0.5, FACADE / 2 + 0.02);
        slider.add(tip);

        slider.userData = { action: 'slide', key: `facade:slide:${i}`, openX };
        outer.add(slider);
        group.add(outer);
        state.interactives.push(slider as unknown as Interactive);
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
    // Silhouette d'échelle : posée au sol, juste à droite de la composition
    state.human.position.set(totalWidth * S / 2 + 0.7, 0.9, 0.3);

    // Restaure instantanément les portes/tiroirs déjà ouverts
    for (const it of state.interactives) {
      const open = openMapRef.current.get(it.userData.key) || false;
      if (it.userData.action === 'door') {
        if (it.userData.openRotX !== undefined) it.rotation.x = open ? it.userData.openRotX : 0;
        else it.rotation.y = open ? (it.userData.openRot || 0) : 0;
      } else if (it.userData.action === 'slide') it.position.x = open ? (it.userData.openX || 0) : 0;
      else it.position.z = open ? (it.userData.openZ || 0) : 0;
    }

    const hasIlot = placed.some((p) => p.type.zone === 'ilot');
    const center = new THREE.Vector3(0, (maxTop * S) * 0.45, hasIlot ? ILOT_Z / 2 : 0.3);
    const radius = Math.max(totalWidth * S, maxTop * S, 2);
    fitRef.current = { center, radius };
    state.controls.target.copy(center);
    // Les grandes compositions doivent rester atteignables au zoom comme au déplacement
    state.controls.maxDistance = Math.max(16, radius * 3);

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

  /* Réalité augmentée : exporte la composition en GLB (Android) + USDZ (iOS) à l'échelle réelle */
  const launchAr = useCallback(async () => {
    const state = stateRef.current;
    if (!state?.group || arBusy) return;
    setArBusy(true);
    try {
      // Masque le surligneur de sélection pendant l'export
      const hidden: THREE.Object3D[] = [];
      state.group.traverse((o) => {
        if ((o as unknown as { isBoxHelper?: boolean }).isBoxHelper) { o.visible = false; hidden.push(o); }
      });

      const glbBuf = await new Promise<ArrayBuffer>((resolve, reject) => {
        new GLTFExporter().parse(
          state.group!,
          (res) => resolve(res as ArrayBuffer),
          (err) => reject(err),
          { binary: true, onlyVisible: true }
        );
      });
      const glb = URL.createObjectURL(new Blob([glbBuf], { type: 'model/gltf-binary' }));

      let usdz = '';
      try {
        const u8 = await new USDZExporter().parseAsync(state.group!);
        usdz = URL.createObjectURL(new Blob([u8 as BlobPart], { type: 'model/vnd.usdz+zip' }));
      } catch { /* USDZ optionnel (iOS) */ }

      hidden.forEach((o) => (o.visible = true));
      setArUrls({ glb, usdz });
    } catch (e) {
      console.error('AR export error', e);
      alert("La préparation de la réalité augmentée a échoué. Réessayez, ou simplifiez la composition.");
    } finally {
      setArBusy(false);
    }
  }, [arBusy]);

  const closeAr = useCallback(() => {
    setArUrls((prev) => {
      if (prev) { URL.revokeObjectURL(prev.glb); if (prev.usdz) URL.revokeObjectURL(prev.usdz); }
      return null;
    });
  }, []);

  const FLOORS: { key: typeof floorStyle; label: string }[] = [
    { key: 'parquet', label: 'Parquet' },
    { key: 'carrelage', label: 'Carrelage' },
    { key: 'beton', label: 'Béton' },
    { key: 'uni', label: 'Uni' },
  ];

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

      {/* Ambiance de la pièce */}
      <div className="absolute top-3 right-3 bg-white/95 rounded-2xl ring-1 ring-noir/10 px-3 py-2.5 space-y-2 w-44">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-noir cursor-pointer">
            <input type="color" value={wall} onChange={(e) => setWall(e.target.value)} aria-label="Couleur du mur" className="w-5 h-5 rounded-full border-0 bg-transparent cursor-pointer" />
            Mur
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-noir cursor-pointer">
            <input type="color" value={floor} onChange={(e) => setFloor(e.target.value)} aria-label="Couleur du sol" className="w-5 h-5 rounded-full border-0 bg-transparent cursor-pointer" />
            Sol
          </label>
        </div>
        <select
          value={floorStyle}
          onChange={(e) => setFloorStyle(e.target.value as typeof floorStyle)}
          aria-label="Matière du sol"
          className="w-full text-xs font-medium text-noir bg-beige/60 rounded-lg px-2 py-1.5 focus:outline-none"
        >
          {FLOORS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <div className="flex bg-beige/60 rounded-full p-0.5" role="group" aria-label="Ambiance lumineuse">
          {(['jour', 'soir'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAmbiance(a)}
              aria-pressed={ambiance === a}
              className={`flex-1 text-xs font-bold rounded-full py-1 transition-colors ${ambiance === a ? 'bg-white text-noir shadow-sm' : 'text-noir/55'}`}
            >
              {a === 'jour' ? '☀️ Jour' : '🌙 Soir'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowHuman((v) => !v)}
          aria-pressed={showHuman}
          className={`w-full text-xs font-semibold rounded-full py-1 transition-colors ${showHuman ? 'bg-noir text-white' : 'bg-beige/60 text-noir/60'}`}
        >
          🧍 Échelle 1,80 m
        </button>
      </div>

      {/* Réalité augmentée */}
      <button
        onClick={launchAr}
        disabled={arBusy}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-vert-foret text-white rounded-full shadow-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {arBusy ? 'Préparation…' : (<>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 3v18M4 7.5l8 4.5 8-4.5" />
          </svg>
          Voir chez moi
        </>)}
      </button>

      <p className="absolute bottom-3 left-3 text-xs text-noir/60 bg-white/90 px-3 py-1.5 rounded-full whitespace-nowrap max-w-[calc(100%-150px)] truncate">
        Clic sur une porte/tiroir pour l&apos;ouvrir · glisser pour tourner
      </p>

      {arUrls && <ArViewer glbUrl={arUrls.glb} usdzUrl={arUrls.usdz} onClose={closeAr} />}
    </div>
  );
}

export default Compo3D;
