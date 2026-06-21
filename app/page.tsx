"use client";

import { useRef, useState } from "react";
import Markdown from "@/components/Markdown";

type Mode = "plan" | "guide" | "explain";

const MODES: {
  id: Mode;
  label: string;
  emoji: string;
  tagline: string;
  placeholder: string;
  cta: string;
  example: string;
}[] = [
  {
    id: "plan",
    label: "Plan my time",
    emoji: "🗓️",
    tagline: "Tell me your deadlines and free time — I'll build a study schedule.",
    placeholder:
      "e.g. I have a biology midterm in 9 days covering cells, genetics, and ecology. I can study about 1.5 hours on weekdays and 3 hours on weekends. Genetics is my weakest topic.",
    cta: "Build my study plan",
    example:
      "I have a calculus final in 2 weeks covering limits, derivatives, and integrals. I'm strong on limits but lost on integration. I can study ~2 hours/day except Wednesdays.",
  },
  {
    id: "guide",
    label: "Make a study guide",
    emoji: "📒",
    tagline: "Give me a topic or paste your notes — I'll turn it into an exam-ready guide.",
    placeholder:
      "e.g. Make a study guide for the French Revolution, focused on causes, key events, and major figures.",
    cta: "Generate study guide",
    example:
      "Create a study guide on photosynthesis for a high-school biology exam, including the light and dark reactions.",
  },
  {
    id: "explain",
    label: "Explain a concept",
    emoji: "💡",
    tagline: "Stuck on something? I'll explain it until it clicks.",
    placeholder:
      "e.g. I don't understand how the chain rule works in calculus. Explain it simply.",
    cta: "Explain it to me",
    example:
      "Explain what a p-value actually means in statistics. I keep getting confused.",
  },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("plan");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const active = MODES.find((m) => m.id === mode)!;

  async function run() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setOutput("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status}).`);
      }
      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:pt-16">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-dark">
          <span>✦</span> Your AI study coach
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          StudyFlow
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-ink/60">
          Plan when to study, build study guides, and finally understand the
          concepts that aren&apos;t clicking — all in one place.
        </p>
      </header>

      {/* Mode tabs */}
      <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/70 p-1.5 shadow-sm ring-1 ring-ink/5">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id)}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-sm font-medium transition ${
              mode === m.id
                ? "bg-brand text-white shadow"
                : "text-ink/70 hover:bg-brand-soft"
            }`}
          >
            <span className="text-lg">{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Input card */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/5">
        <p className="mb-3 text-sm text-ink/60">{active.tagline}</p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={active.placeholder}
          rows={5}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
          }}
          className="w-full resize-y rounded-xl border border-ink/10 bg-paper/60 p-3.5 text-[15px] leading-relaxed outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setInput(active.example)}
            className="text-sm font-medium text-brand hover:text-brand-dark"
          >
            Try an example →
          </button>

          <div className="flex items-center gap-2">
            {loading && (
              <button
                onClick={stop}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/60 hover:text-ink"
              >
                Stop
              </button>
            )}
            <button
              onClick={run}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Thinking…" : active.cta}
            </button>
          </div>
        </div>
        <p className="mt-2 text-right text-xs text-ink/30">⌘/Ctrl + Enter</p>
      </section>

      {/* Error */}
      {error && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {/* Output */}
      {(output || loading) && (
        <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink/5">
          {output ? (
            <Markdown content={output} />
          ) : (
            <div className="flex items-center gap-2 text-ink/40">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              StudyFlow is working on it…
            </div>
          )}
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-ink/30">
        Built with Next.js & Claude · StudyFlow
      </footer>
    </main>
  );
}
