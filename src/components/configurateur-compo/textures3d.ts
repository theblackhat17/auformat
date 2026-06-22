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

/** Façade rainurée verticale : base unie ou veinée + rainures régulières ombrées. */
export function rainureTexture(baseHex: string, grainHex: string | undefined, renderType: string | undefined): THREE.CanvasTexture {
  const key = `rainure:${baseHex}:${grainHex}:${renderType}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 512;
  const ctx = makeCanvas(size);
  // Fond : la texture du matériau (uni ou bois) redessinée
  const base = renderType === 'bois' ? woodTexture(baseHex, grainHex || '#8B6F47') : uniTexture(baseHex);
  ctx.drawImage(base.image as HTMLCanvasElement, 0, 0, size, size);

  // Rainures : une gorge sombre + un rebord clair, toutes les ~64 px (≈ tasseau de 60 mm)
  const step = 64;
  for (let x = step; x < size; x += step) {
    const g = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.38)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.45)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 6, 0, 12, size);
  }

  const tex = toTexture(ctx);
  cache.set(key, tex);
  return tex;
}

/** Façade cannage : tressage ajouré sur fond sombre, encadré par la teinte du matériau. */
export function cannageTexture(baseHex: string): THREE.CanvasTexture {
  const key = `cannage:${baseHex}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 512;
  const ctx = makeCanvas(size);
  // Fond sombre : l'intérieur entrevu à travers le tressage
  ctx.fillStyle = '#2e2418';
  ctx.fillRect(0, 0, size, size);

  // Tressage : brins diagonaux croisés (canne claire, tons rotin)
  const brin = shade(baseHex, 1.18);
  const brinSombre = shade(baseHex, 0.85);
  ctx.lineCap = 'round';
  const step = 26;
  for (let off = -size; off < size * 2; off += step) {
    ctx.strokeStyle = brin;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(off, -8);
    ctx.lineTo(off + size, size + 8);
    ctx.stroke();
  }
  for (let off = -size; off < size * 2; off += step) {
    ctx.strokeStyle = brinSombre;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(off + size, -8);
    ctx.lineTo(off, size + 8);
    ctx.stroke();
  }
  // Trous du cannage : points sombres réguliers aux croisements
  ctx.fillStyle = 'rgba(30,22,12,0.85)';
  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = toTexture(ctx);
  cache.set(key, tex);
  return tex;
}

/** Sol parquet : lames horizontales décalées, veinage léger. */
export function floorParquet(baseHex: string): THREE.CanvasTexture {
  const key = `floor-parquet:${baseHex}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const size = 512;
  const ctx = makeCanvas(size);
  const rnd = mulberry(11);
  ctx.fillStyle = shade(baseHex, 0.92);
  ctx.fillRect(0, 0, size, size);
  const rows = 6;
  const rowH = size / rows;
  const plankW = size / 2.5;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (plankW / 2);
    for (let x = -plankW; x < size + plankW; x += plankW) {
      const px = x + offset;
      const tone = shade(baseHex, 0.86 + rnd() * 0.22);
      ctx.fillStyle = tone;
      ctx.fillRect(px + 1, r * rowH + 1, plankW - 2, rowH - 2);
      // veines
      ctx.strokeStyle = withAlpha(shade(baseHex, 0.6), 0.18);
      ctx.lineWidth = 1;
      for (let k = 0; k < 4; k++) {
        const vy = r * rowH + 4 + rnd() * (rowH - 8);
        ctx.beginPath();
        ctx.moveTo(px + 3, vy);
        ctx.lineTo(px + plankW - 3, vy + (rnd() - 0.5) * 4);
        ctx.stroke();
      }
    }
  }
  const tex = toTexture(ctx);
  tex.repeat.set(8, 8);
  cache.set(key, tex);
  return tex;
}

/** Sol carrelage : grille de carreaux avec joints. */
export function floorCarrelage(baseHex: string): THREE.CanvasTexture {
  const key = `floor-carrelage:${baseHex}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const size = 512;
  const ctx = makeCanvas(size);
  const rnd = mulberry(23);
  const joint = shade(baseHex, 0.7);
  ctx.fillStyle = joint;
  ctx.fillRect(0, 0, size, size);
  const tiles = 4;
  const tileSize = size / tiles;
  const gap = 6;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      ctx.fillStyle = shade(baseHex, 0.95 + rnd() * 0.1);
      ctx.fillRect(x * tileSize + gap / 2, y * tileSize + gap / 2, tileSize - gap, tileSize - gap);
      // léger reflet
      ctx.fillStyle = withAlpha('#ffffff', 0.05);
      ctx.fillRect(x * tileSize + gap / 2, y * tileSize + gap / 2, tileSize - gap, (tileSize - gap) * 0.4);
    }
  }
  const tex = toTexture(ctx);
  tex.repeat.set(10, 10);
  cache.set(key, tex);
  return tex;
}

/** Sol béton ciré : mouchetures douces. */
export function floorBeton(baseHex: string): THREE.CanvasTexture {
  const key = `floor-beton:${baseHex}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const size = 256;
  const ctx = makeCanvas(size);
  const rnd = mulberry(37);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const a = (rnd() - 0.5) * 0.16;
    ctx.fillStyle = a > 0 ? withAlpha('#ffffff', a) : withAlpha('#000000', -a);
    const r = 1 + rnd() * 3;
    ctx.beginPath();
    ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = toTexture(ctx);
  tex.repeat.set(6, 6);
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
