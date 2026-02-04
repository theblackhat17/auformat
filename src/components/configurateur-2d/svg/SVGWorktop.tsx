import type { Configurateur2DConfig } from '@/lib/types';

interface Props {
  config: Configurateur2DConfig;
  color: string;
}

export function SVGWorktop({ config, color }: Props) {
  const w = config.largeur;
  const h = config.profondeur; // top-down view uses depth as height
  const ep = config.epaisseur;

  const darkerColor = darken(color, 15);
  const rx = config.edgeType === 'arrondi' ? 12 : config.edgeType === 'chanfrein' ? 4 : 0;

  return (
    <g className="worktop" style={{ transition: 'all 300ms ease' }}>
      {/* Main shape */}
      {config.worktopShape === 'rectangle' && (
        <rect x={0} y={0} width={w} height={h} fill={color} stroke={darkerColor} strokeWidth={2} rx={rx} />
      )}

      {config.worktopShape === 'L' && (
        <path
          d={`M ${rx} 0 L ${w - rx} 0 Q ${w} 0 ${w} ${rx} L ${w} ${h * 0.6 - rx} Q ${w} ${h * 0.6} ${w - rx} ${h * 0.6} L ${w * 0.5 + rx} ${h * 0.6} Q ${w * 0.5} ${h * 0.6} ${w * 0.5} ${h * 0.6 + rx} L ${w * 0.5} ${h - rx} Q ${w * 0.5} ${h} ${w * 0.5 - rx} ${h} L ${rx} ${h} Q 0 ${h} 0 ${h - rx} L 0 ${rx} Q 0 0 ${rx} 0 Z`}
          fill={color}
          stroke={darkerColor}
          strokeWidth={2}
        />
      )}

      {config.worktopShape === 'U' && (
        <path
          d={`M ${rx} 0 L ${w - rx} 0 Q ${w} 0 ${w} ${rx} L ${w} ${h - rx} Q ${w} ${h} ${w - rx} ${h} L ${w * 0.7 + rx} ${h} Q ${w * 0.7} ${h} ${w * 0.7} ${h - rx} L ${w * 0.7} ${h * 0.4 + rx} Q ${w * 0.7} ${h * 0.4} ${w * 0.7 - rx} ${h * 0.4} L ${w * 0.3 + rx} ${h * 0.4} Q ${w * 0.3} ${h * 0.4} ${w * 0.3} ${h * 0.4 + rx} L ${w * 0.3} ${h - rx} Q ${w * 0.3} ${h} ${w * 0.3 - rx} ${h} L ${rx} ${h} Q 0 ${h} 0 ${h - rx} L 0 ${rx} Q 0 0 ${rx} 0 Z`}
          fill={color}
          stroke={darkerColor}
          strokeWidth={2}
        />
      )}

      {/* Thickness indicator */}
      <text
        x={w / 2}
        y={-10}
        textAnchor="middle"
        fontSize={14}
        fill="#888"
        fontFamily="sans-serif"
      >
        Ep. {ep} mm (vue dessus)
      </text>

      {/* Round cutouts */}
      {Array.from({ length: config.nbDecoupesRondes }).map((_, i) => {
        const cx = w * (0.25 + i * 0.25);
        const cy = h * 0.4;
        const r = Math.min(40, h * 0.12);
        return (
          <circle
            key={`cut-round-${i}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="#F5F3EF"
            stroke={darkerColor}
            strokeWidth={1.5}
            strokeDasharray="4,3"
            style={{ transition: 'all 300ms ease' }}
          />
        );
      })}

      {/* Rectangular cutouts */}
      {Array.from({ length: config.nbDecoupesRect }).map((_, i) => {
        const rx2 = w * (0.55 + i * 0.2);
        const ry2 = h * 0.25;
        const rw = Math.min(80, w * 0.12);
        const rh = Math.min(50, h * 0.15);
        return (
          <rect
            key={`cut-rect-${i}`}
            x={rx2}
            y={ry2}
            width={rw}
            height={rh}
            fill="#F5F3EF"
            stroke={darkerColor}
            strokeWidth={1.5}
            strokeDasharray="4,3"
            rx={3}
            style={{ transition: 'all 300ms ease' }}
          />
        );
      })}

      {/* Edge style indicator lines */}
      {config.edgeType !== 'droit' && (
        <rect
          x={-2}
          y={-2}
          width={w + 4}
          height={h + 4}
          fill="none"
          stroke={darkerColor}
          strokeWidth={0.5}
          strokeDasharray="2,6"
          rx={rx + 2}
          opacity={0.3}
        />
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
