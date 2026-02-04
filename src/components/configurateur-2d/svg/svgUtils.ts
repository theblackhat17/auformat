export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PADDING = 60;
const DIM_OFFSET = 30;

export function computeViewBox(
  widthMm: number,
  heightMm: number,
): ViewBox {
  return {
    x: -PADDING,
    y: -PADDING,
    width: widthMm + PADDING * 2,
    height: heightMm + PADDING * 2,
  };
}

export function viewBoxString(vb: ViewBox): string {
  return `${vb.x} ${vb.y} ${vb.width} ${vb.height}`;
}

export function dimLineY(heightMm: number): number {
  return heightMm + DIM_OFFSET;
}

export function dimLineX(widthMm: number): number {
  return widthMm + DIM_OFFSET;
}

export function scaleFontSize(widthMm: number): number {
  if (widthMm < 500) return 14;
  if (widthMm < 1500) return 16;
  return 20;
}

export function shelfY(heightMm: number, index: number, total: number): number {
  return ((index + 1) / (total + 1)) * heightMm;
}

export function drawerY(heightMm: number, index: number, total: number, startFromBottom: boolean = true): number {
  const drawerHeight = Math.min(150, heightMm / (total + 2));
  if (startFromBottom) {
    return heightMm - (index + 1) * drawerHeight;
  }
  return (index + 1) * drawerHeight;
}

export function drawerHeight(heightMm: number, totalDrawers: number): number {
  return Math.min(150, heightMm / (totalDrawers + 2));
}

export function doorWidth(widthMm: number, nbDoors: number): number {
  return widthMm / nbDoors;
}

export function footPositions(widthMm: number): number[] {
  return [widthMm * 0.1, widthMm * 0.9];
}
