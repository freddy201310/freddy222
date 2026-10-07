"use client";

import { useMemo, useState } from "react";
import { DECORATIONS, PETS } from "@/lib/options";

export type SceneConfig = {
  scene: string;
  palette: string;
  weather: string;
  pet: string;
  decorations: string[];
};

const PALETTES: Record<string, { top: string; bottom: string; sun: string; sunY: number; night: boolean; shade: number; mist?: boolean }> = {
  dawn: { top: "#bfdcef", bottom: "#ffd9b5", sun: "#ffbd85", sunY: 300, night: false, shade: 0 },
  day: { top: "#7fb6dd", bottom: "#e1eff8", sun: "#fff3c4", sunY: 110, night: false, shade: 0 },
  dusk: { top: "#6d5a96", bottom: "#fb9a57", sun: "#ff9b54", sunY: 320, night: false, shade: 0.18 },
  night: { top: "#0d1730", bottom: "#2c3d6b", sun: "#f4f1de", sunY: 120, night: true, shade: 0.55 },
  mist: { top: "#d9e2e6", bottom: "#f6f3ec", sun: "#ffffff", sunY: 200, night: false, shade: 0.05, mist: true },
  aurora: { top: "#071723", bottom: "#1b4a5a", sun: "#e8f6f3", sunY: 100, night: true, shade: 0.5 },
};

// Deterministic pseudo-random so server and client render identically.
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function Scene({ config, className = "" }: { config: SceneConfig; className?: string }) {
  const p = PALETTES[config.palette] ?? PALETTES.dawn;
  const pet = PETS.find((x) => x.id === config.pet);
  const decos = DECORATIONS.filter((d) => config.decorations.includes(d.id));
  const [hearts, setHearts] = useState(0);

  const particles = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: 60 }, () => ({ left: r() * 100, top: r() * 100, delay: r() * 8, dur: 0.6 + r() * 0.8, size: r() }));
  }, []);
  const stars = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 70 }, () => ({ x: r() * 1440, y: r() * 300, r: 0.6 + r() * 1.4, d: r() * 4 }));
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg viewBox="0 0 1440 720" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="hp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.top} />
            <stop offset="1" stopColor={p.bottom} />
          </linearGradient>
          <radialGradient id="hp-sun">
            <stop offset="0" stopColor={p.sun} />
            <stop offset="0.35" stopColor={p.sun} stopOpacity="0.9" />
            <stop offset="1" stopColor={p.sun} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hp-aurora" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5eead4" stopOpacity="0" />
            <stop offset="0.5" stopColor="#5eead4" stopOpacity="0.55" />
            <stop offset="1" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="1440" height="720" fill="url(#hp-sky)" />
        {p.night && stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" style={{ animation: `glow 4s ease-in-out ${s.d}s infinite` }} />
        ))}
        {config.palette === "aurora" && (
          <g opacity="0.9">
            <path d="M-50 160 C 300 60, 600 220, 900 120 S 1300 80, 1500 150 L1500 230 C 1200 160, 900 300, 600 220 S 100 170, -50 240Z" fill="url(#hp-aurora)" style={{ animation: "sway 12s ease-in-out infinite", transformBox: "fill-box", transformOrigin: "center" }} />
          </g>
        )}
        <circle cx="1040" cy={p.sunY} r={p.night ? 70 : 150} fill="url(#hp-sun)" />
        {p.night && <circle cx="1040" cy={p.sunY} r="34" fill={p.sun} />}
        <SceneLayers scene={config.scene} night={p.night} />
        {p.shade > 0 && <rect width="1440" height="720" fill="#0d1730" opacity={p.shade * 0.6} />}
        {p.mist && <rect y="360" width="1440" height="360" fill="#ffffff" opacity="0.35" />}
      </svg>

      {/* Weather */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {config.weather === "rain" && particles.map((q, i) => (
          <span key={i} className="absolute top-0 block w-px bg-gradient-to-b from-transparent to-white/70"
            style={{ left: `${q.left}%`, height: `${40 + q.size * 40}px`, animation: `fall ${q.dur}s linear ${q.delay}s infinite` }} />
        ))}
        {config.weather === "snow" && particles.map((q, i) => (
          <span key={i} className="absolute top-0 block rounded-full bg-white/90"
            style={{ left: `${q.left}%`, width: `${3 + q.size * 5}px`, height: `${3 + q.size * 5}px`, animation: `fall ${6 + q.dur * 6}s linear ${q.delay}s infinite` }} />
        ))}
        {config.weather === "fireflies" && particles.slice(0, 28).map((q, i) => (
          <span key={i} className="absolute block h-2 w-2 rounded-full bg-yellow-200 shadow-[0_0_14px_6px_rgba(254,240,138,0.7)]"
            style={{ left: `${q.left}%`, top: `${45 + q.top * 50}%`, animation: `glow ${2 + q.size * 3}s ease-in-out ${q.delay}s infinite, float ${5 + q.size * 4}s ease-in-out infinite` }} />
        ))}
        {config.weather === "breeze" && particles.slice(0, 12).map((q, i) => (
          <span key={i} className="absolute left-0 block text-lg"
            style={{ top: `${20 + q.top * 60}%`, animation: `drift ${12 + q.size * 10}s linear ${q.delay * 2}s infinite` }}>🍃</span>
        ))}
      </div>

      {/* Decorations */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[6%] flex flex-wrap items-end justify-center gap-[4%] px-[8%]" aria-hidden>
        {decos.map((d, i) => (
          <span key={d.id} className="text-3xl drop-shadow sm:text-4xl" style={{ animation: `float ${6 + i}s ease-in-out ${i * 0.7}s infinite` }}>{d.icon}</span>
        ))}
      </div>

      {/* Pet */}
      {pet && pet.id !== "none" && (
        <button
          type="button"
          onClick={() => setHearts((h) => h + 1)}
          className="absolute bottom-[14%] left-[14%] text-5xl drop-shadow-lg transition hover:scale-110 sm:text-6xl"
          style={{ animation: "float 5s ease-in-out infinite" }}
          aria-label={`Pet your ${pet.label.toLowerCase()}`}
        >
          {pet.icon}
          {hearts > 0 && <span key={hearts} className="absolute -top-6 left-1/2 -translate-x-1/2 animate-ping text-2xl">💚</span>}
        </button>
      )}
    </div>
  );
}

