'use client';

import type { Configurateur2DConfig, ConfigurateurMaterial, ConfigurateurProductType } from '@/lib/types';
import { computeViewBox, viewBoxString } from './svgUtils';
import { SVGFurniture } from './SVGFurniture';
import { SVGWorktop } from './SVGWorktop';
import { SVGShelf } from './SVGShelf';
import { SVGDimensionLines } from './SVGDimensionLines';

interface Props {
  config: Configurateur2DConfig;
  materials: ConfigurateurMaterial[];
  productTypes: ConfigurateurProductType[];
}

export function SVGRenderer({ config, materials, productTypes }: Props) {
  const material = materials[config.materialIndex] || materials[0];
  const productType = productTypes.find((t) => t.slug === config.productSlug);
  const color = material?.colorHex || '#D4A574';
  const isWorktop = productType?.optionsCategorie === 'worktop';

  // For worktop use largeur x profondeur (top-down), for others use largeur x hauteur (front view)
  const svgW = config.largeur;
  const svgH = isWorktop ? config.profondeur : config.hauteur;
  const vb = computeViewBox(svgW, svgH);

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg
        viewBox={viewBoxString(vb)}
        className="max-w-full max-h-full"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="shadow2d" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="3" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.12" />
          </filter>
        </defs>

        <g filter="url(#shadow2d)">
          {productType?.optionsCategorie === 'furniture' && (
            <SVGFurniture config={config} color={color} />
          )}
          {productType?.optionsCategorie === 'worktop' && (
            <SVGWorktop config={config} color={color} />
          )}
          {productType?.optionsCategorie === 'shelf' && (
            <SVGShelf config={config} color={color} />
          )}
        </g>

        <SVGDimensionLines
          widthMm={svgW}
          heightMm={svgH}
          depthMm={isWorktop ? undefined : config.profondeur}
        />
      </svg>
    </div>
  );
}
