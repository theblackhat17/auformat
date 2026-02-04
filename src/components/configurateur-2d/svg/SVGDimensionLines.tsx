import { scaleFontSize } from './svgUtils';

interface Props {
  widthMm: number;
  heightMm: number;
  depthMm?: number;
  stroke?: string;
}

export function SVGDimensionLines({ widthMm, heightMm, depthMm, stroke = '#888' }: Props) {
  const fontSize = scaleFontSize(widthMm);
  const offset = 25;
  const tickLen = 8;

  return (
    <g className="dimension-lines" style={{ transition: 'all 300ms ease' }}>
      {/* Width dimension (bottom) */}
      <line x1={0} y1={heightMm + offset} x2={widthMm} y2={heightMm + offset} stroke={stroke} strokeWidth={1} />
      <line x1={0} y1={heightMm + offset - tickLen} x2={0} y2={heightMm + offset + tickLen} stroke={stroke} strokeWidth={1} />
      <line x1={widthMm} y1={heightMm + offset - tickLen} x2={widthMm} y2={heightMm + offset + tickLen} stroke={stroke} strokeWidth={1} />
      <text
        x={widthMm / 2}
        y={heightMm + offset + fontSize + 4}
        textAnchor="middle"
        fontSize={fontSize}
        fill={stroke}
        fontFamily="sans-serif"
      >
        {widthMm} mm
      </text>

      {/* Height dimension (right) */}
      <line x1={widthMm + offset} y1={0} x2={widthMm + offset} y2={heightMm} stroke={stroke} strokeWidth={1} />
      <line x1={widthMm + offset - tickLen} y1={0} x2={widthMm + offset + tickLen} y2={0} stroke={stroke} strokeWidth={1} />
      <line x1={widthMm + offset - tickLen} y1={heightMm} x2={widthMm + offset + tickLen} y2={heightMm} stroke={stroke} strokeWidth={1} />
      <text
        x={widthMm + offset + fontSize + 4}
        y={heightMm / 2}
        textAnchor="middle"
        fontSize={fontSize}
        fill={stroke}
        fontFamily="sans-serif"
        transform={`rotate(90, ${widthMm + offset + fontSize + 4}, ${heightMm / 2})`}
      >
        {heightMm} mm
      </text>

      {/* Depth dimension (top, if provided) */}
      {depthMm && (
        <>
          <text
            x={widthMm / 2}
            y={-12}
            textAnchor="middle"
            fontSize={fontSize * 0.85}
            fill={stroke}
            fontFamily="sans-serif"
            opacity={0.7}
          >
            Prof. {depthMm} mm
          </text>
        </>
      )}
    </g>
  );
}
