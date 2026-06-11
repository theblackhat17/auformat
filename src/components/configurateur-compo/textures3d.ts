import * as THREE from 'three';

/**
 * Textures procédurales pour le rendu 3D : panneaux mélaminés unis et décors bois.
 * Générées en canvas (aucune image à héberger), pilotées par les champs admin
 * des matériaux : couleur de base (color_hex) + couleur de veinage (grain_hex).
 */

const cache = new Map<string, THREE.CanvasTexture>();

function makeCanvas(size = 512): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return canvas.getContext('2d')!;
}

/* Bruit déterministe (pas de Math.random : textures stables entre rendus) */
function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toTexture(ctx: CanvasRenderingContext2D): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Panneau uni : teinte plate + très léger grain de surface (aspect mélaminé). */
export function uniTexture(colorHex: string): THREE.CanvasTexture {
  const key = `uni:${colorHex}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 256;
  const ctx = makeCanvas(size);
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, size, size);

  const rnd = mulberry(7);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 7; // bruit très discret
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  const tex = toTexture(ctx);
  cache.set(key, tex);
  return tex;
}

/** Décor bois : fond + veines verticales ondulées + fines stries, façon placage. */
export function woodTexture(baseHex: string, grainHex: string): THREE.CanvasTexture {
  const key = `bois:${baseHex}:${grainHex}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 512;
  const ctx = makeCanvas(size);
  const rnd = mulberry(42);

  // Fond : léger dégradé de la teinte de base
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(0.5, shade(baseHex, 1.05));
  grad.addColorStop(1, baseHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Fines stries verticales sur toute la hauteur
  for (let i = 0; i < 140; i++) {
    const x = rnd() * size;
    ctx.strokeStyle = withAlpha(grainHex, 0.05 + rnd() * 0.07);
    ctx.lineWidth = 0.5 + rnd() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, -4);
    // ondulation douce, raccord haut/bas pour la répétition
    const drift = (rnd() - 0.5) * 14;
    ctx.bezierCurveTo(x + drift, size * 0.33, x - drift, size * 0.66, x, size + 4);
    ctx.stroke();
  }

  // Veines principales plus marquées
  for (let i = 0; i < 16; i++) {
    const x = rnd() * size;
    ctx.strokeStyle = withAlpha(grainHex, 0.22 + rnd() * 0.2);
    ctx.lineWidth = 1.2 + rnd() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, -4);
    const d1 = (rnd() - 0.5) * 30;
    const d2 = (rnd() - 0.5) * 30;
    ctx.bezierCurveTo(x + d1, size * 0.3, x + d2, size * 0.7, x, size + 4);
    ctx.stroke();
  }

  // Quelques nœuds discrets
  for (let i = 0; i < 3; i++) {
    const cx = rnd() * size, cy = rnd() * size;
    for (let r = 6; r > 0; r -= 1.6) {
      ctx.strokeStyle = withAlpha(grainHex, 0.16);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 2.4, r, 0.25, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const tex = toTexture(ctx);
  cache.set(key, tex);
  return tex;
}

function shade(hex: string, f: number): string {
  const n = hex.replace('#', '');
  if (n.length !== 6) return hex;
  const c = (i: number) => Math.max(0, Math.min(255, Math.round(parseInt(n.slice(i, i + 2), 16) * f)));
  return `rgb(${c(0)}, ${c(2)}, ${c(4)})`;
}

function withAlpha(hex: string, a: number): string {
  const n = hex.replace('#', '');
  if (n.length !== 6) return `rgba(110,80,50,${a})`;
  return `rgba(${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)}, ${a})`;
}
