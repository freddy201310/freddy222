"use client";

import { useState } from "react";
import type { Rules, Schedule } from "@/lib/rules";
import { APP_CATEGORIES } from "@/lib/rules";
import { WEEKDAYS } from "@/lib/time";
import { useSave } from "./useSave";
import { SaveBar } from "./SaveBar";

const KIND_LABEL: Record<Schedule["kind"], string> = { downtime: "Downtime", school: "School", homework: "Homework" };
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

export function TimeEditor({ childId, rules, readOnly }: { childId: string; rules: Rules; readOnly: boolean }) {
  const [daily, setDaily] = useState(rules.dailyLimit);
  const [schedules, setSchedules] = useState(rules.schedules);
  const { state, pending, save } = useSave(childId);

  const setDay = (d: number, v: number | null) => setDaily((cur) => cur.map((x, i) => (i === d ? v : x)));
  const patch = (i: number, p: Partial<Schedule>) => setSchedules((cur) => cur.map((s, j) => (j === i ? { ...s, ...p } : s)));

  return (
    <fieldset disabled={readOnly} className="space-y-4">
      <section className="card space-y-4">
        <div>
          <h2 className="h2">Daily screen time</h2>
          <p className="hint">One total across all of this child's phones. Calls, maps, and messages to approved contacts never count.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {ORDER.map((d) => (
            <div key={d} className="rounded-xl border border-ink-100 p-3">
              <p className="text-sm font-bold">{WEEKDAYS[d]}</p>
              <select
                className="input mt-2 px-2 py-1.5 text-sm"
                value={daily[d] === null ? "none" : String(daily[d])}
                onChange={(e) => setDay(d, e.target.value === "none" ? null : Number(e.target.value))}
                aria-label={`${WEEKDAYS[d]} limit`}
              >
                <option value="none">No limit</option>
                {[0, 15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480].map((m) => (
                  <option key={m} value={m}>{m === 0 ? "None allowed" : m < 60 ? `${m} min` : `${m / 60} h`}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setDaily((c) => c.map((v, i) => (i >= 1 && i <= 5 ? c[1] : v)))}>Copy Monday to all weekdays</button>
          <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setDaily((c) => c.map((v, i) => (i === 0 ? c[6] : v)))}>Copy Saturday to Sunday</button>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="h2">Schedules</h2>
          <p className="hint">Blocks that lock the phone at set times. They follow your home time zone, so changing the phone's clock doesn't end them early. A block can run past midnight.</p>
        </div>
        {schedules.map((s, i) => (
          <div key={s.id} className="space-y-3 rounded-xl border border-ink-100 p-4">
            <div className="flex flex-wrap gap-2">
              <input className="input flex-1" value={s.label} onChange={(e) => patch(i, { label: e.target.value })} aria-label="Name" />
              <select className="input w-auto" value={s.kind} onChange={(e) => patch(i, { kind: e.target.value as Schedule["kind"] })} aria-label="Type">
                {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button type="button" className="btn-ghost text-danger-700" onClick={() => setSchedules((c) => c.filter((_, j) => j !== i))}>Remove</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input type="time" className="input w-auto" value={s.start} onChange={(e) => patch(i, { start: e.target.value })} aria-label="Starts" />
              <span>to</span>
              <input type="time" className="input w-auto" value={s.end} onChange={(e) => patch(i, { end: e.target.value })} aria-label="Ends" />
              {s.end < s.start && <span className="hint">(ends the next morning)</span>}
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days">
              {ORDER.map((d) => {
                const on = s.days.includes(d);
                return (
                  <button key={d} type="button" aria-pressed={on} onClick={() => patch(i, { days: on ? s.days.filter((x) => x !== d) : [...s.days, d].sort() })} className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${on ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"}`}>
                    {WEEKDAYS[d]}
                  </button>
                );
              })}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-700">Still allowed during this block</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {APP_CATEGORIES.map((c) => {
                  const on = s.allowCategories.includes(c.id);
                  return (
                    <button key={c.id} type="button" aria-pressed={on} onClick={() => patch(i, { allowCategories: on ? s.allowCategories.filter((x) => x !== c.id) : [...s.allowCategories, c.id] })} className={`pill py-1 ${on ? "bg-haven-600 text-white" : "bg-ink-100 text-ink-600"}`}>
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <p className="hint mt-1">Phone calls, maps, and approved contacts always work.</p>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn-soft"
          onClick={() => setSchedules((c) => [...c, { id: `s${Date.now().toString(36)}`, label: "Homework", kind: "homework", days: [1, 2, 3, 4], start: "16:00", end: "17:30", allowCategories: ["education"] }])}
        >
          + Add a schedule
        </button>
      </section>

      <SaveBar state={state} pending={pending} readOnly={readOnly} onSave={() => save({ dailyLimit: daily, schedules })} />
    </fieldset>
  );
}
