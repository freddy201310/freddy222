"use client";

import { useEffect, useState } from "react";

const PATTERNS = {
  calm: { label: "Calm (4 · 6)", phases: [["Breathe in", 4], ["Breathe out", 6]] },
  box: { label: "Box (4 · 4 · 4 · 4)", phases: [["Breathe in", 4], ["Hold", 4], ["Breathe out", 4], ["Hold", 4]] },
  relax: { label: "Relax (4 · 7 · 8)", phases: [["Breathe in", 4], ["Hold", 7], ["Breathe out", 8]] },
} as const;

type PatternId = keyof typeof PATTERNS;

export function Breathing({ initial = "calm", rounds = 5, onDone, light = false }: { initial?: PatternId; rounds?: number; onDone?: () => void; light?: boolean }) {
  const [pattern, setPattern] = useState<PatternId>(initial);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState(0);
  const phases = PATTERNS[pattern].phases;
  const [label, secs] = phases[phase];

  useEffect(() => {
    if (!running) return;
    setLeft(secs);
    const tick = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    const t = setTimeout(() => {
      const next = (phase + 1) % phases.length;
      if (next === 0) {
        if (round + 1 >= rounds) { setRunning(false); setRound(0); setPhase(0); onDone?.(); return; }
        setRound(round + 1);
      }
      setPhase(next);
    }, secs * 1000);
    return () => { clearTimeout(t); clearInterval(tick); };
  }, [running, phase, round, secs, phases.length, rounds, onDone]);

  const expanded = running && (label === "Breathe in" || (label === "Hold" && phases[(phase + phases.length - 1) % phases.length][0] === "Breathe in"));
  const text = light ? "text-white" : "text-moss-800";

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(PATTERNS) as PatternId[]).map((id) => (
          <button key={id} type="button" disabled={running} onClick={() => setPattern(id)} className={`chip ${pattern === id ? "chip-on" : ""}`}>{PATTERNS[id].label}</button>
        ))}
      </div>
      <div className="relative my-8 flex h-56 w-56 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-moss-200 to-sky-200 opacity-70 blur-sm"
          style={{ transform: `scale(${expanded ? 1 : 0.55})`, transition: `transform ${running ? secs : 0.6}s ease-in-out` }}
        />
        <div
          className="absolute inset-6 rounded-full bg-white/70"
          style={{ transform: `scale(${expanded ? 1 : 0.6})`, transition: `transform ${running ? secs : 0.6}s ease-in-out` }}
        />
        <div className={`relative text-center ${running ? "text-moss-800" : text}`} aria-live="polite">
          <div className="font-serif text-2xl">{running ? label : "Ready"}</div>
          {running && <div className="text-sm opacity-70">{left}s · round {round + 1}/{rounds}</div>}
        </div>
      </div>
      <button type="button" className={running ? "btn-soft" : "btn-primary"} onClick={() => { setRunning(!running); setPhase(0); setRound(0); }}>
        {running ? "Stop" : "Begin breathing"}
      </button>
    </div>
  );
}