function Pine({ x, y, s = 1, c = "#365632" }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-4" y="-6" width="8" height="30" fill="#4f3b2b" />
      <path d="M0 -110 L40 -10 H-40Z" fill={c} />
      <path d="M0 -140 L30 -60 H-30Z" fill={c} />
    </g>
  );
}

function SceneLayers({ scene, night }: { scene: string; night: boolean }) {
  switch (scene) {
    case "beach":
      return (
        <g>
          <rect y="420" width="1440" height="160" fill="#57a0d0" />
          <rect y="420" width="1440" height="40" fill="#8cc1e2" opacity="0.6" />
          {[450, 490, 530].map((y, i) => (
            <path key={y} d={`M0 ${y} q 60 -10 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0`} stroke="#e1eff8" strokeWidth="2" fill="none" opacity="0.6" style={{ animation: `float ${6 + i * 2}s ease-in-out infinite` }} />
          ))}
          <path d="M0 560 C 300 530, 700 580, 1440 540 V720 H0Z" fill="#f3dcb2" />
          <path d="M0 620 C 400 600, 900 650, 1440 610 V720 H0Z" fill="#ead0a0" />
          <g transform="translate(1180 600)"><g style={{ animation: "sway 8s ease-in-out infinite", transformBox: "fill-box", transformOrigin: "bottom center" }}>
            <path d="M0 0 C 10 -80, 20 -160, 40 -230" stroke="#7a5c43" strokeWidth="14" fill="none" strokeLinecap="round" />
            {[-60, -20, 20, 60, 100].map((a) => (
              <path key={a} d="M40 -230 q 60 -20 110 30" stroke="#436c3c" strokeWidth="14" fill="none" strokeLinecap="round" transform={`rotate(${a} 40 -230)`} />
            ))}
          </g></g>
        </g>
      );
    case "forest":
      return (
        <g>
          <path d="M0 420 C 300 380, 700 430, 1440 390 V720 H0Z" fill="#9fc297" />
          {Array.from({ length: 16 }, (_, i) => <Pine key={`a${i}`} x={i * 95 + 20} y={450 + (i % 3) * 10} s={0.9} c="#76a46c" />)}
          <path d="M0 520 C 400 490, 900 540, 1440 500 V720 H0Z" fill="#56874d" />
          {Array.from({ length: 11 }, (_, i) => <Pine key={`b${i}`} x={i * 140 + 60} y={560 + (i % 2) * 18} s={1.4} />)}
          <path d="M0 640 C 500 610, 1000 660, 1440 630 V720 H0Z" fill="#2d462a" />
          {night || <ellipse cx="720" cy="690" rx="260" ry="18" fill="#c6dbc0" opacity="0.4" />}
        </g>
      );
    case "cabin":
      return (
        <g>
          <path d="M0 430 C 300 380, 800 440, 1440 400 V720 H0Z" fill="#9fc297" />
          {[60, 180, 1260, 1360].map((x, i) => <Pine key={x} x={x} y={480 + (i % 2) * 20} s={1.1} />)}
          <g transform="translate(720 560)">
            <path d="M-18 -170 v-50" stroke="#ddd" strokeWidth="0" />
            <rect x="90" y="-210" width="30" height="70" fill="#4f3b2b" />
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={105 + i * 8} cy={-230 - i * 30} r={12 + i * 6} fill="#fff" opacity={0.35 - i * 0.08} style={{ animation: `float ${4 + i}s ease-in-out infinite` }} />
            ))}
            <rect x="-160" y="-120" width="320" height="140" fill="#7a5c43" />
            {[-100, -70, -40, -10].map((y) => <line key={y} x1="-160" x2="160" y1={y} y2={y} stroke="#4f3b2b" strokeWidth="3" opacity="0.5" />)}
            <path d="M-190 -115 L0 -230 L190 -115Z" fill="#4f3b2b" />
            <rect x="-30" y="-60" width="60" height="80" fill="#2b2119" />
            <rect x="-130" y="-90" width="60" height="45" fill={night ? "#ffd27a" : "#fff1d6"} />
            <rect x="70" y="-90" width="60" height="45" fill={night ? "#ffd27a" : "#fff1d6"} />
            {night && <circle cx="-100" cy="-68" r="60" fill="#ffd27a" opacity="0.15" />}
          </g>
          <path d="M0 600 C 400 580, 1000 620, 1440 590 V720 H0Z" fill="#56874d" />
        </g>
      );
    case "mountain":
      return (
        <g>
          <path d="M0 470 L260 210 L420 330 L640 120 L860 340 L1060 190 L1300 380 L1440 300 V720 H0Z" fill="#8a9bb3" />
          <path d="M640 120 L700 180 L670 175 L640 200 L610 170 L585 178Z M1060 190 L1110 240 L1080 235 L1060 255 L1035 232Z M260 210 L300 250 L275 248 L255 265 L232 238Z" fill="#ffffff" />
          <path d="M0 520 L200 400 L380 480 L560 380 L780 490 L1000 400 L1240 500 L1440 420 V720 H0Z" fill="#6b7f99" opacity="0.9" />
          <rect y="560" width="1440" height="60" fill="#8cc1e2" opacity="0.8" />
          <path d="M0 610 C 400 590, 900 630, 1440 600 V720 H0Z" fill="#56874d" />
          {[100, 240, 1200, 1330].map((x) => <Pine key={x} x={x} y={650} s={1} />)}
        </g>
      );
    case "fantasy":
      return (
        <g>
          {[{ x: 300, y: 260, s: 1 }, { x: 1150, y: 200, s: 0.7 }, { x: 760, y: 140, s: 0.5 }].map((isl, i) => (
            <g key={i} style={{ animation: `float ${7 + i * 2}s ease-in-out infinite` }}><g transform={`translate(${isl.x} ${isl.y}) scale(${isl.s})`}>
              <path d="M-140 0 H140 L60 120 L0 170 L-70 110Z" fill="#7a5c43" />
              <ellipse cx="0" cy="0" rx="145" ry="22" fill="#76a46c" />
              <path d="M-30 -10 V-70" stroke="#4f3b2b" strokeWidth="8" />
              <circle cx="-30" cy="-90" r="40" fill="#c084fc" opacity="0.85" />
            </g></g>
          ))}
          <path d="M0 500 C 300 450, 800 520, 1440 470 V720 H0Z" fill="#6d5a96" opacity="0.7" />
          <path d="M0 580 C 400 540, 1000 600, 1440 560 V720 H0Z" fill="#3f6b5e" />
          {[180, 420, 980, 1260].map((x, i) => (
            <g key={x} transform={`translate(${x} ${610 + (i % 2) * 20})`}>
              <rect x="-6" y="-40" width="12" height="40" fill="#f5f3ee" />
              <ellipse cx="0" cy="-40" rx="38" ry="20" fill={i % 2 ? "#f472b6" : "#60a5fa"} />
              <ellipse cx="0" cy="-40" rx="60" ry="34" fill={i % 2 ? "#f472b6" : "#60a5fa"} opacity="0.2" style={{ animation: `glow 3s ease-in-out ${i}s infinite` }} />
            </g>
          ))}
          <path d="M700 640 L730 540 L760 640Z" fill="#a5f3fc" opacity="0.9" />
          <path d="M740 640 L770 570 L790 640Z" fill="#c4b5fd" opacity="0.9" />
        </g>
      );
    default: // garden
      return (
        <g>
          <path d="M0 440 C 300 390, 800 450, 1440 400 V720 H0Z" fill="#9fc297" />
          <path d="M0 520 C 400 490, 900 540, 1440 500 V720 H0Z" fill="#76a46c" />
          <g transform="translate(1150 520)"><g style={{ animation: "sway 9s ease-in-out infinite", transformBox: "fill-box", transformOrigin: "bottom center" }}>
            <rect x="-12" y="-150" width="24" height="160" fill="#7a5c43" />
            <circle cx="0" cy="-190" r="90" fill="#56874d" />
            <circle cx="-60" cy="-150" r="60" fill="#436c3c" />
            <circle cx="60" cy="-150" r="60" fill="#6b9a5f" />
          </g></g>
          <path d="M620 720 C 660 640, 700 600, 720 540 C 740 600, 780 640, 820 720Z" fill="#ead0a0" />
          <path d="M0 610 C 400 590, 1000 630, 1440 600 V720 H0Z" fill="#56874d" />
          {Array.from({ length: 40 }, (_, i) => {
            const x = (i * 137) % 1440;
            const y = 600 + ((i * 53) % 100);
            const c = ["#f9a8d4", "#fde68a", "#fca5a5", "#c4b5fd", "#ffffff"][i % 5];
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <line y1="0" y2="16" stroke="#365632" strokeWidth="2" />
                <circle r="7" fill={c} />
                <circle r="2.5" fill="#fbbf24" />
              </g>
            );
          })}
        </g>
      );
  }
}
