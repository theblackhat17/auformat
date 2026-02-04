import type { Configurateur2DConfig } from '@/lib/types';

interface Props {
  config: Configurateur2DConfig;
  color: string;
}

export function SVGShelf({ config, color }: Props) {
  const w = config.largeur;
  const h = config.hauteur;
  const ep = config.epaisseur;

  const darkerColor = darken(color, 15);
  const lighterColor = lighten(color, 10);

  // Shelf levels
  const levels = config.nbNiveaux;
  const levelSpacing = h / (levels + 1);

  // Separators per level
  const seps = config.nbSeparateurs;

  return (
    <g className="shelf" style={{ transition: 'all 300ms ease' }}>
      {/* Back panel (subtle) */}
      <rect
        x={ep}
        y={ep}
        width={w - 2 * ep}
        height={h - 2 * ep}
        fill={lighterColor}
        stroke="none"
        opacity={0.2}
      />

      {/* Frame: left upright */}
      <rect x={0} y={0} width={ep} height={h} fill={color} stroke={darkerColor} strokeWidth={1} />
      {/* Frame: right upright */}
      <rect x={w - ep} y={0} width={ep} height={h} fill={color} stroke={darkerColor} strokeWidth={1} />
      {/* Frame: top */}
      <rect x={0} y={0} width={w} height={ep} fill={color} stroke={darkerColor} strokeWidth={1} />
      {/* Frame: bottom */}
      <rect x={0} y={h - ep} width={w} height={ep} fill={color} stroke={darkerColor} strokeWidth={1} />

      {/* Shelf levels */}
      {Array.from({ length: levels }).map((_, i) => {
        const y = (i + 1) * levelSpacing;
        return (
          <rect
            key={`level-${i}`}
            x={ep}
            y={y - ep / 2}
            width={w - 2 * ep}
            height={ep}
            fill={color}
            stroke={darkerColor}
            strokeWidth={0.5}
            style={{ transition: 'all 300ms ease' }}
          />
        );
      })}

      {/* Vertical separators */}
      {seps > 0 && Array.from({ length: seps }).map((_, i) => {
        const x = (w - 2 * ep) * ((i + 1) / (seps + 1)) + ep;
        return (
          <rect
            key={`sep-${i}`}
            x={x - ep / 4}
            y={ep}
            width={ep / 2}
            height={h - 2 * ep}
            fill={color}
            stroke={darkerColor}
            strokeWidth={0.5}
            style={{ transition: 'all 300ms ease' }}
          />
        );
      })}

      {/* Mounting indicators */}
      {config.mountingType === 'murale' && (
        <g>
          {[w * 0.2, w * 0.8].map((x, i) => (
            <g key={`mount-${i}`}>
              <circle cx={x} cy={-10} r={5} fill="none" stroke="#888" strokeWidth={1.5} />
              <line x1={x} y1={-5} x2={x} y2={0} stroke="#888" strokeWidth={1} strokeDasharray="2,2" />
            </g>
          ))}
          <text x={w / 2} y={-20} textAnchor="middle" fontSize={11} fill="#888" fontFamily="sans-serif">
            Fixation murale
          </text>
        </g>
      )}

      {config.mountingType === 'sol' && (
        <g>
          {[w * 0.15, w * 0.85].map((x, i) => (
            <rect
              key={`foot-${i}`}
              x={x - 8}
              y={h}
              width={16}
              height={20}
              fill={darkerColor}
              rx={2}
            />
          ))}
          <text x={w / 2} y={h + 35} textAnchor="middle" fontSize={11} fill="#888" fontFamily="sans-serif">
            Fixation au sol
          </text>
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
