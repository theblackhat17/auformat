import type { Configurateur2DConfig } from '@/lib/types';
import { shelfY, drawerY, drawerHeight, doorWidth, footPositions } from './svgUtils';

interface Props {
  config: Configurateur2DConfig;
  color: string;
}

export function SVGFurniture({ config, color }: Props) {
  const w = config.largeur;
  const h = config.hauteur;
  const thickness = config.epaisseur;

  const darkerColor = darken(color, 15);
  const lighterColor = lighten(color, 10);
  const dH = drawerHeight(h, config.nbTiroirs);

  return (
    <g className="furniture" style={{ transition: 'all 300ms ease' }}>
      {/* Back panel */}
      {config.avecDos && (
        <rect x={thickness} y={thickness} width={w - 2 * thickness} height={h - 2 * thickness} fill={lighterColor} stroke={darkerColor} strokeWidth={0.5} opacity={0.3} />
      )}

      {/* Case/body */}
      {/* Left side */}
      <rect x={0} y={0} width={thickness} height={h} fill={color} stroke={darkerColor} strokeWidth={1} />
      {/* Right side */}
      <rect x={w - thickness} y={0} width={thickness} height={h} fill={color} stroke={darkerColor} strokeWidth={1} />
      {/* Top */}
      <rect x={0} y={0} width={w} height={thickness} fill={color} stroke={darkerColor} strokeWidth={1} />
      {/* Bottom */}
      <rect x={0} y={h - thickness} width={w} height={thickness} fill={color} stroke={darkerColor} strokeWidth={1} />

      {/* Shelves */}
      {Array.from({ length: config.nbEtageres }).map((_, i) => {
        const y = shelfY(h, i, config.nbEtageres);
        return (
          <rect
            key={`shelf-${i}`}
            x={thickness}
            y={y - thickness / 2}
            width={w - 2 * thickness}
            height={thickness}
            fill={color}
            stroke={darkerColor}
            strokeWidth={0.5}
            style={{ transition: 'all 300ms ease' }}
          />
        );
      })}

      {/* Drawers */}
      {Array.from({ length: config.nbTiroirs }).map((_, i) => {
        const y = drawerY(h, i, config.nbTiroirs);
        return (
          <g key={`drawer-${i}`} style={{ transition: 'all 300ms ease' }}>
            <rect
              x={thickness + 2}
              y={y}
              width={w - 2 * thickness - 4}
              height={dH - 2}
              fill={lighterColor}
              stroke={darkerColor}
              strokeWidth={1}
              rx={2}
            />
            {/* Handle */}
            <rect
              x={w / 2 - 20}
              y={y + dH / 2 - 3}
              width={40}
              height={6}
              fill={darkerColor}
              rx={3}
            />
          </g>
        );
      })}

      {/* Doors */}
      {config.porteType !== 'aucune' && config.nbPortes > 0 && (
        <g>
          {Array.from({ length: config.nbPortes }).map((_, i) => {
            const dw = doorWidth(w, config.nbPortes);
            const x = i * dw;
            const doorStartY = thickness;
            const doorEndY = config.nbTiroirs > 0
              ? drawerY(h, config.nbTiroirs - 1, config.nbTiroirs)
              : h - thickness;
            const doorH = doorEndY - doorStartY;

            return (
              <g key={`door-${i}`} style={{ transition: 'all 300ms ease' }}>
                <rect
                  x={x + 3}
                  y={doorStartY + 2}
                  width={dw - 6}
                  height={doorH - 4}
                  fill="none"
                  stroke={darkerColor}
                  strokeWidth={1.5}
                  strokeDasharray={config.porteType === 'coulissante' ? '8,4' : 'none'}
                  rx={3}
                />
                {/* Handle */}
                {config.porteType === 'battante' && (
                  <circle
                    cx={i % 2 === 0 ? x + dw - 20 : x + 20}
                    cy={doorStartY + doorH / 2}
                    r={5}
                    fill={darkerColor}
                  />
                )}
                {config.porteType === 'coulissante' && (
                  <rect
                    x={x + dw / 2 - 2}
                    y={doorStartY + doorH / 2 - 15}
                    width={4}
                    height={30}
                    fill={darkerColor}
                    rx={2}
                  />
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* Feet */}
      {config.piedType !== 'sans' && (
        <g>
          {footPositions(w).map((x, i) => {
            const footH = 30;
            if (config.piedType === 'rond') {
              return (
                <ellipse
                  key={`foot-${i}`}
                  cx={x}
                  cy={h + footH / 2}
                  rx={12}
                  ry={footH / 2}
                  fill={darkerColor}
                  style={{ transition: 'all 300ms ease' }}
                />
              );
            }
            if (config.piedType === 'carre') {
              return (
                <rect
                  key={`foot-${i}`}
                  x={x - 10}
                  y={h}
                  width={20}
                  height={footH}
                  fill={darkerColor}
                  style={{ transition: 'all 300ms ease' }}
                />
              );
            }
            // oblique
            return (
              <polygon
                key={`foot-${i}`}
                points={`${x - 6},${h} ${x + 6},${h} ${x + 14},${h + footH} ${x - 14},${h + footH}`}
                fill={darkerColor}
                style={{ transition: 'all 300ms ease' }}
              />
            );
          })}
        </g>
      )}
    </g>
  );
}

function darken(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function lighten(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
