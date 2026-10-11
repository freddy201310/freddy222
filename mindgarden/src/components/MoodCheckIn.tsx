"use client";

import { useState, useTransition } from "react";
import { saveMood } from "@/actions/mood";
import { METRICS, type MetricKey } from "@/lib/mood";

type Values = Record<MetricKey, number>;

export function MoodCheckIn({ initial, compact = false }: { initial?: Partial<Values> & { note?: string | null }; compact?: boolean }) {
  const [values, setValues] = useState<Values>({
    mood: initial?.mood ?? 3,
    energy: initial?.energy ?? 3,
    stress: initial?.stress ?? 3,
    focus: initial?.focus ?? 3,
    sleep: initial?.sleep ?? 3,
  });
  const [note, setNote] = useState(initial?.note ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await saveMood({ ...values, note });
          setSaved(true);
        });
      }}
      className="space-y-4"
    >
      {METRICS.map((m) => (
        <fieldset key={m.key}>
          <legend className="mb-1 flex w-full justify-between text-sm font-medium text-moss-800">
            <span>{m.label}</span>
            <span className="text-xs font-normal text-moss-500">{m.low} → {m.high}</span>
          </legend>
          <div className="grid grid-cols-5 gap-1.5">
            {m.faces.map((f, i) => {
              const v = i + 1;
              const on = values[m.key] === v;
              return (
                <button
                  type="button"
                  key={v}
                  aria-label={`${m.label} ${v} of 5`}
                  aria-pressed={on}
                  onClick={() => { setValues({ ...values, [m.key]: v }); setSaved(false); }}
                  className={`rounded-xl border py-1.5 text-xl transition ${on ? "border-moss-500 bg-moss-100 ring-2 ring-moss-200" : "border-moss-100 bg-white hover:border-moss-300"}`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {!compact && (
        <div>
          <label className="label" htmlFor="mood-note">Anything on your mind? (optional)</label>
          <textarea id="mood-note" className="input min-h-20" value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} />
        </div>
      )}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : saved ? "Saved ✓ — update anytime today" : "Save today's check-in"}
      </button>
    </form>
  );
}
