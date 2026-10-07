"use client";

import { useActionState, useState } from "react";
import { createLetter, type LetterState } from "@/actions/letters";
import { addMonths, formatDate } from "@/lib/dates";

const WHEN = [
  { id: "1m", label: "1 month", months: 1 },
  { id: "6m", label: "6 months", months: 6 },
  { id: "1y", label: "1 year", months: 12 },
  { id: "custom", label: "Custom date", months: 0 },
];

const RECIPIENTS = [
  { id: "self", label: "My future self", hint: "Dear future me…" },
  { id: "goal", label: "My future goals", hint: "To the goal I'm chasing…" },
  { id: "milestone", label: "A milestone", hint: "For the day I graduate / move / turn 30…" },
];

export function LetterForm() {
  const [state, action, pending] = useActionState<LetterState, FormData>(createLetter, undefined);
  const [when, setWhen] = useState("6m");
  const [recipient, setRecipient] = useState("self");
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const preset = WHEN.find((w) => w.id === when)!;

  return (
    <form action={action} className="card space-y-6 bg-[#fffdf8]">
      <div>
        <p className="label">Who is this letter for?</p>
        <div className="flex flex-wrap gap-2">
          {RECIPIENTS.map((r) => (
            <label key={r.id} className={`chip cursor-pointer ${recipient === r.id ? "chip-on" : ""}`}>
              <input type="radio" name="recipient" value={r.id} checked={recipient === r.id} onChange={() => setRecipient(r.id)} className="sr-only" />
              {r.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="subject">Subject</label>
        <input id="subject" name="subject" className="input font-serif text-lg" maxLength={140} placeholder="Open this when…" required />
      </div>
      <div>
        <label className="label" htmlFor="body">Your letter</label>
        <textarea
          id="body"
          name="body"
          required
          className="input min-h-[40vh] font-serif text-lg leading-relaxed"
          placeholder={`${RECIPIENTS.find((r) => r.id === recipient)!.hint}\n\nRight now I'm… I hope that by the time you read this… Please remember…`}
        />
      </div>
      <div>
        <p className="label">Deliver in</p>
        <div className="flex flex-wrap gap-2">
          {WHEN.map((w) => (
            <label key={w.id} className={`chip cursor-pointer ${when === w.id ? "chip-on" : ""}`}>
              <input type="radio" name="when" value={w.id} checked={when === w.id} onChange={() => setWhen(w.id)} className="sr-only" />
              {w.label}
            </label>
          ))}
        </div>
        {when === "custom" ? (
          <input type="date" name="customDate" min={tomorrow} className="input mt-3 max-w-xs" required />
        ) : (
          <p className="mt-2 text-sm text-moss-600">Arrives around {formatDate(addMonths(new Date(), preset.months))}.</p>
        )}
      </div>
      {state?.error && <p role="alert" className="rounded-2xl bg-dawn-50 px-4 py-2 text-sm text-bark-700">{state.error}</p>}
      <button className="btn-sunrise" disabled={pending}>{pending ? "Sealing…" : "Seal & send to the future"}</button>
    </form>
  );
}
