"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveHappyPlace, type HappyPlaceInput } from "@/actions/happyPlace";
import { Scene } from "@/components/happy-place/Scene";
import { Soundscape } from "@/components/happy-place/audio";
import { Mindfulness } from "@/components/happy-place/Mindfulness";
import { Breathing } from "@/components/Breathing";
import { JournalEditor } from "../journal/new/JournalEditor";
import { DECORATIONS, MUSIC, PALETTES, PETS, SCENES, SOUNDS, WEATHERS } from "@/lib/options";

const TABS = [
  { id: "relax", label: "Relax", icon: "🌊" },
  { id: "breathe", label: "Breathe", icon: "🫧" },
  { id: "mindful", label: "Mindfulness", icon: "🧘" },
  { id: "journal", label: "Journal", icon: "📓" },
  { id: "goals", label: "Goal review", icon: "🌱" },
] as const;

export function HappyPlace({ initial, goals, wins, futureVision }: { initial: HappyPlaceInput; goals: string[]; wins: string[]; futureVision: string | null }) {
  const [cfg, setCfg] = useState(initial);
  const [customizing, setCustomizing] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("relax");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [saved, setSaved] = useState(true);
  const [pending, start] = useTransition();
  const audio = useRef<Soundscape | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  const set = <K extends keyof HappyPlaceInput>(k: K, v: HappyPlaceInput[K]) => { setCfg((c) => ({ ...c, [k]: v })); setSaved(false); };

  useEffect(() => () => audio.current?.close(), []);
  useEffect(() => {
    if (!playing) { audio.current?.stop(); return; }
    audio.current ??= new Soundscape();
    audio.current.start(cfg.sound, cfg.music, volume);
    // volume changes are handled separately to avoid restarting sounds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, cfg.sound, cfg.music]);
  useEffect(() => audio.current?.setVolume(volume), [volume]);

  const noAudio = cfg.sound === "none" && cfg.music === "none";

  return (
    <div className="space-y-6">
      <div ref={frame} className="relative overflow-hidden rounded-[2rem] shadow-soft">
        <Scene config={cfg} className="h-[62vh] min-h-[380px] w-full" />
        <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-6">
          <div className="rounded-2xl bg-white/60 px-4 py-2 backdrop-blur">
            <p className="text-xs uppercase tracking-widest text-moss-600">My Happy Place</p>
            <h1 className="font-serif text-2xl font-semibold text-moss-900">{cfg.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/60 p-2 backdrop-blur">
            <button
              className="btn-soft px-4 py-2"
              onClick={() => setPlaying(!playing)}
              disabled={noAudio}
              title={noAudio ? "Choose a sound or music in Customize" : undefined}
            >
              {playing ? "⏸ Pause sounds" : "▶ Play sounds"}
            </button>
            <label className="flex items-center gap-2 px-2 text-xs text-moss-700">
              <span className="sr-only">Volume</span>🔈
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-20 accent-moss-600" />
            </label>
            <button className="btn-soft px-4 py-2" onClick={() => setCustomizing(!customizing)}>{customizing ? "Done" : "🎨 Customize"}</button>
            <button className="btn-soft px-3 py-2" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : frame.current?.requestFullscreen())} aria-label="Full screen">⛶</button>
          </div>
        </div>

        {customizing && (
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto bg-white/95 p-5 shadow-soft backdrop-blur sm:rounded-l-3xl" role="dialog" aria-label="Customize your happy place">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Customize</h2>
              <button className="btn-ghost px-3" onClick={() => setCustomizing(false)} aria-label="Close">✕</button>
            </div>
            <label className="label mt-4" htmlFor="hp-name">Name</label>
            <input id="hp-name" className="input" value={cfg.name} maxLength={60} onChange={(e) => set("name", e.target.value)} />
            <Group title="Place">{SCENES.map((s) => <Opt key={s.id} on={cfg.scene === s.id} onClick={() => set("scene", s.id)}>{s.icon} {s.label}</Opt>)}</Group>
            <Group title="Colors & light">{PALETTES.map((s) => <Opt key={s.id} on={cfg.palette === s.id} onClick={() => set("palette", s.id)}>{s.label}</Opt>)}</Group>
            <Group title="Weather">{WEATHERS.map((s) => <Opt key={s.id} on={cfg.weather === s.id} onClick={() => set("weather", s.id)}>{s.icon} {s.label}</Opt>)}</Group>
            <Group title="Sounds">{SOUNDS.map((s) => <Opt key={s.id} on={cfg.sound === s.id} onClick={() => set("sound", s.id)}>{s.label}</Opt>)}</Group>
            <Group title="Music">{MUSIC.map((s) => <Opt key={s.id} on={cfg.music === s.id} onClick={() => set("music", s.id)}>{s.label}</Opt>)}</Group>
            <Group title="Companion pet">{PETS.map((s) => <Opt key={s.id} on={cfg.pet === s.id} onClick={() => set("pet", s.id)}>{s.icon} {s.label}</Opt>)}</Group>
            <Group title={`Decorations (${cfg.decorations.length}/6)`}>
              {DECORATIONS.map((d) => {
                const on = cfg.decorations.includes(d.id);
                return (
                  <Opt key={d.id} on={on} onClick={() => set("decorations", on ? cfg.decorations.filter((x) => x !== d.id) : cfg.decorations.length < 6 ? [...cfg.decorations, d.id] : cfg.decorations)}>
                    {d.icon} {d.label}
                  </Opt>
                );
              })}
            </Group>
            <button className="btn-primary mt-6 w-full" disabled={pending || saved} onClick={() => start(async () => { await saveHappyPlace(cfg); setSaved(true); })}>
              {pending ? "Saving…" : saved ? "Saved ✓" : "Save my happy place"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} className={`chip px-4 py-2 ${tab === t.id ? "chip-on" : ""}`} onClick={() => setTab(t.id)}>{t.icon} {t.label}</button>
        ))}
      </div>

      <section className="card">
        {tab === "relax" && (
          <div className="py-4 text-center">
            <p className="font-serif text-2xl text-moss-800">Welcome back to {cfg.name}.</p>
            <p className="mx-auto mt-3 max-w-lg text-moss-600">
              Press play, let the sounds fill the space, and just be here for a few minutes. Nothing to do, nowhere to be.
              {cfg.pet !== "none" && " Your companion is happy to see you — give them a tap."}
            </p>
            {noAudio && <p className="mt-3 text-sm text-moss-500">Tip: pick a sound or music under Customize.</p>}
          </div>
        )}
        {tab === "breathe" && <Breathing />}
        {tab === "mindful" && <Mindfulness />}
        {tab === "journal" && (
          <div>
            <p className="mb-3 text-moss-600">A quiet page in your happy place.</p>
            <JournalEditor initialMode="DAILY_REFLECTION" initialPrompt="Sitting here, what do you notice in yourself right now?" compact />
          </div>
        )}
        {tab === "goals" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold">What you&apos;re growing toward</h3>
              {goals.length ? <ul className="mt-3 space-y-2">{goals.map((g) => <li key={g} className="rounded-2xl bg-moss-50 p-3">🌱 {g}</li>)}</ul> : <p className="mt-2 text-moss-600">No goals yet — add some in your <Link className="underline" href="/manual">Life Manual</Link>.</p>}
              <p className="mt-4 text-sm text-moss-600">For each goal, ask: what&apos;s one small step this week?</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Wins to remember</h3>
              {wins.length ? <ul className="mt-3 space-y-2">{wins.slice(0, 5).map((w) => <li key={w} className="rounded-2xl bg-dawn-50 p-3">🏔️ {w}</li>)}</ul> : <p className="mt-2 text-moss-600">Your wins will collect here as you go.</p>}
              {futureVision && <p className="mt-4 rounded-2xl bg-sky-50 p-3 text-sm text-moss-700">🌅 Future you: <em>{futureVision}</em></p>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="label">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Opt({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={`chip text-xs ${on ? "chip-on" : ""}`}>{children}</button>;
}
