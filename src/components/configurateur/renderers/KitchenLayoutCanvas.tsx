'use client';

import { useRef, useEffect } from 'react';
import type { KitchenWall } from '@/lib/types';

interface Props {
  walls: KitchenWall[];
  className?: string;
}

export function KitchenLayoutCanvas({ walls, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (walls.length === 0) return;

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    walls.forEach((wall) => {
      const angle = (wall.angle * Math.PI) / 180;
      const endX = wall.startX + Math.cos(angle) * wall.length;
      const endY = wall.startY + Math.sin(angle) * wall.length;
      minX = Math.min(minX, wall.startX, endX);
      minY = Math.min(minY, wall.startY, endY);
      maxX = Math.max(maxX, wall.startX, endX);
      maxY = Math.max(maxY, wall.startY, endY);
    });

    const padding = 40;
    const scaleX = (rect.width - padding * 2) / Math.max(maxX - minX, 1);
    const scaleY = (rect.height - padding * 2) / Math.max(maxY - minY, 1);
    const scale = Math.min(scaleX, scaleY, 0.1);

    const offsetX = (rect.width - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (rect.height - (maxY - minY) * scale) / 2 - minY * scale;

    // Draw walls
    ctx.strokeStyle = '#2C5F2D';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    walls.forEach((wall) => {
      const angle = (wall.angle * Math.PI) / 180;
      const sx = wall.startX * scale + offsetX;
      const sy = wall.startY * scale + offsetY;
      const ex = (wall.startX + Math.cos(angle) * wall.length) * scale + offsetX;
      const ey = (wall.startY + Math.sin(angle) * wall.length) * scale + offsetY;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Length label
      ctx.fillStyle = '#666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${wall.length}mm`, (sx + ex) / 2, (sy + ey) / 2 - 12);
    });
  }, [walls]);

  return <canvas ref={canvasRef} className={className || 'w-full h-48 rounded-lg border border-gray-200'} />;
}
