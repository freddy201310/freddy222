"use client";

import { useState } from "react";

export type Point = { day: string; value: number };

/**
 * Single-series line chart on a fixed 1–5 scale with a hover crosshair + tooltip.
 * Used as small multiples (one per metric) so metrics never share a crowded plot.
 */
export function TrendChart({ title, points, invert = false }: { title: string; points: Point[]; invert?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 320, H = 120, PL = 22, PR = 8, PT = 10, PB = 20;
  const n = points.length;
  const x = (i: number) => PL + (n <= 1 ? (W - PL - PR) / 2 : (i / (n - 1)) * (W - PL - PR));
  const y = (v: number) => PT + ((5 - v) / 4) * (H - PT - PB);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = n > 1 ? `${path} L${x(n - 1)},${H - PB} L${x(0)},${H - PB} Z` : "";
  const latest = points.at(-1)?.value;
  const avg = n ? points.reduce((a, p) => a + p.value, 0) / n : null;
  const short = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHover(n ? best : null);
  };

  return (
    <figure className="rounded-2xl border border-moss-100 bg-white p-4">
      <figcaption className="flex items-baseline justify-between">
        <span className="font-semibold text-moss-800">{title}</span>
        <span className="text-xs text-moss-500">
          {avg !== null ? <>avg <strong className="text-moss-800">{avg.toFixed(1)}</strong>{invert && " (lower is calmer)"}</> : "no data yet"}
        </span>
      </figcaption>
      <div className="relative mt-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          role="img"
          aria-label={`${title} trend over ${n} check-ins${latest ? `, latest ${latest} of 5` : ""}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {[1, 3, 5].map((v) => (
            <g key={v}>
              <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="#e3ede0" strokeWidth="1" />
              <text x={PL - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#76a46c">{v}</text>
            </g>
          ))}
          {area && <path d={area} fill="#76a46c" opacity="0.12" />}
          {n > 1 && <path d={path} fill="none" stroke="#436c3c" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
          {n > 0 && <circle cx={x(n - 1)} cy={y(points[n - 1].value)} r="4" fill="#436c3c" stroke="#fff" strokeWidth="2" />}
          {n > 0 && (
            <>
              <text x={PL} y={H - 4} fontSize="9" fill="#76a46c">{short(points[0].day)}</text>
              <text x={W - PR} y={H - 4} fontSize="9" fill="#76a46c" textAnchor="end">{short(points[n - 1].day)}</text>
            </>
          )}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} stroke="#9fc297" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(points[hover].value)} r="5" fill="#436c3c" stroke="#fff" strokeWidth="2" />
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full rounded-lg bg-moss-900 px-2 py-1 text-xs text-white shadow"
            style={{ left: `${(x(hover) / W) * 100}%` }}
          >
            {short(points[hover].day)} · <strong>{points[hover].value}</strong>/5
          </div>
        )}
      </div>
    </figure>
  );
}
