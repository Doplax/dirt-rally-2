'use client';

import { useEffect, useRef } from 'react';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function UsageChart({
  usedBytes,
  quotaBytes,
}: {
  usedBytes: number;
  quotaBytes: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ratio = Math.min(usedBytes / quotaBytes, 1);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const lineWidth = 22;
    const radius = size / 2 - lineWidth;

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Used arc — color shifts as we approach the quota.
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + ratio * Math.PI * 2;
    let stroke = '#22c55e'; // green
    if (ratio > 0.85) stroke = '#ef4444'; // red
    else if (ratio > 0.6) stroke = '#f59e0b'; // amber

    if (ratio > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Center text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 32px var(--font-sans), system-ui, sans-serif';
    ctx.fillText(`${(ratio * 100).toFixed(1)}%`, cx, cy - 10);

    ctx.font = '12px var(--font-sans), system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`${formatBytes(usedBytes)} / ${formatBytes(quotaBytes)}`, cx, cy + 18);
  }, [usedBytes, quotaBytes, ratio]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={ref} aria-label={`Uso de la base de datos: ${(ratio * 100).toFixed(1)}%`} />
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor:
                ratio > 0.85 ? '#ef4444' : ratio > 0.6 ? '#f59e0b' : '#22c55e',
            }}
          />
          <span className="text-foreground/70">Usado: {formatBytes(usedBytes)}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="bg-foreground/15 h-3 w-3 rounded-full" />
          <span className="text-foreground/70">
            Libre: {formatBytes(Math.max(quotaBytes - usedBytes, 0))}
          </span>
        </span>
      </div>
    </div>
  );
}
