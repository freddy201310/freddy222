"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createResetPlan, rateResetPlan, type ResetResult } from "@/actions/reset";
import { Breathing } from "@/components/Breathing";

const FEELINGS = ["Overwhelmed", "Stuck", "Anxious", "Unmotivated", "Scattered", "Frustrated", "Low", "Tired"];
const ICON: Record<string, string> = { breathing: "🫧", journal: "📝", movement: "🚶", reflection: "💭", puzzle: "🧩", favorite: "💚", "next-step": "👣" };

export function Reset() {
  const [feelings, setFeelings] = useState<string[]>([]);
  const [detail, setDetail] = useState("");
  const [plan, setPlan] = useState<ResetResult | null>(null);
  const [step, setStep] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [rated, setRated] = useState<boolean | null>(null);
  const [pending, start] = useTransition();

  if (!plan) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] bg-gradient-to-br from-dawn-100 via-cream to-sky-100 p-8 shadow-soft">
          <p className="eyebrow">Escape route</p>
          <h1 className="mt-2 text-4xl font-semibold">Let&apos;s take a breath.</h1>
          <p className="mt-3 text-moss-700">You don&apos;t have to fix everything. Let&apos;s just find one good next step. How are you feeling?</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {FEELINGS.map((f) => (
              <button key={f} aria-pressed={feelings.includes(f)} onClick={() => setFeelings(feelings.includes(f) ? feelings.filter((x) => x !== f) : [...feelings, f])} className={`chip px-4 py-2 ${feelings.includes(f) ? "chip-on" : ""}`}>
                {f}
              </button>
            ))}
          </div>
          <label className="label mt-6" htmlFor="detail">What&apos;s going on? (optional)</label>
          <textarea id="detail" className="input min-h-24" value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={1000} placeholder="I have three deadlines and can't decide where to start…" />
          <button className="btn-sunrise mt-6 w-full py-3 text-base" disabled={pending} onClick={() => start(async () => { setPlan(await createResetPlan(feelings, detail)); setStep(0); })}>
            {pending ? "Making you a plan…" : "🧭 Make my reset plan"}
          </button>
        </div>
      </div>
    );
  }

  const done = step >= plan.steps.length;
  const current = plan.steps[step];

  return (
    <div className="mx-auto max-w-2xl">
      {plan.support && (
        <div role="alert" className="mb-6 rounded-2xl border border-dawn-200 bg-dawn-50 p-4 text-sm text-bark-700">
          <strong>You deserve support from a real person right now.</strong> MindGarden isn&apos;t a crisis service. If you might be in danger, contact local emergency services. In the US, call or text <strong>988</strong>; elsewhere, visit <a className="underline" href="https://findahelpline.com" target="_blank" rel="noreferrer">findahelpline.com</a>.
        </div>
      )}
      <p className="font-serif text-2xl text-moss-800">{plan.opening}</p>
      <ol className="mt-6 flex gap-2" aria-label="Progress">
        {plan.steps.map((s, i) => (
          <li key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-moss-500" : i === step ? "bg-dawn-400" : "bg-moss-100"}`} title={s.title} />
        ))}
      </ol>

      {!done ? (
        <section className="card mt-6">
          <p className="eyebrow">Step {step + 1} of {plan.steps.length} · about {current.minutes} min</p>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-semibold"><span>{ICON[current.kind]}</span>{current.title}</h2>
          <p className="mt-3 text-lg leading-relaxed text-moss-800">{current.instruction}</p>
          {current.kind === "breathing" && <div className="mt-6"><Breathing rounds={4} initial="box" /></div>}
          {(current.kind === "journal" || current.kind === "reflection" || current.kind === "next-step") && (
            <textarea className="input mt-4 min-h-28" placeholder="Jot it down here — this stays on this screen." aria-label="Your notes" />
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-moss-600">
              <input
                type="checkbox"
                className="h-4 w-4 accent-moss-600"
                checked={liked.includes(current.title)}
                onChange={(e) => setLiked(e.target.checked ? [...liked, current.title] : liked.filter((t) => t !== current.title))}
              />
              This one helps me
            </label>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setStep(step + 1)}>Skip</button>
              <button className="btn-primary" onClick={() => setStep(step + 1)}>{step === plan.steps.length - 1 ? "Finish" : "Done, next"}</button>
            </div>
          </div>
        </section>
      ) : (
        <section className="card mt-6 text-center">
          <div className="text-5xl">🌿</div>
          <h2 className="mt-3 text-2xl font-semibold">You took a step. That counts.</h2>
          {rated === null ? (
            <>
              <p className="mt-2 text-moss-700">Did this reset help? Your answer teaches MindGarden what works for you.</p>
              <div className="mt-5 flex justify-center gap-2">
                <button className="btn-primary" onClick={() => { setRated(true); void rateResetPlan(plan.id, true, liked); }}>Yes, it helped</button>
                <button className="btn-soft" onClick={() => { setRated(false); void rateResetPlan(plan.id, false, []); }}>Not really</button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-moss-700">{rated ? "Noted — I'll remember what helped." : "Thanks for telling me. Next time I'll try something different."}</p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/companion" className="btn-soft">Talk it through</Link>
            <Link href="/happy-place" className="btn-soft">Visit Happy Place</Link>
            <button className="btn-ghost" onClick={() => { setPlan(null); setRated(null); setLiked([]); }}>New reset</button>
          </div>
        </section>
      )}
    </div>
  );
}
