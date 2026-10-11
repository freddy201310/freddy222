"use client";

import { useState, useTransition } from "react";
import { completeOnboarding, type OnboardingInput } from "@/actions/onboarding";
import { ChipPicker } from "@/components/ChipPicker";
import { LogoMark } from "@/components/Logo";
import { HELPERS, INTERESTS, SCENES, STRESSORS, TONES, VALUES } from "@/lib/options";

const STEPS = ["Welcome", "Interests", "Goals", "Values", "What helps", "Your companion", "Happy place"];

export function Onboarding({ name }: { name: string }) {
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [data, setData] = useState<OnboardingInput>({
    interests: [],
    goals: ["", "", ""],
    values: [],
    helpers: [],
    stressors: [],
    tone: "warm",
    scene: "garden",
    aiMemoryEnabled: true,
  });
  const set = <K extends keyof OnboardingInput>(k: K, v: OnboardingInput[K]) => setData((d) => ({ ...d, [k]: v }));
  const last = step === STEPS.length - 1;

  const next = () => {
    if (!last) return setStep(step + 1);
    start(() => completeOnboarding({ ...data, goals: data.goals.map((g) => g.trim()).filter(Boolean) }));
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-cream to-moss-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-moss-100">
            <div className="h-full rounded-full bg-moss-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <span className="text-sm text-moss-600">{step + 1}/{STEPS.length}</span>
        </div>

        <div className="card mt-8 p-8">
          {step === 0 && (
            <div>
              <h1 className="text-4xl font-semibold">Welcome, {name} 🌱</h1>
              <p className="mt-4 text-lg text-moss-700">
                Let&apos;s plant the first seeds of your garden. A few quick questions help your companion understand what matters to you — you can change any of it later.
              </p>
              <div className="mt-6 rounded-2xl bg-moss-50 p-4 text-sm text-moss-700">
                MindGarden is a companion for personal growth and reflection. It&apos;s not therapy, medical care, or a crisis service — if you ever need urgent help, please contact local emergency services or a crisis line.
              </div>
            </div>
          )}

          {step === 1 && (
            <Section title="What do you enjoy?" hint="Pick a few — this shapes your daily encouragement.">
              <ChipPicker options={INTERESTS} value={data.interests} onChange={(v) => set("interests", v)} />
            </Section>
          )}

          {step === 2 && (
            <Section title="What are you growing toward?" hint="Up to three goals, big or small. Skip any you like.">
              <div className="space-y-3">
                {data.goals.map((g, i) => (
                  <input
                    key={i}
                    className="input"
                    value={g}
                    placeholder={["e.g. Sleep before 11pm most nights", "e.g. Finish my portfolio", "e.g. Feel calmer at work"][i]}
                    onChange={(e) => set("goals", data.goals.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                ))}
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section title="What matters most to you?" hint="Choose up to five values.">
              <ChipPicker options={VALUES} value={data.values} onChange={(v) => set("values", v)} max={5} />
            </Section>
          )}

          {step === 4 && (
            <Section title="When life gets heavy…" hint="What usually helps you feel better? And what tends to weigh on you?">
              <p className="label">What helps</p>
              <ChipPicker options={HELPERS} value={data.helpers} onChange={(v) => set("helpers", v)} />
              <p className="label mt-6">What weighs on you</p>
              <ChipPicker options={STRESSORS} value={data.stressors} onChange={(v) => set("stressors", v)} />
            </Section>
          )}

          {step === 5 && (
            <Section title="How should your companion talk with you?" hint="It will keep learning from how you rate its replies.">
              <div className="grid gap-3 sm:grid-cols-2">
                {TONES.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => set("tone", t.id as OnboardingInput["tone"])}
                    className={`rounded-2xl border p-4 text-left transition ${data.tone === t.id ? "border-moss-600 bg-moss-50 ring-2 ring-moss-200" : "border-moss-100 bg-white hover:border-moss-300"}`}
                  >
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-sm text-moss-600">{t.desc}</div>
                  </button>
                ))}
              </div>
              <label className="mt-6 flex items-start gap-3 rounded-2xl bg-moss-50 p-4 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-moss-600"
                  checked={data.aiMemoryEnabled}
                  onChange={(e) => set("aiMemoryEnabled", e.target.checked)}
                />
                <span>
                  <strong>Let my companion learn from our conversations.</strong> It will add things like goals and helpful activities to your Life Manual, which you can review and edit anytime.
                </span>
              </label>
            </Section>
          )}

          {step === 6 && (
            <Section title="Where is your happy place?" hint="You'll be able to customize everything — sounds, weather, a pet, and more.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SCENES.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => set("scene", s.id)}
                    className={`rounded-2xl border p-5 text-center transition ${data.scene === s.id ? "border-moss-600 bg-moss-50 ring-2 ring-moss-200" : "border-moss-100 bg-white hover:border-moss-300"}`}
                  >
                    <div className="text-4xl">{s.icon}</div>
                    <div className="mt-2 font-medium">{s.label}</div>
                  </button>
                ))}
              </div>
            </Section>
          )}

          <div className="mt-8 flex justify-between">
            <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)} disabled={step === 0 || pending}>
              Back
            </button>
            <button type="button" className={last ? "btn-sunrise" : "btn-primary"} onClick={next} disabled={pending}>
              {pending ? "Planting…" : last ? "Enter my garden" : step === 0 ? "Let's begin" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold">{title}</h2>
      <p className="mb-6 mt-2 text-moss-600">{hint}</p>
      {children}
    </div>
  );
}
