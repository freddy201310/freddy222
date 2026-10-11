"use client";

import { useEffect, useState } from "react";

const SESSIONS = {
  arrive: {
    label: "Arrive (3 min)",
    steps: [
      "Settle into a comfortable position. Let your eyes soften or close.",
      "Notice the weight of your body being held by whatever is beneath you.",
      "Take three slow breaths. Feel the air arrive, and leave.",
      "Listen to the sounds of your happy place. Let them come and go like waves.",
      "Notice one place in your body that feels okay right now. Rest your attention there.",
      "If thoughts drift by, that's fine. Gently return to the sounds and your breath.",
      "When you're ready, take one deeper breath and slowly open your eyes. Welcome back.",
    ],
  },
  bodyscan: {
    label: "Body scan (4 min)",
    steps: [
      "Let your breath find its own rhythm.",
      "Bring gentle attention to your feet. Notice any warmth, pressure, or tingling.",
      "Move your attention to your legs. Let them be heavy and relaxed.",
      "Notice your belly rising and falling with each breath.",
      "Let your shoulders drop away from your ears. Soften your hands.",
      "Relax your jaw, your forehead, the small muscles around your eyes.",
      "Feel your whole body at once, breathing, here.",
      "Thank yourself for taking this time. Slowly return.",
    ],
  },
  kindness: {
    label: "Kindness (3 min)",
    steps: [
      "Place a hand over your heart if that feels comfortable.",
      "Silently offer yourself: May I be gentle with myself today.",
      "May I meet what comes with patience.",
      "Picture someone you care about. Offer them the same wishes.",
      "Picture someone you barely know — a neighbor, a stranger. Offer them the same.",
      "Let the feeling widen, like sunlight across a garden.",
      "Return to yourself. May I grow at my own pace.",
    ],
  },
} as const;

type Id = keyof typeof SESSIONS;
const STEP_SECONDS = 28;

export function Mindfulness() {
  const [id, setId] = useState<Id>("arrive");
  const [step, setStep] = useState(-1);
  const steps = SESSIONS[id].steps;

  useEffect(() => {
    if (step < 0 || step >= steps.length) return;
    const t = setTimeout(() => setStep(step + 1), STEP_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [step, steps.length]);

  const done = step >= steps.length;
  return (
    <div className="text-center">
      <div className="flex flex-wrap justify-center gap-2">
        {(Object.keys(SESSIONS) as Id[]).map((k) => (
          <button key={k} type="button" className={`chip ${id === k ? "chip-on" : ""}`} onClick={() => { setId(k); setStep(-1); }}>{SESSIONS[k].label}</button>
        ))}
      </div>
      <div className="mx-auto mt-8 flex min-h-32 max-w-xl items-center justify-center" aria-live="polite">
        <p key={step} className="font-serif text-2xl leading-snug text-moss-800 transition-opacity">
          {step < 0 ? "Find a quiet moment. Turn on your sounds if you like." : done ? "🌿 Beautifully done." : steps[step]}
        </p>
      </div>
      {step >= 0 && !done && (
        <div className="mx-auto mt-2 flex max-w-xs gap-1">{steps.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-moss-500" : "bg-moss-100"}`} />)}</div>
      )}
      <div className="mt-6 flex justify-center gap-2">
        {step < 0 || done ? (
          <button type="button" className="btn-primary" onClick={() => setStep(0)}>{done ? "Again" : "Begin"}</button>
        ) : (
          <>
            <button type="button" className="btn-soft" onClick={() => setStep(step + 1)}>Next</button>
            <button type="button" className="btn-ghost" onClick={() => setStep(-1)}>End</button>
          </>
        )}
      </div>
    </div>
  );
}
